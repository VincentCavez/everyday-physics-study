import type { SessionState } from "../types";

const KEY = "pp-study/v1";
const VERSION = 1;

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
