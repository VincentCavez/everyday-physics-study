import data from "./proposals.json";
import type { SceneProposals, TheoryCard, ToolCard } from "../types";

/**
 * LE SEUL POINT D'ENTRÉE des composants vers les matériaux des stages 2 et 3.
 *
 * `proposals.json` porte, pour chaque élément, un bloc `provenance` : origine
 * (pipeline / baseline / leurre), rang, concept, scores du balayage. Le
 * participant ne doit JAMAIS en voir la moindre trace — « no hint of origin,
 * count or order ».
 *
 * La provenance est donc retirée À L'EXÉCUTION, pas seulement au type : on
 * reconstruit un objet neuf. Un `Omit` de type seul n'aurait rien empêché à un
 * `JSON.stringify` accidentel, ni à un `console.log` de débogage, ni à un
 * attribut de données recopié en vrac dans le DOM.
 *
 * Corollaire à tenir : aucun composant n'importe `proposals.json`.
 * `tools/check-study.mjs` le vérifie par un grep.
 */

// Cast à travers `unknown` : TypeScript infère du JSON des types littéraux
// (`number[]` là où le type dit `[number, number]`, `string` là où il dit une
// union). Ce fichier est GÉNÉRÉ et vérifié par `tools/check-study.mjs` — c'est
// lui le garde-fou, pas l'inférence structurelle d'un littéral.
const FILE = data as unknown as {
  $meta: { materials_version: string; fake?: boolean };
  scenes: Record<string, SceneProposals>;
};
const SCENES = FILE.scenes;
export const MATERIALS_VERSION = FILE.$meta.materials_version;
export const MATERIALS_ARE_FAKE = FILE.$meta.fake === true;

function sceneOrThrow(sceneId: string): SceneProposals {
  const s = SCENES[sceneId];
  // Une scène sans matériaux est une erreur de GÉNÉRATION, pas un cas d'usage :
  // elle ferait une page vide en pleine passation. `check-study.mjs` doit
  // l'attraper avant, et ce lancer est le filet.
  if (!s) throw new Error(`aucune proposition pour la scène ${sceneId}`);
  return s;
}

/** Les trois théories, provenance retirée. L'ORDRE EST CANONIQUE ici
    (pipeline, baseline, leurre) : c'est `scenePlan` qui mélange. */
export function theoriesFor(sceneId: string): TheoryCard[] {
  return sceneOrThrow(sceneId).theories.map((t) => ({ id: t.id, paragraph: t.paragraph }));
}

/** Les outils du pipeline PUIS le leurre, provenance retirée, dans l'ordre de
    rang. C'est `scenePlan` qui mélange. */
export function toolsFor(sceneId: string): ToolCard[] {
  return sceneOrThrow(sceneId).tools.map((t) => ({
    id: t.id,
    name: t.name,
    gesture: t.gesture,
    values: t.values.kind === "palette" ? { kind: "palette", items: [...t.values.items] } : { kind: "range", sentence: t.values.sentence },
  }));
}

/**
 * LA PROVENANCE POUR LE JOURNAL, et rien d'autre : l'origine et le rang
 * d'origine, deux scalaires.
 *
 * Pourquoi une porte séparée plutôt que rien du tout. Sans elle, `origin` et
 * `orig_rank` resteraient vides dans le Sheet et l'analyse devrait joindre sur
 * `item_id` contre le `proposals.json` de la vague — ce qui marche tant que ce
 * fichier existe encore et n'a pas été régénéré. Une colonne écrite au moment
 * de la réponse ne dépend, elle, de rien.
 *
 * Pourquoi ça ne rouvre pas la fuite : ce que la fuite désigne, c'est montrer
 * au participant quel élément vient du pipeline. Ici il ne sort ni texte, ni
 * libellé, ni rien de rendable — deux scalaires qui vont directement dans le
 * payload d'un event. Ne PAS élargir cette fonction : tout ce qui s'affiche
 * passe par `theoriesFor` / `toolsFor`, qui reconstruisent sans provenance.
 */
export function logMetaFor(sceneId: string, itemId: string): { origin: string; orig_rank: number | null } {
  const s = SCENES[sceneId];
  const th = s?.theories.find((t) => t.id === itemId);
  if (th) return { origin: th.provenance.kind, orig_rank: null };
  const tl = s?.tools.find((t) => t.id === itemId);
  // `lure_tool` plutôt que `lure` : au stage 2 le leurre est une théorie, au
  // stage 3 un outil, et l'analyse les filtre séparément.
  if (tl) return { origin: tl.provenance.kind === "lure" ? "lure_tool" : tl.provenance.kind, orig_rank: tl.provenance.rank };
  return { origin: "", orig_rank: null };
}

/** L'ordre présenté, à enregistrer tel quel dans `options_json`. */
export function shownOrder(items: readonly { id: string }[]): string[] {
  return items.map((i) => i.id);
}
