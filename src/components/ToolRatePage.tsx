import { scenario } from "../config/instructions";
import type { ToolCard } from "../types";
import { Scale } from "./Scale";

interface Props {
  tool: ToolCard;
  withIntro: boolean;
  /** 0 = l'outil seul · 1 = les valeurs révélées. */
  reveal: number;
  /** La note d'ajustement, figée dès la révélation des valeurs. */
  fit: number | null;
  draftRating: number | null;
  onRating: (v: number) => void;
  onSubmit: () => void;
}

/**
 * STAGE 3. Un outil par page, en DEUX TEMPS : on note d'abord l'outil sur son
 * seul nom et son geste, et les valeurs ne se dévoilent qu'après. Sans ce
 * dévoilement en deux temps, la note porterait sur le paquet, et on ne pourrait
 * plus séparer « le pipeline a-t-il choisi la bonne propriété » de « la palette
 * qu'il propose a-t-elle du sens ».
 *
 * Une fois les valeurs révélées, la première note reste À L'ÉCRAN et LISIBLE,
 * mais verrouillée.
 *
 * Cas `range` (30 % des outils mesurés : les hôtes `position`, dont le
 * `value_mapping` est continu) : il n'y a aucune palette à révéler, donc
 * l'item « ces options ont-elles du sens » N'EST PAS POSÉ. La valeur est
 * manquante par construction, pas par oubli, et l'analyse appariée
 * outil/valeurs tourne sur les seuls outils à palette, avec son n annoncé.
 */
export function ToolRatePage({ tool, withIntro, reveal, fit, draftRating, onRating, onSubmit }: Props) {
  const isRange = tool.values.kind === "range";
  const showValues = reveal >= 1;
  // Une note est attendue à chaque temps, SAUF au second temps d'un outil
  // `range` : il n'y a alors littéralement rien à noter.
  const needsRating = !showValues || !isRange;
  const complete = !needsRating || draftRating != null;

  return (
    <section className="itempage rating">
      {withIntro && <p className="lead">{scenario.toolsIntro}</p>}

      <div className="toolcard">
        <strong className="tool-name">{tool.name}</strong>
        <span className="tool-gesture">{tool.gesture}</span>
      </div>

      <p className="question">{scenario.toolFitPrompt}</p>
      <Scale
        name={`tool_${tool.id}`}
        spec={{ kind: "anchored", from: 0, to: 10, low: scenario.toolFitLow, high: scenario.toolFitHigh }}
        value={showValues ? fit : draftRating}
        onChange={onRating}
        disabled={showValues}
      />

      {showValues && (
        <div className="values">
          <p className="tool-values">
            <strong>{scenario.valuesLabel}</strong>{" "}
            {tool.values.kind === "palette" ? `${tool.values.items.join(", ")}.` : tool.values.sentence}
          </p>
          {!isRange && (
            <>
              <p className="question">{scenario.toolValuesPrompt}</p>
              <Scale
                name={`values_${tool.id}`}
                spec={{
                  kind: "anchored",
                  from: 0,
                  to: 10,
                  low: scenario.toolValuesLow,
                  high: scenario.toolValuesHigh,
                }}
                value={draftRating}
                onChange={onRating}
              />
            </>
          )}
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
