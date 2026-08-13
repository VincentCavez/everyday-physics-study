import { useEffect } from "react";
import { dispatch, getState } from "../state/store";

/**
 * Temps de réponse. L'horodatage d'affichage est posé dans l'état persisté, pas
 * dans une ref : après un rafraîchissement, l'item retrouve son point de départ
 * d'origine et l'event porte le drapeau `resumed` pour que l'analyse puisse
 * écarter ces durées.
 */
export function markShown(key: string): void {
  dispatch({ type: "MARK_SHOWN", key });
}

export function rtFor(key: string): number | null {
  const t = getState().shown_at[key];
  return t == null ? null : Date.now() - t;
}

/** Pose l'horodatage d'affichage des items d'un écran, une seule fois. */
export function useShown(keys: string[], ready = true): void {
  const id = keys.join("|");
  useEffect(() => {
    if (!ready) return;
    for (const k of id.split("|")) if (k) markShown(k);
  }, [id, ready]);
}
