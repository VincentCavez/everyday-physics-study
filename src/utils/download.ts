import type { SessionState } from "../types";

/** Filet de sécurité : si le serveur reste injoignable, le participant peut
 *  récupérer ses réponses et nous les transmettre via Prolific. */
export function downloadSession(state: SessionState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-answers-${state.pid}-${state.session_id.slice(0, 8)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
