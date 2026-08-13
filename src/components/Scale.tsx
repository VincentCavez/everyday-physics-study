interface Props {
  name: string;
  labels: readonly string[];
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}

/** Échelle 1–5 en boutons radio, points extrêmes libellés. */
export function Scale({ name, labels, value, onChange, disabled }: Props) {
  return (
    <div className="scale" role="radiogroup" aria-label={name}>
      {labels.map((label, i) => {
        const v = i + 1;
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
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );
}
