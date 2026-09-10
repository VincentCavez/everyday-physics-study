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
/** Marge de grille pré-allouée dans `responses`. `appendRow` au-delà de la
 *  dernière ligne de la GRILLE force Sheets à l'agrandir ligne par ligne, ce qui
 *  fait passer une écriture de ~200 ms à plusieurs secondes. C'est ce qui a
 *  saturé le service le 09/09, quand l'onglet a dépassé ses 1000 lignes par
 *  défaut. On écrit désormais par lot, et on agrandit par blocs. */
var GRID_CHUNK = 2000;

// `last_seen` (colonne 8, ajoutée le 2026-09-10) : l'instant du dernier lot de
// réponses reçu pour cette row. Sans elle, la péremption comparait `stale_minutes`
// au seul instant d'ATTRIBUTION, et une row pouvait être reprise à un
// participant encore en train de répondre — mesuré le 09/09 : une session a duré
// 1 h 04 alors que `stale_minutes` valait 60. Sur un classeur qui tourne déjà,
// lancer `migrate()` une fois pour écrire l'en-tête.
var ROWS_HEADER = ['row_id', 'status', 'pid', 'session_id', 'assigned_ts', 'completed_ts', 'assign_count', 'last_seen'];
var SESSIONS_HEADER = ['ts', 'session_id', 'pid', 'row_id', 'is_test', 'event', 'user_agent'];
/**
 * PROTOCOLE v2 (2026-09-09) — 32 colonnes.
 *
 * DEUX RÈGLES À NE PAS ENFREINDRE :
 *  1. `appendEvents_` écrit POSITIONNELLEMENT. Une colonne s'ajoute à la FIN,
 *     jamais au milieu, sinon toutes les lignes déjà écrites se décalent.
 *  2. `setup()` n'écrit l'en-tête que si l'onglet est VIDE. Sur un classeur qui
 *     tourne déjà, il ne corrigera rien : il faudrait élargir la grille à la
 *     main (un Sheet fait 26 colonnes par défaut, `appendRow` échoue au-delà)
 *     puis retaper les en-têtes. D'où la décision : la v2 va sur un SHEET NEUF
 *     et un NOUVEAU déploiement. Les lignes v1 portent un `block` et pas de
 *     `rating` ; les mélanger dans un même onglet serait une source d'erreur
 *     permanente à l'analyse.
 *
 * Colonne 11 : `block` (1|2|3) devient `stage` (1|2|3). Même position, sens
 * nouveau — d'où, là encore, le classeur neuf.
 */
