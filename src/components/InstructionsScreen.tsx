import { instructions } from "../config/instructions";
import { stimulusUrl, usePreload } from "../hooks/usePreload";
import { currentScene } from "../state/machine";
import { dispatch, useSession } from "../state/store";

/** Consignes + convention de flèche, illustrée sur une scène du corpus. */
export function InstructionsScreen() {
  const s = useSession();
  const first = currentScene(s);
  usePreload([first?.id]);

  return (
    <main className="page">
      <h1>{instructions.title}</h1>
      {instructions.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}

      <div className="convention">
        <p className="lead">{instructions.drawingConvention}</p>
        <img src={stimulusUrl(instructions.conventionSceneId)} alt="Example sketch with a motion arrow" />
        <p className="caption">{instructions.conventionCaption}</p>
      </div>

      <button className="primary" onClick={() => dispatch({ type: "SET_STEP", step: "scenario" })}>
        {instructions.button}
      </button>
    </main>
  );
}
