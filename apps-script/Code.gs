/**
 * Backend de l'étude d'élicitation (Experiment 1) — Google Apps Script lié à un
 * Google Sheet. Trois rôles :
 *   1. attribuer une design row de façon atomique (le site est statique et ne
 *      peut pas équilibrer le plan d'expérience tout seul) ;
 *   2. recevoir les réponses au fil de l'eau, en ajout seul ;
 *   3. délivrer le code de complétion Prolific, qui ne doit jamais se trouver
 *      dans le bundle JavaScript public.
 *
 * MISE EN PLACE (voir study/README.md)
 *   Extensions ▸ Apps Script, coller ce fichier, exécuter setup() une fois,
 *   puis Déployer ▸ Application web, « Exécuter en tant que : moi »,
 *   « Accès : tout le monde ». Coller l'URL /exec dans src/config/studyConfig.ts.
 *
 * CORS : Apps Script ne répond pas aux requêtes préliminaires OPTIONS. Le client
 * n'émet donc que des « simple requests » (GET à paramètres, POST en
 * text/plain). Ne pas exiger d'en-tête personnalisé côté client.
 */

var SHEETS = { ROWS: 'rows', SESSIONS: 'sessions', RESPONSES: 'responses', META: 'meta' };
var N_ROWS = 75;
var DEFAULT_STALE_MINUTES = 120;

var ROWS_HEADER = ['row_id', 'status', 'pid', 'session_id', 'assigned_ts', 'completed_ts', 'assign_count'];
var SESSIONS_HEADER = ['ts', 'session_id', 'pid', 'row_id', 'is_test', 'event', 'user_agent'];
var RESPONSES_HEADER = [
  'ts_server', 'ts_client', 'pid', 'session_id', 'row_id', 'is_test',
  'scene_id', 'axis', 'phase', 'scenario_index', 'block', 'item_key',
  'response_text', 'confidence', 'concepts_json', 'concept_order_json',
  'other_text', 'rt_ms', 'resumed', 'event_id', 'seq',
];

// ---------------------------------------------------------------- routage ---

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'ping') return json({ ok: true, ts: new Date().toISOString() });
  if (action === 'assign') {
    return json(assign_(
      String(e.parameter.pid || ''),
      String(e.parameter.session_id || ''),
      e.parameter.test === '1',
      ''
    ));
  }
  return json({ error: 'unknown action' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ error: 'bad json' });
  }
  if (body.action === 'events') return json(appendEvents_(body));
  if (body.action === 'complete') return json(complete_(body));
  return json({ error: 'unknown action' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------ attribution ---

/**
 * Attribution atomique. Idempotente par Prolific ID : un participant qui revient
 * (autre navigateur, stockage vidé, seconde visite) retrouve sa row et ne peut
 * jamais en consommer deux. Les rows abandonnées depuis plus de `stale_minutes`
 * retournent au pot pour un remplaçant.
 */
function assign_(pid, sessionId, isTest, userAgent) {
  if (!pid) return { error: 'missing pid' };

  if (isTest) {
    // Prévisualisation : aucune row consommée, mais la session est tracée.
    logSession_(sessionId, pid, null, true, 'preview', userAgent);
    return { row_id: 1 + Math.floor(Math.random() * N_ROWS), test: true };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return { error: 'busy', retry: true };
  }

  try {
    if (meta_('study_open') === 'FALSE') return { error: 'closed' };

    var sheet = sh_(SHEETS.ROWS);
    var values = sheet.getRange(2, 1, N_ROWS, ROWS_HEADER.length).getValues();
    var now = new Date();
    var staleMs = Number(meta_('stale_minutes') || DEFAULT_STALE_MINUTES) * 60000;

    // 1. déjà connu ?
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][2]) !== pid) continue;
      var status = String(values[i][1]);
      if (status === 'COMPLETED') {
        logSession_(sessionId, pid, values[i][0], false, 'return-completed', userAgent);
        return { row_id: values[i][0], resumed: true, completed: true, code: meta_('completion_code') };
      }
      if (status === 'ASSIGNED') {
        sheet.getRange(i + 2, 4).setValue(sessionId);
        logSession_(sessionId, pid, values[i][0], false, 'resumed', userAgent);
        return { row_id: values[i][0], resumed: true };
      }
    }

    // 2. rows libres, ou attribuées mais périmées
    var candidates = [];
    for (var j = 0; j < values.length; j++) {
      var st = String(values[j][1]);
      if (st === 'FREE') {
        candidates.push(j);
      } else if (st === 'ASSIGNED') {
        var ts = values[j][4] ? new Date(values[j][4]).getTime() : 0;
        if (now.getTime() - ts > staleMs) candidates.push(j);
      }
    }
    if (!candidates.length) return { error: 'full' };

    var pick = candidates[Math.floor(Math.random() * candidates.length)];
    var rowId = values[pick][0];
    sheet.getRange(pick + 2, 2, 1, 6).setValues([[
      'ASSIGNED', pid, sessionId, now, '', Number(values[pick][6] || 0) + 1,
    ]]);
    SpreadsheetApp.flush();
    logSession_(sessionId, pid, rowId, false, 'assigned', userAgent);
    return { row_id: rowId };
  } finally {
    lock.releaseLock();
  }
}

// --------------------------------------------------------------- réponses ---

