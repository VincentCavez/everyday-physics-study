import type { SessionState } from "../types";

const KEY = "pp-study/v1";
// 2 (2026-08-19) : ajout de `concepts` (pré-remplissage des listes). Un état
// v1 repart de zéro plutôt que d'être migré.
// 3 (2026-09-09, protocole v2) : les trois BLOCS deviennent trois STAGES, et le
// curseur passe de `(scenario_index, block, item_index)` à
// `(scenario_index, page_index, reveal)`. Aucune migration : un état v2 est
// rejeté et la session repart de zéro. Conséquence opérationnelle, à assumer au
// déploiement : un participant EN SÉANCE perd sa file d'events non envoyée.
// Déployer fenêtre fermée (`closeStudy()` dans le Sheet, attendre qu'aucune row
// ne soit ASSIGNED de frais, déployer, `openStudy()`).
//
// `VERSION` est la SEULE source : `initialState()` l'importe d'ici. Avant, la
// valeur était recopiée en dur dans machine.ts, et rien n'empêchait les deux de
// diverger — un état périmé aurait alors été rechargé comme s'il était courant.
export const VERSION = 3;

export function loadState(): SessionState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    // Un état d'une version antérieure n'est pas migré : le protocole aurait pu
    // changer entre-temps, mieux vaut repartir proprement.
    if (parsed?.version !== VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: SessionState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota plein ou stockage refusé : la session continue en mémoire, la file
    // d'events part quand même vers le serveur. On ne bloque pas le participant.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