var RESPONSES_HEADER = [
  'ts_server', 'ts_client', 'pid', 'session_id', 'row_id', 'is_test',
  'scene_id', 'axis', 'phase', 'scenario_index', 'stage', 'item_key',
  'response_text', 'confidence', 'concepts_json', 'concept_order_json',
  'other_text', 'rt_ms', 'resumed', 'event_id', 'seq',
  // ── v2 ────────────────────────────────────────────────────────────────────
  // `item_id`  : l'objet noté (théorie, outil, ou clé d'option pour un rang).
  // `origin`   : pipeline | baseline | lure | lure_tool. JAMAIS dans le DOM.
  // `orig_rank`: le rang du pipeline, celui que la note doit valider.
  // `rating`   : TOUTE note 0-10. `confidence` reste la 1-5 du questionnaire,
  //              et elle seule : une colonne à deux échelles rend chaque
  //              moyenne fausse sans prévenir.
  // `ts_shown` : l'instant d'AFFICHAGE. Avec `ts_client` (la validation), il
  //              donne le verrouillage de chaque zone de prose, l'ouverture de
  //              la checklist et la latence affichage → clic, lisible même
  //              quand `rt_ms` est douteux (`resumed` = 1).
  // `rank`     : le rang donné par le participant, VIDE s'il n'a rien eu à
  //              classer (moins de deux options cochées classables).
  // `tick_order` / `rank_touched` : sans eux, un classement jamais touché
  //              (donc l'ordre de coche, donc l'ordre d'affichage mélangé)
  //              serait indiscernable d'un jugement.
  'item_id', 'origin', 'orig_rank', 'display_position', 'rating',
  'options_json', 'ts_shown', 'protocol_version',
  'rank', 'tick_order', 'rank_touched',
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
        // PÉREMPTION SUR LA DERNIÈRE ACTIVITÉ, pas sur l'attribution : un
        // participant lent est encore là, un participant qui a fermé l'onglet
        // au consentement n'a jamais rien écrit. Reprendre la row du premier
        // casse l'équilibrage du plan ET lui vole sa place.
        var ts = Math.max(
          values[j][4] ? new Date(values[j][4]).getTime() : 0,
          values[j][7] ? new Date(values[j][7]).getTime() : 0
        );
        if (now.getTime() - ts > staleMs) candidates.push(j);
      }
    }
    if (!candidates.length) return { error: 'full' };

    var pick = candidates[Math.floor(Math.random() * candidates.length)];
    var rowId = values[pick][0];
    // Une row reprise à un abandon laisse une trace : `assign_count` compte les
    // passages, et la session le dit en clair. Les réponses de l'abandon restent
    // dans `responses` sous SON pid — l'analyse se fait par pid, jamais par row.
    if (String(values[pick][1]) === 'ASSIGNED' && values[pick][2]) {
      logSession_(sessionId, String(values[pick][2]), rowId, false, 'reclaimed-stale', '');
    }
    sheet.getRange(pick + 2, 2, 1, 7).setValues([[
      'ASSIGNED', pid, sessionId, now, '', Number(values[pick][6] || 0) + 1, '',
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
 * UNE SEULE ÉCRITURE PAR LOT, sous verrou (2026-09-10).
 *
 * Historique, parce que ce point s'est déjà trompé deux fois :
 *  - 04/09 : `getLastRow()` + `setValues` SANS verrou → deux appels simultanés
 *    lisaient la même dernière ligne et six réponses ont été écrasées ;
 *  - 09/09 : `appendRow` en BOUCLE, atomique mais payé par ligne. Un lot de 34
 *    réponses coûtait 34 allers-retours Sheets, et au-delà des 1000 lignes de
 *    grille par défaut chacun forçait un agrandissement. Mesuré sur les cinq
 *    premiers participants : latence médiane 1,4 s mais 10 % des requêtes
 *    au-delà de 45 s, donc au-delà du délai du client, qui réessayait. 25 lots
 *    sur 105 ont été écrits deux fois (206 lignes en double, dédupliquées par
 *    `event_id`). Aucune réponse perdue, mais le participant attendait.
 *
 * La bonne forme est la troisième : `setValues` d'un bloc, sous le verrou de
 * script, sur une grille pré-allouée. Le verrou est le MÊME que celui de
 * l'attribution, exprès : le battement de cœur ci-dessous écrit dans `rows`.
 * Les doublons restent possibles (un réessai après une réponse perdue en
 * chemin) et portent le même `event_id`.
 */
function appendEvents_(body) {
  var events = body.events || [];
  if (!events.length) return { ok: true, written: 0 };

  var ts = new Date();
  var rows = events.map(function (ev) {
    return [
      ts, ev.ts_client, body.pid, body.session_id, body.row_id, body.is_test ? 1 : 0,
      ev.scene_id, ev.axis, ev.phase, ev.scenario_index, ev.stage, ev.item_key,
      ev.response_text, ev.confidence, ev.concepts_json, ev.concept_order_json,
      ev.other_text, ev.rt_ms, ev.resumed ? 1 : 0, ev.event_id, ev.seq,
      ev.item_id, ev.origin, ev.orig_rank, ev.display_position, ev.rating,
      ev.options_json, ev.ts_shown, ev.protocol_version,
      ev.rank, ev.tick_order,
      // Booléen → 1/0, comme `resumed` et `is_test` : un `false` brut sort en
      // FALSE dans le Sheet et se lit mal à côté d'une cellule vide.
      ev.rank_touched === null || ev.rank_touched === undefined ? '' : (ev.rank_touched ? 1 : 0),
    ];
  });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return { error: 'busy', retry: true };
  }

  try {
    var sheet = sh_(SHEETS.RESPONSES);
    var first = sheet.getLastRow() + 1;
    var need = first + rows.length - 1;
    var max = sheet.getMaxRows();
    if (max < need) sheet.insertRowsAfter(max, Math.max(need - max, GRID_CHUNK));
    sheet.getRange(first, 1, rows.length, RESPONSES_HEADER.length).setValues(rows);
    // BATTEMENT DE CŒUR : le client donne son `row_id`, donc la ligne s'écrit
    // sans relire l'onglet. C'est lui qui empêche `assign_` de reprendre la row
    // d'un participant encore actif.
    var rowId = Number(body.row_id);
    if (!body.is_test && rowId >= 1 && rowId <= N_ROWS) {
      sh_(SHEETS.ROWS).getRange(rowId + 1, 8).setValue(ts);
    }
    SpreadsheetApp.flush();
    return { ok: true, written: rows.length };
  } finally {
    lock.releaseLock();
  }
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

/**
 * À exécuter UNE FOIS sur un classeur qui tournait déjà en v2 avant le
 * 2026-09-10 : écrit l'en-tête `last_seen` et pré-alloue la grille de
 * `responses`. Sans appel, tout continue de fonctionner (la colonne 8 s'écrit
 * quand même, sans titre) — mais l'onglet s'agrandira toujours ligne par ligne.
 */
function migrate() {
  var rows = sh_(SHEETS.ROWS);
  rows.getRange(1, 8).setValue('last_seen').setFontWeight('bold');
  growGrid_(sh_(SHEETS.RESPONSES));
  SpreadsheetApp.flush();
  Logger.log('migrate: last_seen posé, grille responses à ' + sh_(SHEETS.RESPONSES).getMaxRows() + ' lignes');
}

/** Marge de grille : une écriture ne doit jamais déclencher d'agrandissement. */
function growGrid_(sheet) {
  var need = sheet.getLastRow() + GRID_CHUNK;
  if (sheet.getMaxRows() < need) sheet.insertRowsAfter(sheet.getMaxRows(), need - sheet.getMaxRows());
}

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
  growGrid_(ensure(SHEETS.RESPONSES, RESPONSES_HEADER));
  var meta = ensure(SHEETS.META, ['key', 'value']);

  if (rows.getLastRow() < 2) {
    var seed = [];
    for (var i = 1; i <= N_ROWS; i++) seed.push([i, 'FREE', '', '', '', '', 0, '']);
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
  // Le bouton Run de l'éditeur appelle la fonction SANS argument : passer par un
  // wrapper (ex. `function free14() { freeRow(14); }`), jamais par un appel au
  // niveau global du fichier (il se rejouerait à chaque doGet/doPost).
  var id = Number(rowId);
  if (!(id >= 1 && id <= N_ROWS)) throw new Error('freeRow(rowId) : rowId manquant ou hors plan (1..' + N_ROWS + '). Utiliser un wrapper : function free14() { freeRow(14); }');
  var sheet = sh_(SHEETS.ROWS);
  sheet.getRange(id + 1, 2, 1, 5).setValues([['FREE', '', '', '', '']]);
  sheet.getRange(id + 1, 8).setValue('');
  SpreadsheetApp.flush();
}

/**
 * Admin : NOUVELLE VAGUE sur le MÊME classeur (2026-09-10).
 *
 * Rejouer une étude sur un classeur déjà servi ne marche pas tel quel :
 *  · les 75 design rows sont consommées (5 COMPLETED, 1 ASSIGNED après le
 *    10/09) et `assign_` ne rendrait plus que « full » ;
 *  · les réponses des deux vagues se mélangeraient dans le même onglet, avec
 *    les mêmes `item_key` et presque les mêmes `scene_id` — mais des THÉORIES
 *    différentes, et une scène qui a changé d'identité (2-11). Une moyenne
 *    calculée dessus serait fausse sans prévenir, exactement le piège qui a
 *    imposé un classeur neuf entre la v1 et la v2.
 *
 * Cette fonction ARCHIVE plutôt qu'elle n'efface : les onglets `responses` et
 * `sessions` sont renommés avec l'étiquette de la vague, et des onglets neufs
 * les remplacent. Rien n'est perdu, et l'URL /exec ne change pas — donc pas de
 * reconstruction du site.
 *
 * `meta` n'est PAS touché : le code de complétion vient de Prolific et change
 * à chaque étude, c'est au chercheur de le recopier.
 *
 * USAGE : fermer l'étude (`closeStudy()`), puis choisir `resetWave` dans le
 * menu et Exécuter. Aucun argument à passer — le bouton Run de l'éditeur
 * appelle toujours la fonction sans argument, donc l'étiquette prend la DATE DU
 * JOUR par défaut. Pour en nommer une autre, passer par un wrapper comme pour
 * `freeRow` : `function reset1() { resetWave('pilote-A'); }`
 *
 * GARDE-FOU : la fonction refuse tant que l'étude est OUVERTE. Archiver et
 * libérer 75 rows pendant que des gens répondent perdrait leur session en
 * cours ; `closeStudy()` d'abord, toujours.
 */
function resetWave(label) {
  if (meta_('study_open') !== 'FALSE') {
    throw new Error(
      "resetWave : l'étude est encore OUVERTE. Lancer closeStudy() d'abord — sinon les participants en cours perdent leur row.",
    );
  }
  var tag = String(label || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')).trim();
  if (!/^[0-9A-Za-z_.-]{3,40}$/.test(tag)) {
    throw new Error("resetWave : étiquette invalide « " + tag + " » (lettres, chiffres, . _ - seulement).");
  }
  var ss = SpreadsheetApp.getActive();

  [SHEETS.RESPONSES, SHEETS.SESSIONS].forEach(function (name) {
    var live = ss.getSheetByName(name);
    if (!live) return;
    var archived = name + '-' + tag;
    if (ss.getSheetByName(archived)) throw new Error('archive déjà présente : ' + archived);
    live.setName(archived);
  });

  var responses = ss.insertSheet(SHEETS.RESPONSES);
  responses.getRange(1, 1, 1, RESPONSES_HEADER.length).setValues([RESPONSES_HEADER]).setFontWeight('bold');
  responses.setFrozenRows(1);
  growGrid_(responses);

  var sessions = ss.insertSheet(SHEETS.SESSIONS);
  sessions.getRange(1, 1, 1, SESSIONS_HEADER.length).setValues([SESSIONS_HEADER]).setFontWeight('bold');
  sessions.setFrozenRows(1);

  // Les 75 rows repartent LIBRES, `assign_count` remis à zéro : sans ça le
  // compteur mêlerait les passages des deux vagues.
  var seed = [];
  for (var i = 1; i <= N_ROWS; i++) seed.push([i, 'FREE', '', '', '', '', 0, '']);
  sh_(SHEETS.ROWS).getRange(2, 1, N_ROWS, ROWS_HEADER.length).setValues(seed);

  SpreadsheetApp.flush();
  var msg =
    'resetWave : ' + SHEETS.RESPONSES + ' et ' + SHEETS.SESSIONS + ' archivés en « -' + tag +
    ' », onglets neufs créés, ' + N_ROWS + ' rows libérées. `meta` inchangé — recopier le NOUVEAU code de ' +
    'complétion Prolific, puis openStudy() pour rouvrir.';
  Logger.log(msg);
  return msg;
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
  var counts = { FREE: 0, ASSIGNED: 0, COMPLETED: 0, EXCLUDED: 0, in_progress: 0, stale: 0 };
  var staleMs = Number(meta_('stale_minutes') || DEFAULT_STALE_MINUTES) * 60000;
  var now = Date.now();
  values.forEach(function (r) {
    counts[r[1]] = (counts[r[1]] || 0) + 1;
    if (String(r[1]) !== 'ASSIGNED') return;
    // Un ASSIGNED n'est pas un abandon : il faut regarder la dernière activité.
    var seen = Math.max(r[4] ? new Date(r[4]).getTime() : 0, r[7] ? new Date(r[7]).getTime() : 0);
    if (now - seen > staleMs) counts.stale++;
    else counts.in_progress++;
  });
  Logger.log(JSON.stringify(counts));
  return counts;
}
