import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { boot } from "./state/session";
import { flush } from "./data/queue";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);

void boot().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

// Dernière chance d'envoyer ce qui reste si l'onglet se ferme. Ce qui n'est pas
// parti reste dans localStorage et repartira à la reprise.
window.addEventListener("pagehide", () => void flush());
