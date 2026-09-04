import { scenario } from "../config/instructions";
import { Scale } from "./Scale";

interface Props {
  question: string;
  /** réponse précédente rappelée en lecture seule (pages « pourquoi ») */
  recall: { question: string; text: string } | null;
  text: string;
  confidence: number | null;
  withConfidence: boolean;
  /** choix forcé : options à la place du champ de texte */
  choice?: readonly { key: string; label: string }[];
  onText: (v: string) => void;
  onConfidence: (v: number) => void;
  onSubmit: () => void;
}

/**
 * Une question, un champ. Le rappel de la réponse précédente est un bloc de
 * texte, pas un champ de saisie : une fois quittée, une réponse ne peut plus
 * être modifiée, et deux zones de saisie ne coexistent jamais à l'écran.
 */
export function ItemPage({
  question,
  recall,
  text,
  confidence,
  withConfidence,
  choice,
  onText,
  onConfidence,
  onSubmit,
}: Props) {
  const complete =
    (choice ? choice.some((c) => c.key === text) : text.trim().length > 0) &&
    (!withConfidence || confidence != null);

  return (
    <section className="itempage">
      {recall && (
        <figure className="recall">
          <figcaption>{recall.question}</figcaption>
          <blockquote>{recall.text}</blockquote>
        </figure>
      )}

      {choice ? (
        <>
          <p className="question">{question}</p>
          <div className="choices" role="radiogroup" aria-label={question}>
            {choice.map((c) => (
              <label key={c.key} className={`choice${text === c.key ? " is-on" : ""}`}>
                <input
                  type="radio"
                  name="choice"
                  value={c.key}
                  checked={text === c.key}
                  onChange={() => onText(c.key)}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </>
      ) : (
        <>
          <label className="question" htmlFor="answer">
            {question}
          </label>
          <textarea
            id="answer"
            rows={3}
            autoFocus
            value={text}
            onChange={(e) => onText(e.target.value)}
          />
        </>
      )}

      {withConfidence && (
        <div className="confidence">
          <span className="sub">{scenario.confidencePrompt}</span>
          <Scale
            name="confidence"
            labels={scenario.confidenceScale}
            value={confidence}
            onChange={onConfidence}
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
