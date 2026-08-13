import { useSyncExternalStore } from "react";
import { reduce, type Action } from "./machine";
import { saveState } from "./persistence";
import type { SessionState } from "../types";

/**
 * Petit magasin externe plutôt qu'un contexte React : la file d'envoi tourne
 * hors du cycle de rendu et doit pouvoir lire l'état et dépiler sans composant
 * monté. Chaque dispatch écrit dans localStorage (write-through) pour que la
 * reprise après rafraîchissement ne perde jamais plus qu'un brouillon en cours.
 */

let state: SessionState | null = null;
const listeners = new Set<() => void>();

export function initStore(s: SessionState): void {
  state = s;
  saveState(s);
  listeners.forEach((l) => l());
}

export function getState(): SessionState {
  if (!state) throw new Error("magasin non initialisé");
  return state;
}

export function dispatch(action: Action): SessionState {
  const next = reduce(getState(), action);
  if (next !== state) {
    state = next;
    saveState(next);
    listeners.forEach((l) => l());
  }
  return next;
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getState, getState);
}
