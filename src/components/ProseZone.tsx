interface Props {
  question: string;
  value: string;
  onChange: (v: string) => void;
  /**
   * Verrouillée : la réponse reste À L'ÉCRAN, mais en CITATION et non en champ
   * de saisie. Deux raisons, et la seconde est la vraie.
   *
   * D'abord la place : trois zones en `textarea` de trois lignes plus la
   * confiance ne tiennent pas dans la grille sans défilement au plus petit
   * gabarit accepté (1000×620) — mesuré, 106 px de débordement, bouton
   * `Continue` hors de l'écran. Une citation prend deux lignes au lieu de six.
   *
   * Ensuite le sens : un champ grisé se lit comme un champ momentanément
   * désactivé, donc comme quelque chose qu'on pourra rouvrir. Une citation dit
   * ce qui est vrai — la réponse est donnée, elle ne se reprend pas. Le texte
   * vient de `committed`, jamais de `drafts`, et c'est ce qui fait survivre le
   * verrou à un rafraîchissement sans une ligne de code de plus.
   */
  locked?: boolean;
  /** Une seule ligne (le champ libre de fin de stage 3). */
  single?: boolean;
  autoFocus?: boolean;
  id: string;
}

/**
 * Une question, une zone de texte. Ex-`ItemPage`, réduit à sa part
 * présentationnelle : le contrat « une question, un champ, une soumission, puis
 * le composant est détruit » ne survivait pas aux pages du protocole v2, où
 * plusieurs zones coexistent dont toutes sauf une sont verrouillées.
 */
export function ProseZone({ question, value, onChange, locked, single, autoFocus, id }: Props) {
  if (locked) {
    return (
      <figure className="recall">
        <figcaption>{question}</figcaption>
        <blockquote>{value}</blockquote>
      </figure>
    );
  }
  return (
    <div className="prosezone">
      <label className="question" htmlFor={id}>
        {question}
      </label>
      <textarea
        id={id}
        rows={single ? 1 : 3}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
