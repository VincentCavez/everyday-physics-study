import { scenario } from "./instructions";
import type { BlockNo, SceneMeta } from "../types";

/**
 * Le protocole d'élicitation, en dur : trois blocs par scène, dans un ordre
 * fixe. Chaque item en prose occupe sa propre page — jamais deux champs de
 * saisie à l'écran, et jamais deux questions dans un même énoncé — et la liste
 * de concepts d'un bloc n'apparaît qu'après la dernière de ces pages
 * (§ Elicitation protocol). Six confiances par scène, attachées aux seuls items
 * en prose.
 *
 * Les énoncés sont calculés à partir de la scène : voir le commentaire de
 * `scenario.items` dans instructions.ts pour le pourquoi.
 */
export interface ProseItem {
  key: string;
  question: (scene: SceneMeta) => string;
  confidence: boolean;
  /** item dont cette page demande la justification : sa réponse est rappelée */
  explains?: string;
  /**
   * Choix FORCÉ (2026-09-04) : la page propose ces options au lieu d'un champ
   * de texte ; la clé choisie est enregistrée en `response_text`. Un seul
   * item en fait usage, la direction du bloc 3, pour que la comparaison avec
   * la prédiction du bloc 1 (plus, moins, pareil, autre chose) ne dépende
   * plus d'un codage manuel du texte libre.
   */
  choice?: readonly { key: string; label: string }[];
  /** rappel d'une réponse d'un AUTRE bloc de la même scène (la prédiction du bloc 1) */
  recallFrom?: { block: BlockNo; key: string };
}

export const BLOCKS: Record<BlockNo, { title: string; items: ProseItem[] }> = {
  1: {
    title: scenario.blockTitles[1],
    items: [
      { key: "prediction", question: (s) => s.prediction, confidence: true },
      {
        key: "explanation",
        question: () => scenario.items.explanation,
        confidence: true,
        explains: "prediction",
      },
    ],
  },
  2: {
    title: scenario.blockTitles[2],
    items: [
      {
        key: "free_counterfactual",
        question: (s) => scenario.items.freeCounterfactual(s.outcome),
        confidence: true,
      },
      {
        key: "free_explanation",
        question: () => scenario.items.freeExplanation,
        confidence: true,
        explains: "free_counterfactual",
      },
    ],
  },
  3: {
    title: scenario.blockTitles[3],
    items: [
      {
        key: "imposed_counterfactual",
        question: (s) => scenario.items.imposed(s.imposed, s.prediction),
        confidence: true,
      },
      {
        key: "imposed_explanation",
        question: () => scenario.items.imposedExplanation,
        confidence: true,
        explains: "imposed_counterfactual",
      },
      {
        key: "imposed_direction",
        question: (s) => scenario.items.imposedDirection(s.outcome),
        confidence: false,
        choice: scenario.directionChoices,
        recallFrom: { block: 1, key: "prediction" },
      },
    ],
  },
};

export const BLOCK_ORDER: BlockNo[] = [1, 2, 3];
