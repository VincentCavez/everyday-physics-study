export type AxisId =
  | "projection"
  | "oscillation_elasticity"
  | "equilibrium_levers"
  | "friction"
  | "collision";

export type Phase = "survey" | "trial" | "scored" | "check";

/**
 * Les trois STAGES d'une scène (protocole v2, 2026-09-09), qui remplacent les
 * trois BLOCS de la v1 :
 *   1. la théorie du participant (deux zones de prose, une confiance, la liste
 *      de concepts, puis le classement partiel des options cochées) ;
 *   2. la notation de trois théories (pipeline, baseline, leurre) ;
 *   3. la notation des outils générés, plus un leurre.
 */
export type StageNo = 1 | 2 | 3;

export interface DesignRow {
  row_id: number;
  scenes: Record<AxisId, string>;
  scored_order: AxisId[];
  trial: string;
}

export interface SceneMeta {
  id: string;
  axis: AxisId;
  /** Texte affiché au-dessus du croquis, identique pour le modèle. */
  description: string;
  /** Question de prédiction, ancrée sur l'objet et l'issue de cette scène. */
  prediction: string;
  /** La même issue en tournure nominale, insérée dans le contrefactuel libre. */
  outcome: string;
  /** Clause du contrefactuel imposé (bloc 3). */
  imposed: string;
}

export interface ConceptOption {
  key: string;
  /**
   * `unmapped` : l'option reste dans la liste, mais le catalogue a RETIRÉ le
   * concept qu'elle nommait (2.3.8, `released_count`). Elle se rend comme une
   * option ordinaire ; une coche y est simplement non appariée à l'analyse.
   * Les clés d'option ne changent JAMAIS : la vague du 04/09/2026 les a
   * écrites telles quelles dans le Sheet.
   */
  kind: "catalog" | "unmapped" | "distractor" | "none" | "other" | "check";
  label: string;
  concepts: string[];
}

// ─────────────────────────────── propositions notées aux stages 2 et 3 ───
//
// Écrites hors ligne par `tools/gen-proposals.ts` dans `config/proposals.json`,
// versionnées avec l'app. RIEN n'est généré en séance.
//
// `provenance` n'est JAMAIS montrée au participant. Les composants ne lisent
// pas ce fichier : ils passent par `config/proposals.ts`, qui rend des objets
// dont la provenance a été RETIRÉE à l'exécution, pas seulement au type.

export type TheoryKind = "pipeline" | "baseline" | "lure";
export type ToolKind = "pipeline" | "lure";

/** L'origine d'un texte généré, pour pouvoir le rejouer et l'auditer. */
export interface ProposalOrigin {
  model: string;
  prompt_id: string;
  prompt_sha: string;
  temperature: number;
  seed: number | null;
  attempts: number;
  ts: string;
  /** `true` pour les matériaux factices de `--fake` : jamais en passation. */
  fake?: boolean;
}

export interface TheoryProvenance {
  kind: TheoryKind;
  /** Scène d'où vient le CONTENU : identique à `scene_id`, sauf leurre transplanté. */
  source_scene: string;
  /** Décision de Vincent (2026-09-09) : AUCUN rang au stage 2. Toujours null. */
  rank: null;
  /** Le brief déterministe donné au verbaliseur, tel quel : l'audit se fait dessus. */
  brief: VerbalBrief;
  /** pipeline : concept_ids du catalogue · baseline : chaînes libres du modèle ·
      leurre : la clé du distracteur de concepts.json. */
  concept_ids: string[];
  words: number;
  origin: ProposalOrigin;
}

export interface VerbalBrief {
  situation: string;
  /** Le `outcome` de scenes.json, IDENTIQUE pour les trois théories d'une scène :
      sans quoi la note porterait sur le cadrage et non sur l'explication. */
  outcome: string;
  factors: { what: string; where: string }[];
}

