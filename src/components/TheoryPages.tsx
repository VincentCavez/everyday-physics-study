import { useState } from "react";
import { scenario } from "../config/instructions";
import type { TheoryCard } from "../types";
import { Scale } from "./Scale";

/**
 * STAGE 2. Trois descriptions de ce qui pourrait se passer — celle du pipeline,
 * celle de Gemini brut, et un leurre — notées UNE PAR UNE, dans un ordre tiré
 * par participant, sans la moindre indication d'origine, de nombre ou d'ordre.
 *
 * D'où l'absence de compteur : le bandeau de `ScenarioScreen` ne dit jamais
 * « 1 sur 3 » sur ces pages. C'est un vrai renoncement à la progression fine
 * sur une dizaine de pages par scène, assumé, et à surveiller au soft-launch.
 */

interface RateProps {
  card: TheoryCard;
  /** L'intro n'est montrée qu'une fois par scène : en en-tête de la première
      carte, plutôt que sur une page à elle, qui coûterait un clic sans réponse. */
  withIntro: boolean;
  /** 0 = la ressemblance · 1 = « quelque chose en trop » (décision de Vincent,
      09/09). La première note reste à l'écran, verrouillée, au second temps. */
  reveal: number;
  fit: number | null;
  value: number | null;
  onChange: (v: number) => void;
  onSubmit: () => void;
}

/**
 * Deux temps par théorie. La ressemblance récompense la théorie la plus
 * RICHE, même fausse en partie ; « y a-t-il là-dedans quelque chose qui ne
 * joue aucun rôle ? » est le seul item où une théorie sélective peut être
 * créditée d'avoir retiré ce qui ne change rien. Posé APRÈS, sinon il
 * amorcerait la lecture de la première note.
 */
export function TheoryRatePage({ card, withIntro, reveal, fit, value, onChange, onSubmit }: RateProps) {
  const excess = reveal >= 1;
  return (
    <section className="itempage rating">
      {withIntro && <p className="lead">{scenario.theoriesIntro}</p>}
      <blockquote className="card">{card.paragraph}</blockquote>
      <p className="question">{scenario.theoryRatePrompt}</p>
      <Scale
        name={`theory_${card.id}`}
        spec={{ kind: "anchored", from: 0, to: 10, low: scenario.theoryRateLow, high: scenario.theoryRateHigh }}
        value={excess ? fit : value}
        onChange={onChange}
        disabled={excess}
      />
      {excess && (
        <div className="values">
          <p className="question">{scenario.theoryExcessPrompt}</p>
          <Scale
            name={`excess_${card.id}`}
            spec={{ kind: "anchored", from: 0, to: 10, low: scenario.theoryExcessLow, high: scenario.theoryExcessHigh }}
            value={value}
            onChange={onChange}
          />
        </div>
      )}
      <div className="actions">
        <button className="primary" disabled={value == null} onClick={onSubmit}>
          {scenario.submitProse}
        </button>
        <span className="sub">{scenario.finalNotice}</span>
      </div>
    </section>
  );
}

interface ChoiceProps {
  /** Les trois cartes, DANS L'ORDRE OÙ ELLES ONT ÉTÉ PRÉSENTÉES : les revoir
      dans un autre ordre ferait porter le choix sur une liste que le
      participant n'a pas parcourue. */
  cards: TheoryCard[];
  onSubmit: (id: string) => void;
}

export function TheoryChoicePage({ cards, onSubmit }: ChoiceProps) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <section className="itempage rating">
      <p className="question">{scenario.theoryChoicePrompt}</p>
      <div className="choices" role="radiogroup" aria-label={scenario.theoryChoicePrompt}>
        {cards.map((c) => (
          <label key={c.id} className={`choice${picked === c.id ? " is-on" : ""}`}>
            <input type="radio" name="closest" checked={picked === c.id} onChange={() => setPicked(c.id)} />
            <span>{c.paragraph}</span>
          </label>
        ))}
      </div>
      <div className="actions">
        <button className="primary" disabled={!picked} onClick={() => picked && onSubmit(picked)}>
          {scenario.submitProse}
        </button>
        <span className="sub">{scenario.finalNotice}</span>
      </div>
    </section>
  );
}
