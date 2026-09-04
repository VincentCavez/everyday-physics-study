import { useEffect } from "react";
import { errors } from "../config/instructions";
import { downloadSession } from "../utils/download";
import { enterStudy, isViewportOk } from "../state/session";
import { dispatch, getState, useSession } from "../state/store";

export function DesktopGate() {
  // La fenêtre est souvent encore petite au chargement (onglet restauré, panneau
  // latéral) : on repart dès qu'elle atteint la taille voulue, sans exiger un clic.
  useEffect(() => {
    const onResize = () => {
      if (isViewportOk()) void enterStudy();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <main className="page">
      <h1>{errors.gateTitle}</h1>
      <p>{errors.gateBody}</p>
      <button className="primary" onClick={() => void enterStudy()}>
        I have made my window bigger — continue
      </button>
    </main>
  );
}

export function FullScreen() {
  return (
    <main className="page">
      <h1>{errors.fullTitle}</h1>
      <p>{errors.fullBody}</p>
    </main>
  );
}

export function ClosedScreen() {
  return (
    <main className="page">
      <h1>{errors.closedTitle}</h1>
      <p>{errors.closedBody}</p>
    </main>
  );
}

/** Réessai : sans row, on repasse par l'attribution ; avec une row, on relance
 *  la fin de session (envoi de la file puis demande du code). */
function retry(): void {
  const s = getState();
  if (s.row_id == null) void enterStudy();
  else dispatch({ type: "SET_STEP", step: "completing" });
}

export function FatalScreen() {
  const s = useSession();
  return (
    <main className="page">
      <h1>{errors.fatalTitle}</h1>
      <p>{errors.fatalBody}</p>
      {s.fatal_reason && <p className="sub">Technical detail: {s.fatal_reason}</p>}
      <button className="primary" onClick={retry}>
        {errors.retryButton}
      </button>
      <button className="ghost" onClick={() => downloadSession(s)}>
        {errors.downloadButton}
      </button>
    </main>
  );
}

export function NoCodeScreen() {
  const s = useSession();
  return (
    <main className="page">
      <h1>{errors.nocodeTitle}</h1>
      <p>{errors.nocodeBody}</p>
      {s.fatal_reason && <p className="sub">Technical detail: {s.fatal_reason}</p>}
      <button className="primary" onClick={retry}>
        {errors.retryButton}
      </button>
    </main>
  );
}