/**
 * Ajout en bloc, sans verrou : l'onglet est en ajout seul et prendre le verrou
 * ici sérialiserait tous les participants derrière l'attribution. Les doublons
 * possibles (réessai client après une réponse perdue) portent le même event_id
 * et sont dédupliqués à l'analyse.
 */
function appendEvents_(body) {
  var events = body.events || [];
  if (!events.length) return { ok: true, written: 0 };

  var ts = new Date();
  var rows = events.map(function (ev) {
    return [
      ts, ev.ts_client, body.pid, body.session_id, body.row_id, body.is_test ? 1 : 0,
      ev.scene_id, ev.axis, ev.phase, ev.scenario_index, ev.block, ev.item_key,
      ev.response_text, ev.confidence, ev.concepts_json, ev.concept_order_json,
      ev.other_text, ev.rt_ms, ev.resumed ? 1 : 0, ev.event_id, ev.seq,
    ];
  });

  var sheet = sh_(SHEETS.RESPONSES);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, RESPONSES_HEADER.length).setValues(rows);
  return { ok: true, written: rows.length };
}

function complete_(body) {
  if (body.is_test) return { code: null, test: true };

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return { error: 'busy', retry: true };
  }

  try {
    var sheet = sh_(SHEETS.ROWS);
    var values = sheet.getRange(2, 1, N_ROWS, ROWS_HEADER.length).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][2]) !== String(body.pid)) continue;
      if (String(values[i][1]) !== 'COMPLETED') {
        sheet.getRange(i + 2, 2).setValue('COMPLETED');
        sheet.getRange(i + 2, 6).setValue(new Date());
        SpreadsheetApp.flush();
      }
      logSession_(body.session_id, body.pid, values[i][0], false, 'completed', '');
      return { code: meta_('completion_code') };
    }
    // Pas de row au nom de ce pid : on paie quand même le participant plutôt
    // que de le bloquer, et l'anomalie est tracée.
    logSession_(body.session_id, body.pid, body.row_id, false, 'completed-unmatched', '');
    return { code: meta_('completion_code') };
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------------------- outils ---

function sh_(name) {
  var s = SpreadsheetApp.getActive().getSheetByName(name);
  if (!s) throw new Error('onglet manquant : ' + name + ' — exécuter setup()');
  return s;
}

function logSession_(sessionId, pid, rowId, isTest, event, userAgent) {
  var s = sh_(SHEETS.SESSIONS);
  s.appendRow([new Date(), sessionId, pid, rowId, isTest ? 1 : 0, event, userAgent || '']);
}

function meta_(key) {
  var values = sh_(SHEETS.META).getDataRange().getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === key) return String(values[i][1]);
  }
  return '';
}

// ------------------------------------------------------------ maintenance ---

/** À exécuter une fois depuis l'éditeur : crée les onglets et les 75 rows. */
function setup() {
  var ss = SpreadsheetApp.getActive();

  function ensure(name, header) {
    var s = ss.getSheetByName(name);
    if (!s) s = ss.insertSheet(name);
    if (s.getLastRow() === 0) {
      s.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
      s.setFrozenRows(1);
    }
    return s;
  }

  var rows = ensure(SHEETS.ROWS, ROWS_HEADER);
  ensure(SHEETS.SESSIONS, SESSIONS_HEADER);
  ensure(SHEETS.RESPONSES, RESPONSES_HEADER);
  var meta = ensure(SHEETS.META, ['key', 'value']);

  if (rows.getLastRow() < 2) {
    var seed = [];
    for (var i = 1; i <= N_ROWS; i++) seed.push([i, 'FREE', '', '', '', '', 0]);
    rows.getRange(2, 1, N_ROWS, ROWS_HEADER.length).setValues(seed);
  }

  if (meta.getLastRow() < 2) {
    meta.getRange(2, 1, 3, 2).setValues([
      ['completion_code', 'PASTE_PROLIFIC_COMPLETION_CODE'],
      ['stale_minutes', DEFAULT_STALE_MINUTES],
      ['study_open', 'TRUE'],
    ]);
  }
  SpreadsheetApp.flush();
}

/** Admin : libère une row après exclusion, pour la réattribuer à un remplaçant
 *  (l'équilibrage du plan est ainsi préservé). */
function freeRow(rowId) {
  var sheet = sh_(SHEETS.ROWS);
  sheet.getRange(rowId + 1, 2, 1, 5).setValues([['FREE', '', '', '', '']]);
  SpreadsheetApp.flush();
}

/** Admin : coupe l'arrivée de nouveaux participants sans dépublier le site. */
function closeStudy() { setMeta_('study_open', 'FALSE'); }
function openStudy() { setMeta_('study_open', 'TRUE'); }

function setMeta_(key, value) {
  var s = sh_(SHEETS.META);
  var values = s.getDataRange().getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === key) return void s.getRange(i + 1, 2).setValue(value);
  }
  s.appendRow([key, value]);
}

/** Admin : état d'avancement du recrutement. */
function progress() {
  var values = sh_(SHEETS.ROWS).getRange(2, 1, N_ROWS, ROWS_HEADER.length).getValues();
  var counts = { FREE: 0, ASSIGNED: 0, COMPLETED: 0, EXCLUDED: 0 };
  values.forEach(function (r) { counts[r[1]] = (counts[r[1]] || 0) + 1; });
  Logger.log(JSON.stringify(counts));
  return counts;
}