export interface ToolProvenance {
  kind: ToolKind;
  source_scene: string;
  /** Rang d'origine à l'étape 3, 1 = tête. Pour un leurre : son rang CHEZ LE DONNEUR. */
  rank: number;
  concept_id: string;
  host_id: string;
  tool_id: string;
  category: string;
  parameter: string;
  mapping_kind: "palette" | "continuous";
  /** 0 pour un mapping continu. */
  n_positions: number;
  /** Le `ControlSpec.label` d'origine : audité, jamais affiché tel quel. */
  spec_label: string;
  score: number;
  sensitivity: number;
  groundability: number;
  demoted: boolean;
  flip_band: [number, number] | null;
  origin: ProposalOrigin;
}

/**
 * Les valeurs d'un outil, révélées au SECOND temps du stage 3.
 * `range` (hôte `position`, 30 % du matériel mesuré) n'a pas de palette à
 * montrer : on affiche une phrase, et l'item « ces options ont-elles du sens »
 * n'est PAS posé. La valeur est manquante par construction, pas par oubli.
 */
export type ToolValues =
  | { kind: "palette"; items: string[] }
  | { kind: "range"; sentence: string };

/** Un élément noté au stage 2 : une théorie en un paragraphe. */
export interface TheoryProposal {
  /** `${scene_id}:th:${kind}`, unique dans tout le corpus. */
  id: string;
  /** LE seul champ montré au participant. */
  paragraph: string;
  provenance: TheoryProvenance;
}

/** Un élément noté au stage 3 : un outil. */
export interface ToolProposal {
  /** `${scene_id}:tl:${rank}` ou `${scene_id}:tl:lure`. */
  id: string;
  name: string;
  /** UNE phrase : le geste et l'hôte. */
  gesture: string;
  values: ToolValues;
  provenance: ToolProvenance;
}

export interface SceneProposals {
  scene_id: string;
  axis: AxisId;
  /** TOUJOURS 3, dans l'ordre canonique pipeline / baseline / leurre. L'app mélange. */
  theories: TheoryProposal[];
  /** Les outils du pipeline en ORDRE DE RANG, puis le leurre en dernier. */
  tools: ToolProposal[];
  /** Recopié pour l'analyse : toujours === tools[0].id. */
  pipeline_top1: string;
}

/** Une carte telle que la voit un composant : sans provenance. */
export type Display<T> = Omit<T, "provenance">;
export type TheoryCard = Display<TheoryProposal>;
export type ToolCard = Display<ToolProposal>;

// ──────────────────────────────────────────────────────── journalisation ───

/**
 * Une réponse à un item, telle qu'elle part vers le Sheet. Append-only, et
 * l'ORDRE DES CHAMPS EST L'ORDRE DES COLONNES : `appendEvents_` de Code.gs
 * écrit positionnellement. Un champ ne s'insère jamais au milieu.
 */
export interface StudyEvent {
  event_id: string;
  seq: number;
  ts_client: string;
  phase: Phase;
  scene_id: string | null;
  axis: AxisId | null;
  scenario_index: number | null; // 0 = essai, 1..5 = scorées
  /** Colonne 11, ex-`block`. Même position, sens nouveau. */
  stage: StageNo | null;
  item_key: string;
  response_text: string;
  /**
   * L'échelle 1-5 du QUESTIONNAIRE, et elle seule. Toute note 0-10 va dans
   * `rating`. Sans cette séparation, la colonne mélangerait deux échelles et
   * chaque moyenne serait un piège.
   */
  confidence: number | null;
  concepts_json: string;
  concept_order_json: string;
  other_text: string;
  rt_ms: number | null;
  resumed: boolean;

