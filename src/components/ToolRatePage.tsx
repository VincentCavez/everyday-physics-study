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
 * `value_mapping` est continu) : il n'y a RIEN à révéler et rien à noter, donc
 * la page s'arrête au premier temps (décision de Vincent, 09/09). La phrase
 * « il n'y a pas de liste de choix ici, vous faites glisser le point où vous
 * voulez » n'apprenait rien au participant et lui coûtait un écran mort et un
 * clic sans réponse, sur un protocole qui en compte déjà une soixantaine.
 * L'analyse appariée outil/valeurs tourne donc sur les seuls outils à palette,
 * avec son n annoncé, et ces outils-là n'ont simplement aucune ligne de
 * valeurs.
 */
export function ToolRatePage({ tool, withIntro, reveal, fit, draftRating, onRating, onSubmit }: Props) {
  const showValues = reveal >= 1; // jamais atteint par un outil `range`
  const complete = draftRating != null;

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

      {showValues && tool.values.kind === "palette" && (
        <div className="values">
          <p className="tool-values">
            <strong>{scenario.valuesLabel}</strong> {tool.values.items.join(", ")}.
          </p>
          <p className="question">{scenario.toolValuesPrompt}</p>
          <Scale
            name={`values_${tool.id}`}
            spec={{ kind: "anchored", from: 0, to: 10, low: scenario.toolValuesLow, high: scenario.toolValuesHigh }}
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
