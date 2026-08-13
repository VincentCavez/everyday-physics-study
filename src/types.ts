export type AxisId =
  | "projection"
  | "oscillation_elasticity"
  | "equilibrium_levers"
  | "friction"
  | "collision";

export type Phase = "survey" | "trial" | "scored" | "check";
export type BlockNo = 1 | 2 | 3;

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
  kind: "catalog" | "distractor" | "none" | "other" | "check";
  label: string;
  concepts: string[];
}

/** Une réponse à un item, telle qu'elle part vers le Sheet. Append-only. */
export interface StudyEvent {
  event_id: string;
  seq: number;
  ts_client: string;
  phase: Phase;
  scene_id: string | null;
  axis: AxisId | null;
  scenario_index: number | null; // 0 = essai, 1..5 = scorées
  block: BlockNo | null;
  item_key: string;
  response_text: string;
  confidence: number | null;
  concepts_json: string;
  concept_order_json: string;
  other_text: string;
  rt_ms: number | null;
  resumed: boolean;
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
  | "fatal";

/** Une réponse en prose, figée au moment de COMMIT_ITEM. */
export interface CommittedItem {
  text: string;
  confidence: number | null;
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
  /** 0 = essai, 1..5 = scorées. */
  scenario_index: number;
  block: BlockNo;
  /**
   * Page courante dans le bloc : 0..n-1 = les items en prose, un par page ;
   * n = la liste de concepts. Invariant : tant que item_index < n, la liste de
   * concepts n'est pas montée.
   */
  item_index: number;
  /** prose figée, clé `${blockKey}.${itemKey}`. */
  committed: Record<string, CommittedItem>;
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
