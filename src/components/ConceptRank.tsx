import { useState } from "react";
import { scenario } from "../config/instructions";

export interface RankRow {
  key: string;
  rank: number;
  touched: boolean;
}

interface Props {
  /** Les options cochées, DANS L'ORDRE DE COCHE. */
  options: { key: string; label: string }[];
  /** L'issue de la scène, en clause nominale (`outcome` de scenes.json). */
  outcome: string;
  onSubmit: (rows: RankRow[]) => void;
}

/**
 * CLASSEMENT PARTIEL des options cochées (2026-09-09). Le pipeline ne rend pas
 * un ensemble mais une LISTE ORDONNÉE par sensibilité mesurée ; la phase 1
 * captait l'ensemble, pas l'ordre. On le capte, sans imposer un classement
 * complet : on n'ordonne que ce qui a été coché.
 *
 * Le geste, en deux temps :
 *  1. ÉLIRE LA TÊTE. Obligatoire, et c'est le seul acte obligatoire : c'est
 *     exactement ce que la mesure de tête exploite (accord top-1 / top-2 avec
 *     la tête du pipeline).
 *  2. Réordonner le reste, par glisser ou par les flèches. Facultatif.
 *
 * Les rangs 2..k restent donc pré-remplis dans l'ordre de coche. C'est une
 * VALEUR PAR DÉFAUT, et l'ordre de coche dérive lui-même de l'ordre d'affichage
 * mélangé : un participant qui ne touche rien produirait un classement qui
 * ressemble à un jugement sans en être un, et Borda comme RBO le mangeraient
 * sans le voir. D'où `touched`, posé par option : l'analyse peut calculer le
 * consensus sur toute la population, puis le recalculer en écartant les
 * classements jamais touchés, et rapporter les deux.
 *
 * Les flèches doublent le glisser à dessein : un glisser raté ne doit pas
 * pouvoir empêcher quelqu'un de répondre, et le clavier doit rester praticable.
 */
export function ConceptRank({ options, outcome, onSubmit }: Props) {
  const [order, setOrder] = useState(() => options.map((o) => o.key));
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [headElected, setHeadElected] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const labelOf = (key: string) => options.find((o) => o.key === key)?.label ?? key;

  const mark = (...keys: string[]) =>
    setTouched((cur) => {
      const next = new Set(cur);
      for (const k of keys) next.add(k);
      return next;
    });

  function electHead(key: string) {
    setOrder((cur) => [key, ...cur.filter((k) => k !== key)]);
    mark(key);
    setHeadElected(true);
  }

  /** Déplace `key` à l'index `to`. Marque les deux extrémités du déplacement :
      celle qui bouge et celle qu'elle dépasse ont toutes deux changé de rang
      par une décision, pas par défaut. */
  function moveTo(key: string, to: number) {
    setOrder((cur) => {
      const from = cur.indexOf(key);
      if (from < 0 || to < 0 || to >= cur.length || from === to) return cur;
      const next = [...cur];
      next.splice(from, 1);
      next.splice(to, 0, key);
      mark(key, cur[to]!);
      return next;
    });
  }

  function submit() {
    onSubmit(order.map((key, i) => ({ key, rank: i + 1, touched: touched.has(key) })));
  }

  return (
    <section className="block ranking">
      <p className="lead">{scenario.rankPrompt(outcome)}</p>
      <p className="sub">{headElected ? scenario.rankHint : scenario.rankTopHint}</p>

      <ol className="ranklist">
        {order.map((key, i) => (
          <li
            key={key}
            className={`rankrow${i === 0 && headElected ? " is-head" : ""}${dragging === key ? " is-dragging" : ""}`}
            draggable={headElected}
            onDragStart={() => setDragging(key)}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => {
              if (!dragging || dragging === key) return;
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging && dragging !== key) moveTo(dragging, i);
              setDragging(null);
            }}
          >
            <span className="rank-n">{i + 1}</span>
            <span className="rank-label">{labelOf(key)}</span>
            {headElected ? (
              <span className="rank-moves">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveTo(key, i - 1)}>
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === order.length - 1}
                  onClick={() => moveTo(key, i + 1)}
                >
                  ↓
                </button>
              </span>
            ) : (
              <button type="button" className="rank-elect" onClick={() => electHead(key)}>
                This one matters most
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="actions">
        <button className="primary" disabled={!headElected} onClick={submit}>
          {scenario.submitConcepts}
        </button>
        <span className="sub">{scenario.finalNotice}</span>
      </div>
    </section>
  );
}
