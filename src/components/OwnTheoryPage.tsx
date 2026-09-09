import { scenario } from "../config/instructions";
import { ownQuestion } from "../config/protocol";
import type { SceneMeta } from "../types";
import { ProseZone } from "./ProseZone";
import { Scale } from "./Scale";

interface Props {
  scene: SceneMeta;
  /** 0 = ce qui va se passer · 1 = ce qui le décide · 2 = ce qu'on changerait ·
      3 = la confiance. */
  reveal: number;
  /** Textes DÉJÀ figés, relus depuis `committed` : c'est ce qui rend le verrou
      structurel plutôt que cosmétique, et le fait survivre à un F5. */
  locked: (string | undefined)[];
  draftText: string;
  draftRating: number | null;
  onText: (v: string) => void;
  onRating: (v: number) => void;
  onSubmit: () => void;
}

/**
 * STAGE 1, page A. Quatre révélations dans un même écran, jamais deux zones de
 * saisie ACTIVES à la fois : chaque zone n'apparaît qu'une fois la précédente
 * validée, et l'item de confiance qu'une fois les trois verrouillées.
 *
 * Les trois questions, dans cet ordre : ce qui va se passer, CE QUI LE DÉCIDE,
 * ce qu'on changerait. La deuxième est celle qui manquait à la v2 : sans elle,
 * le participant ne disait jamais quelles propriétés sont en jeu autrement
 * qu'en cochant une liste, et le stage 2 lui faisait noter des théories contre
 * une théorie qu'il n'avait pas formulée.
 *
 * L'item de confiance est le SEUL de l'élicitation, une fois par scène. Le
 * questionnaire final garde par ailleurs sa confiance générale, en 1-5 : les
 * deux ne vont pas dans la même colonne du Sheet, sans quoi chaque moyenne
 * mélangerait deux échelles.
 */
export function OwnTheoryPage({
  scene,
  reveal,
  locked,
  draftText,
  draftRating,
  onText,
  onRating,
  onSubmit,
}: Props) {
  const CONF = 3; // la confiance est la dernière révélation
  const complete = reveal === CONF ? draftRating != null : draftText.trim().length > 0;

  return (
    <section className="itempage own">
      {[0, 1, 2].map((z) =>
        reveal > z ? (
          <ProseZone
            key={z}
            id={`z${z + 1}`}
            question={ownQuestion(scene, z)}
            value={locked[z] ?? ""}
            onChange={() => {}}
            locked
          />
        ) : null,
      )}

      {reveal < CONF && (
        <ProseZone
          id={`z${reveal + 1}`}
          question={ownQuestion(scene, reveal)}
          value={draftText}
          onChange={onText}
          autoFocus
        />
      )}

      {reveal === CONF && (
        <div className="confidence">
          <span className="sub">{scenario.confidencePrompt}</span>
          <Scale
            name="confidence"
            spec={{ kind: "anchored", from: 0, to: 10, low: scenario.confidenceLow, high: scenario.confidenceHigh }}
            value={draftRating}
            onChange={onRating}
          />
        </div>
      )}

      <div className="actions">
        <button className="primary" disabled={!complete} onClick={onSubmit}>
          {scenario.submitProse}
        </button>
        <span className="sub">{scenario.finalNotice}</span>
      </div>
    </section>
  );
}
