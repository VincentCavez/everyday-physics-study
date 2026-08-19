import { useMemo, useState } from "react";
import conceptsData from "../config/concepts.json";
import { scenario } from "../config/instructions";
import { studyConfig } from "../config/studyConfig";
import { hashSeed, seededShuffle } from "../utils/rng";
import type { CommittedConcepts, ConceptOption } from "../types";

const OPTIONS = conceptsData.options as unknown as ConceptOption[];
const acConcept = studyConfig.attentionChecks.concept;

interface Props {
  /** clé de présentation : même liste, ordre re-tiré à chaque apparition */
  presentationKey: string;
  /** injecte l'option de contrôle d'attention dans cette présentation */
  withAttentionCheck: boolean;
  /** coches de départ (sélection du bloc précédent du même croquis), ou null */
  initial: CommittedConcepts | null;
  onSubmit: (sel: { keys: string[]; order: string[]; other: string }) => void;
}

/**
 * Liste de concepts, montrée seulement après soumission de la prose. Ordre
 * mélangé à chaque présentation (contre le biais de position), avec
 * distracteurs, « aucun de ceux-ci » et un champ libre. Aucun minimum de
 * sélection : en forcer un fabriquerait des faux positifs.
 *
 * Blocs 2 et 3 : la liste est PRÉ-REMPLIE avec la sélection du bloc précédent
 * (retour de relecture : la retrouver vide trois fois par croquis était
 * pénible ; la remontrer pré-cochée rend l'ajustement possible sans tout
 * rechercher). Le parent remonte le composant à chaque page (`key`), donc
 * l'état local repart bien de `initial` à chaque présentation.
 */
export function ConceptSelect({ presentationKey, withAttentionCheck, initial, onSubmit }: Props) {
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

  // Ne reporter que des clés PRÉSENTES dans cette présentation : l'option de
  // contrôle d'attention n'existe que dans une seule liste et ne doit pas
  // voyager, cochée mais invisible, jusqu'au bloc suivant.
  const [selected, setSelected] = useState<string[]>(() =>
    (initial?.keys ?? []).filter((k) => order.includes(k)),
  );
  const [other, setOther] = useState(() =>
    initial && initial.keys.includes(otherKey) ? initial.other : "",
  );
  const prefilled = selected.length > 0 && initial != null;

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
      {prefilled && <p className="sub prefilled">{scenario.conceptPrefilledNote}</p>}
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
