import { studyConfig } from "../config/studyConfig";
import { assign } from "../data/api";
import { scheduleFlush } from "../data/queue";
import { uuid } from "../utils/rng";
import { DESIGN_ROWS, initialState } from "./machine";
import { clearState, loadState } from "./persistence";
import { dispatch, getState, initStore } from "./store";
import type { SessionState } from "../types";

/**
 * Démarrage : reprendre une session locale si elle existe, sinon demander une
 * design row au serveur. L'attribution est idempotente côté serveur (clé =
 * Prolific ID), donc un participant qui revient ne peut jamais consommer deux
 * rows, et un participant qui a vidé son stockage local reprend la même row.
 */
export async function boot(): Promise<void> {
  const url = new URLSearchParams(location.search);
  const pid = url.get("PROLIFIC_PID") ?? url.get("prolific_pid") ?? "";
  const isPreview = pid === "";

  // ?reset=1 : repartir d'une session vierge (relecture des textes en local).
  // Sans effet sur l'équilibrage : l'attribution serveur reste idempotente par
  // Prolific ID, un participant qui l'utiliserait retomberait sur sa row.
  if (url.get("reset") === "1") clearState();

  const saved = url.get("reset") === "1" ? null : loadState();
  if (saved && (isPreview || saved.pid === pid)) {
    // Reprise : on repart exactement là où le curseur s'était arrêté. Les temps
    // de réponse des items déjà affichés sont marqués `resumed` plutôt que
    // faussement recalculés.
    const resumed: SessionState = { ...saved, resumed: true };
    initStore(resumed);
    scheduleFlush(0);
    // Une session interrompue avant l'attribution (fenêtre trop petite, réseau
    // absent) doit repasser par le portail plutôt que d'y rester bloquée.
    if (resumed.row_id == null && (resumed.step === "gate" || resumed.step === "boot")) {
      await enterStudy();
    }
    return;
  }
  // Sinon : pas de session locale, ou une session appartenant à un autre
  // participant — on repart de zéro plutôt que de mélanger les deux.
  const state = initialState({
    session_id: uuid(),
    pid: isPreview ? `TEST-${uuid().slice(0, 8)}` : pid,
    prolific_study_id: url.get("STUDY_ID") ?? "",
    prolific_session_id: url.get("SESSION_ID") ?? "",
    is_preview: isPreview,
    step: "gate",
  });
  initStore(state);
  await enterStudy();
}

/** Portail écran : on n'attribue une row qu'à un participant qui peut aller au
 *  bout, pour ne pas immobiliser une row derrière un téléphone. */
export async function enterStudy(): Promise<void> {
  if (!isViewportOk()) {
    dispatch({ type: "SET_STEP", step: "gate" });
    return;
  }
  await requestRow();
}

export function isViewportOk(): boolean {
  return window.innerWidth >= studyConfig.minViewportWidth;
}

/** Demande (ou retrouve) la design row du participant. */
export function backendConfigured(): boolean {
  return /^https:\/\//.test(studyConfig.appsScriptUrl);
}

export async function requestRow(): Promise<void> {
  const s = getState();
  if (s.row_id != null) return;

  if (s.is_preview && !backendConfigured()) {
    // Prévisualisation sans backend (développement local, relecture des textes) :
    // une row tirée localement suffit pour parcourir tout le protocole.
    // ?row=N force une design row précise, pour relire des scènes données.
    const forced = Number(new URLSearchParams(location.search).get("row"));
    const rowId =
      forced >= 1 && forced <= DESIGN_ROWS.length
        ? forced
        : 1 + Math.floor(Math.random() * DESIGN_ROWS.length);
    dispatch({ type: "ASSIGNED", row_id: rowId });
    return void dispatch({ type: "SET_STEP", step: "consent" });
  }

  try {
    const res = await assign(s.pid, s.session_id, s.is_preview);
    if (res.error === "full") return void dispatch({ type: "SET_STEP", step: "full" });
    if (res.error === "closed") return void dispatch({ type: "SET_STEP", step: "closed" });
    if (res.row_id == null) throw new Error(res.error ?? "réponse d'attribution vide");

    dispatch({ type: "ASSIGNED", row_id: res.row_id });
    if (res.completed) {
      // Participant déjà arrivé au bout (autre navigateur, stockage vidé) :
      // on lui redonne son code au lieu de lui refaire passer l'étude.
      return void dispatch({ type: "COMPLETED", code: res.code ?? null });
    }
    dispatch({ type: "SET_STEP", step: "consent" });
  } catch (e) {
    dispatch({
      type: "SET_STEP",
      step: "fatal",
      reason: `attribution impossible : ${(e as Error).message}`,
    });
  }
}
