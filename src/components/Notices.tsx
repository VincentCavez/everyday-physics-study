import { useEffect } from "react";
import { errors } from "../config/instructions";
import { downloadSession } from "../utils/download";
import { enterStudy, isViewportOk } from "../state/session";
import { useSession } from "../state/store";

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

export function FatalScreen() {
  const s = useSession();
  return (
    <main className="page">
      <h1>{errors.fatalTitle}</h1>
      <p>{errors.fatalBody}</p>
      {s.fatal_reason && <p className="sub">Technical detail: {s.fatal_reason}</p>}
      <button className="primary" onClick={() => downloadSession(s)}>
        {errors.downloadButton}
      </button>
    </main>
  );
}
