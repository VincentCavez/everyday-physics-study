import { useEffect, useState } from "react";
import { errors } from "./config/instructions";
import { studyConfig } from "./config/studyConfig";
import { onQueueTrouble, scheduleFlush } from "./data/queue";
import { CompletingScreen, DoneScreen } from "./components/CompletionScreen";
import { ConsentScreen } from "./components/ConsentScreen";
import { InstructionsScreen } from "./components/InstructionsScreen";
import { ClosedScreen, DesktopGate, FatalScreen, FullScreen } from "./components/Notices";
import { ScenarioScreen } from "./components/ScenarioScreen";
import { SelfAssessScreen } from "./components/SelfAssessScreen";
import { useSession } from "./state/store";

/** Bandeau non bloquant quand la sauvegarde ne passe plus. */
function SaveWarning() {
  const [failures, setFailures] = useState(0);
  useEffect(() => onQueueTrouble(setFailures), []);
  useEffect(() => {
    // Une nouvelle tentative dès que la connexion revient.
    const onOnline = () => scheduleFlush(0);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  if (failures < studyConfig.network.warnAfterFailures) return null;
  return <div className="banner">{errors.saveWarning}</div>;
}

export function App() {
  const s = useSession();

  // Coquille pleine hauteur : le bandeau garde sa place propre, pour qu'il ne
  // pousse jamais la page de scène hors de l'écran quand il apparaît.
  return (
    <div className="shell">
      <SaveWarning />
      {(() => {
        switch (s.step) {
          case "boot":
            return <main className="page" />;
          case "gate":
            return <DesktopGate />;
          case "consent":
            return <ConsentScreen />;
          case "self_assess":
            return <SelfAssessScreen />;
          case "instructions":
            return <InstructionsScreen />;
          case "scenario":
            return <ScenarioScreen />;
          case "completing":
            return <CompletingScreen />;
          case "done":
            return <DoneScreen />;
          case "full":
            return <FullScreen />;
          case "closed":
            return <ClosedScreen />;
          case "fatal":
            return <FatalScreen />;
        }
      })()}
    </div>
  );
}
