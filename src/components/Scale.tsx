interface Props {
  name: string;
  labels: readonly string[];
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}

/**
 * Échelle 1–5 en boutons radio, tous les points libellés. Un libellé « N — mots »
 * est rendu chiffre au-dessus, mots en dessous, pour rester lisible dans des
 * puces étroites ; un libellé sans tiret est rendu tel quel.
 */
export function Scale({ name, labels, value, onChange, disabled }: Props) {
  return (
    <div className="scale" role="radiogroup" aria-label={name}>
      {labels.map((label, i) => {
        const v = i + 1;
        const [num, words] = label.includes(" — ") ? label.split(" — ") : [label, null];
        return (
          <label key={v} className={`scale-item${value === v ? " is-on" : ""}`}>
            <input
              type="radio"
              name={name}
              value={v}
              checked={value === v}
              disabled={disabled}
              onChange={() => onChange(v)}
            />
            <span className="scale-label">
              <strong>{num}</strong>
              {words && <small>{words}</small>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
