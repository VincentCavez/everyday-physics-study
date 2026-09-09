import { useMemo, useState } from "react";
import conceptsData from "../config/concepts.json";
import { scenario } from "../config/instructions";
import { studyConfig } from "../config/studyConfig";
import { hashSeed, seededShuffle } from "../utils/rng";
import type { ConceptOption } from "../types";

const OPTIONS = conceptsData.options as unknown as ConceptOption[];
const acConcept = studyConfig.attentionChecks.concept;

interface Props {
  /** clé de présentation : même liste, ordre re-tiré à chaque apparition */
  presentationKey: string;
  /** injecte l'option de contrôle d'attention dans cette présentation */
  withAttentionCheck: boolean;
  onSubmit: (sel: { keys: string[]; order: string[]; other: string }) => void;
}

/**
 * Liste de concepts, montrée seulement après verrouillage des TROIS zones de
 * prose et de la confiance. Ordre mélangé à chaque présentation (contre le biais de position),
 * avec distracteurs, « aucun de ceux-ci » et un champ libre. Aucun minimum de
 * sélection : en forcer un fabriquerait des faux positifs.
 *
 * Le PRÉ-REMPLISSAGE de la v1 disparaît avec les blocs 2 et 3 : il n'y a plus
 * qu'une liste par scène, donc plus rien à reporter.
 *
 * `keys` sort dans l'ORDRE DE COCHE, jamais dans l'ordre d'affichage. C'est cet
 * ordre-là que le classement pré-remplit, et il part au Sheet en `tick_order` :
 * sans lui, on ne pourrait pas distinguer un classement réfléchi d'un
 * classement laissé tel quel, qui n'est alors que l'ordre d'affichage mélangé.
 */
export function ConceptSelect({ presentationKey, withAttentionCheck, onSubmit }: Props) {
  const options = useMemo(() => {
    const pool: ConceptOption[] = withAttentionCheck
      ? [
          ...OPTIONS,
          { key: acConcept.itemKey, kind: "check", label: acConcept.label, concepts: [] },
        ]
      : OPTIONS;
    const shuffled = seededShuffle(
      pool.filter((o) => o.kind !== "none" && o.kind !== "other"),
      hashSeed(presentationKey),
    );
    // « aucun » et « autre » restent en fin de liste : ce sont des méta-réponses,
    // les mélanger avec les concepts n'aurait pas de sens.
    return [...shuffled, ...pool.filter((o) => o.kind === "none"), ...pool.filter((o) => o.kind === "other")];
  }, [presentationKey, withAttentionCheck]);

  const order = options.map((o) => o.key);
  const noneKey = OPTIONS.find((o) => o.kind === "none")!.key;
  const otherKey = OPTIONS.find((o) => o.kind === "other")!.key;

  const [selected, setSelected] = useState<string[]>([]);
  const [other, setOther] = useState("");

  function toggle(key: string) {
    setSelected((cur) => {
      if (key === noneKey) return cur.includes(noneKey) ? [] : [noneKey];
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      return next.filter((k) => k !== noneKey); // « aucun » est exclusif
    });
  }

  return (
    <section className="block concepts">
      <p className="lead">{scenario.conceptPrompt}</p>
      <ul className="options">
        {options.map((o) => (
          <li key={o.key}>
            <label className="check">
              <input type="checkbox" checked={selected.includes(o.key)} onChange={() => toggle(o.key)} />
              <span>{o.label}</span>
            </label>
            {o.key === otherKey && selected.includes(otherKey) && (
              <input
                className="other"
                type="text"
                placeholder={scenario.otherPlaceholder}
                value={other}
                onChange={(e) => setOther(e.target.value)}
              />
            )}
          </li>
        ))}
      </ul>
      <button
        className="primary"
        onClick={() => onSubmit({ keys: selected, order, other: selected.includes(otherKey) ? other : "" })}
      >
        {scenario.submitConcepts}
      </button>
    </section>
  );
}
