/**
 * L'ÉCHELLE, une seule pour toute la session.
 *
 * Deux formes, en union discriminée plutôt qu'en props optionnelles qui
 * pourraient se contredire :
 *  - `labelled` : la 1-5 du questionnaire final, tous les points libellés.
 *    Rendu strictement inchangé depuis la v1.
 *  - `anchored` : la 0-10 du protocole v2. Onze boutons discrets, ancres
 *    textuelles aux DEUX EXTRÉMITÉS SEULEMENT, aucun libellé au milieu.
 *
 * Trois choix à ne pas défaire :
 *  - AUCUNE VALEUR PAR DÉFAUT (`value: null`), et l'avancement est bloqué tant
 *    que rien n'est cliqué. Sur des échelles d'une dizaine de points, l'absence
 *    de défaut ne dégrade pas le taux de non-réponse, alors qu'un défaut
 *    fabrique des réponses que personne n'a données.
 *  - DES BOUTONS, pas une poignée à faire glisser : les curseurs augmentent les
 *    abandons, les boutons discrets non.
 *  - L'`<input type="radio">` reste dans le DOM, seulement masqué à l'œil : le
 *    groupe reste navigable aux flèches et lisible par un lecteur d'écran. Le
 *    libellé EST le bouton.
 */

export type ScaleSpec =
  | { kind: "labelled"; labels: readonly string[] }
  | { kind: "anchored"; from: number; to: number; low: string; high: string };

interface Props {
  name: string;
  spec: ScaleSpec;
  value: number | null;
  onChange: (v: number) => void;
  /** Stage 3 : la première note reste VISIBLE et lisible, mais verrouillée,
      une fois les valeurs révélées. */
  disabled?: boolean;
}

export function Scale({ name, spec, value, onChange, disabled }: Props) {
  if (spec.kind === "labelled") {
    return (
      <div className="scale" role="radiogroup" aria-label={name}>
        {spec.labels.map((label, i) => {
          const v = i + 1;
          // Un libellé « N — mots » est rendu chiffre au-dessus, mots en
          // dessous, pour rester lisible dans des puces étroites ; un libellé
          // sans tiret est rendu tel quel.
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

  const points = Array.from({ length: spec.to - spec.from + 1 }, (_, i) => spec.from + i);
  return (
    <div className="scale-wrap">
      <div className="scale scale--points" role="radiogroup" aria-label={name}>
        {points.map((v) => (
          <label key={v} className={`scale-item${value === v ? " is-on" : ""}`}>
            <input
              type="radio"
              name={name}
              value={v}
              checked={value === v}
              disabled={disabled}
              onChange={() => onChange(v)}
              aria-label={v === spec.from ? `${v} — ${spec.low}` : v === spec.to ? `${v} — ${spec.high}` : String(v)}
            />
            <span className="scale-label">
              <strong>{v}</strong>
            </span>
          </label>
        ))}
      </div>
      <div className="scale-anchors">
        <span>{spec.low}</span>
        <span>{spec.high}</span>
      </div>
    </div>
  );
}
