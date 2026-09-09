import { scenario } from "./instructions";
import { theoriesFor, toolsFor } from "./proposals";
import { hashSeed, seededShuffle } from "../utils/rng";
import type { SceneMeta, StageNo, TheoryCard, ToolCard } from "../types";

/**
 * LE PLAN D'UNE SCÈNE (protocole v2, 2026-09-09).
 *
 * La v1 décrivait le protocole par une TABLE statique (`BLOCKS`), indépendante
 * de la scène. Les stages 2 et 3 sont l'inverse : leur longueur dépend de la
 * scène (n outils, mesuré de 1 à 7) et d'un tirage propre à chaque participant.
 * Une table ne peut pas les exprimer. La liste de pages devient donc une
 * FONCTION PURE de (scène, session).
 *
 * Ce qui NE change pas de la v1, et pour les mêmes raisons qu'alors :
 *  - jamais deux zones de saisie à l'écran, jamais deux questions dans un même
 *    énoncé (Adams et al. 2006) ;
 *  - aucune liste d'options avant que la prose soit verrouillée ;
 *  - les énoncés du stage 1 restent ANCRÉS DANS LA SCÈNE (`prediction`,
 *    `outcome` de scenes.json), non plus pour rester comparable au 04/09 (ces
 *    données sont ignorées) mais pour la raison de fond : « what happens
 *    next ? » est ambigu en échelle de temps, et deux participants y
 *    répondraient à deux questions différentes.
 */

export type Page =
  /** Stage 1, page A. 4 révélations : prédiction, ce qui décide, contrefactuel,
      confiance. */
  | { kind: "own"; stage: 1; key: "t1.own" }
  /** Stage 1, page B. 1 ou 2 révélations : la checklist, puis le classement
      partiel — sauté quand il y a moins de deux options classables. */
  | { kind: "own_concepts"; stage: 1; key: "t1.concepts" }
  /** Stage 2 : une théorie à la fois, sans le moindre compteur à l'écran. */
  | { kind: "theory_rate"; stage: 2; key: string; card: TheoryCard; position: number }
  | { kind: "theory_choice"; stage: 2; key: "t2.choice"; cards: TheoryCard[] }
  /** Stage 3 : un outil par page. 2 révélations (note, puis valeurs), sauf
      pour un outil `range`, qui n'a pas de palette à faire noter. */
  | { kind: "tool_rate"; stage: 3; key: string; tool: ToolCard; position: number }
  | { kind: "tool_wish"; stage: 3; key: "t3.wish" };

/** Le nombre de révélations d'une page, quand il est connu d'avance.
 *  `own_concepts` fait exception : il dépend du nombre d'options cochées, donc
 *  de l'exécution. C'est le COMPOSANT qui tranche, via le champ `advance` de
 *  l'action ; le réducteur, lui, ne fait jamais qu'avancer. */
export function revealsFor(page: Page): number {
  if (page.kind === "own") return 4;
  if (page.kind === "own_concepts") return 2; // maximum, voir ci-dessus
  // TOUJOURS deux temps, même pour un outil `range` : le second révèle ce que
  // l'outil offre (« pas de liste, tu le fais glisser où tu veux ») sans rien
  // faire noter. Fondre les deux en une page pour ces outils-là montrerait les
  // valeurs AVANT la note d'ajustement, et la première note ne porterait plus
  // sur la même chose d'un outil à l'autre.
  if (page.kind === "tool_rate") return 2;
  return 1;
}

/** Les trois énoncés en prose du stage 1, ancrés sur la scène. Dans cet ordre :
    ce qui va se passer, ce qui le décide, ce qu'on changerait. */
export const OWN_ZONES = ["prediction", "what_decides", "free_counterfactual"] as const;

export function ownQuestion(scene: SceneMeta, reveal: number): string {
  if (reveal === 0) return scene.prediction;
  if (reveal === 1) return scenario.items.whatDecides(scene.outcome);
  return scenario.items.freeCounterfactual(scene.outcome);
}

const memo = new Map<string, Page[]>();

/**
 * Le déroulé complet d'une scène, mélangé UNE FOIS pour ce participant.
 *
 * Le mélange des stages 2 et 3 est obligatoire, pas cosmétique : afficher les
 * outils dans l'ordre de rang confondrait la corrélation note × rang avec un
 * effet de position. La graine est `(session_id, scene_id, stage)`, dont les
 * deux premières composantes sont des colonnes du Sheet — l'ordre est donc
 * rejouable à l'analyse. Ceinture et bretelles : chaque event porte de toute
 * façon sa `display_position`.
 */
export function scenePlan(scene: SceneMeta, sessionId: string): Page[] {
  const memoKey = `${sessionId}|${scene.id}`;
  const hit = memo.get(memoKey);
  if (hit) return hit;

  const theories = seededShuffle(theoriesFor(scene.id), hashSeed(sessionId, scene.id, "t2"));
  const tools = seededShuffle(toolsFor(scene.id), hashSeed(sessionId, scene.id, "t3"));

  const pages: Page[] = [
    { kind: "own", stage: 1, key: "t1.own" },
    { kind: "own_concepts", stage: 1, key: "t1.concepts" },
    ...theories.map((card, i): Page => ({ kind: "theory_rate", stage: 2, key: `t2.${i + 1}`, card, position: i + 1 })),
    { kind: "theory_choice", stage: 2, key: "t2.choice", cards: theories },
    ...tools.map((tool, i): Page => ({ kind: "tool_rate", stage: 3, key: `t3.${i + 1}`, tool, position: i + 1 })),
    { kind: "tool_wish", stage: 3, key: "t3.wish" },
  ];
  memo.set(memoKey, pages);
  return pages;
}

/** Le stage d'une page, seule source : il n'est jamais persisté. */
export function stageOf(page: Page): StageNo {
  return page.stage;
}