  // ── colonnes 22 et suivantes (protocole v2) ──────────────────────────────
  /** Identité de l'objet noté : id de théorie, id d'outil, ou clé d'option
      pour `concept_rank`. Vide pour la prose. */
  item_id: string;
  /** `pipeline` · `baseline` · `lure` · `lure_tool`. Vide ailleurs. */
  origin: string;
  /** Rang d'origine de l'outil dans le balayage. Vide au stage 2. */
  orig_rank: number | null;
  /** Position AFFICHÉE, 1-based. Pour `concept_rank` : la position de l'option
      dans la checklist mélangée, d'où se lit le biais de position. */
  display_position: number | null;
  /** Toute note 0-10. */
  rating: number | null;
  /** Ce qui était à l'écran, dans l'ordre : les trois ids du choix forcé, les
      libellés de valeurs révélés. */
  options_json: string;
  /** ISO de l'instant d'AFFICHAGE de l'item. Couplé à `ts_client`, il donne le
      verrouillage de chaque zone de prose, l'ouverture de la checklist et la
      latence affichage → clic, auditable même quand `rt_ms` est suspect. */
  ts_shown: string | null;
  protocol_version: string;
  /** Rang donné par le participant, 1 = plus influent. VIDE si non classé
      (moins de deux options classables : il n'y a alors rien à ordonner). */
  rank: number | null;
  /** Position de l'option dans l'ordre de COCHE, 1-based. À ne pas confondre
      avec `display_position`, qui est l'ordre d'affichage de la liste. */
  tick_order: number | null;
  /** 1 si le participant a DÉPLACÉ cette option. La tête élue vaut toujours 1.
      Sans ce drapeau, un classement jamais touché (donc l'ordre de coche, donc
      l'ordre d'affichage mélangé) serait indiscernable d'un jugement. */
  rank_touched: boolean | null;
}

export type Step =
  | "boot"
  | "gate"
  | "consent"
  | "instructions"
  | "scenario"
  | "self_assess"
  | "completing"
  | "done"
  | "full"
  | "closed"
  | "nocode"
  | "fatal";

/**
 * Une réponse figée au moment de COMMIT_ANSWER. Le gel est structurel : une
 * zone verrouillée relit son texte ICI, jamais dans `drafts`, et c'est ce qui
 * la fait survivre à un rafraîchissement sans une ligne de code de plus.
 */
export interface CommittedAnswer {
  text: string;
  /** Note 0-10 quand l'item en porte une. */
  rating: number | null;
}

/** Une sélection de concepts validée (COMMIT_CONCEPTS) : clés cochées + texte libre.
    `keys` est dans l'ORDRE DE COCHE, pas dans l'ordre d'affichage : c'est cet
    ordre-là que le classement pré-remplit, et il part au Sheet en `tick_order`. */
export interface CommittedConcepts {
  keys: string[];
  other: string;
}

export interface SessionState {
  version: number;
  session_id: string;
  pid: string;
  prolific_study_id: string;
  prolific_session_id: string;
  is_preview: boolean;
  row_id: number | null;
  completion_code: string | null;
  step: Step;
  /**
   * LE CURSEUR, en trois entiers. Invariant structurel : le triplet
   * `(scenario_index, page_index, reveal)` est LEXICOGRAPHIQUEMENT STRICTEMENT
   * CROISSANT à chaque validation, et il est persisté. Une réponse quittée est
   * donc figée, y compris après un rafraîchissement.
   *
   * `stage` n'est PAS ici : il se lit sur `scenePlan(scene)[page_index].stage`.
   * Deux sources de vérité pour « où on en est » finissent toujours par
   * diverger — c'est ce que rendait possible l'ancien couple `block` +
   * `blocksFor`.
   *
   * `scenario_index` : 0 = essai, 1..5 = scorées.
   */
  scenario_index: number;
  /** Index dans `scenePlan(scene)`. */
  page_index: number;
  /** Sous-étape monotone DANS la page : la zone 2 qui apparaît, les valeurs
      d'un outil qui se dévoilent, le classement qui suit la checklist. */
  reveal: number;
  /** Réponses figées, clé `${sceneKey}.${page.key}[.${sous-item}]`. */
  committed: Record<string, CommittedAnswer>;
  /** Sélection de concepts validée, une par scène, clé `${sceneKey}`. */
  concepts: Record<string, CommittedConcepts>;
  /** brouillons de saisie (survivent au rafraîchissement). */
  drafts: Record<string, string | number>;
  /** horodatage d'affichage par item, pour les temps de réponse. */
  shown_at: Record<string, number>;
  queue: StudyEvent[];
  seq: number;
  /** vrai après une reprise, jusqu'au prochain item : marque les RT douteux. */
  resumed: boolean;
  fatal_reason: string | null;
}
