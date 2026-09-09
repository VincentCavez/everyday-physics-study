import designData from "../config/design.json";
import scenesData from "../config/scenes.json";
import { studyConfig } from "../config/studyConfig";
import { scenePlan, type Page } from "../config/protocol";
import { VERSION } from "./persistence";
import type {
  AxisId,
  CommittedConcepts,
  DesignRow,
  SceneMeta,
  SessionState,
  StageNo,
  StudyEvent,
} from "../types";

export const DESIGN_ROWS = designData.rows as unknown as DesignRow[];
export const SCENES = scenesData.scenes as unknown as SceneMeta[];
const SCENE_BY_ID = new Map(SCENES.map((s) => [s.id, s]));

export function sceneById(id: string): SceneMeta {
  const s = SCENE_BY_ID.get(id);
  if (!s) throw new Error(`scène inconnue : ${id}`);
  return s;
}

export function rowById(rowId: number): DesignRow {
  const r = DESIGN_ROWS.find((x) => x.row_id === rowId);
  if (!r) throw new Error(`design row inconnue : ${rowId}`);
  return r;
}

/** Scène courante : index 0 = essai, 1..5 = scorées dans l'ordre de la row. */
export function currentScene(state: SessionState): SceneMeta | null {
  if (state.row_id == null) return null;
  const row = rowById(state.row_id);
  if (state.scenario_index === 0) return sceneById(row.trial);
  const axis: AxisId | undefined = row.scored_order[state.scenario_index - 1];
  return axis ? sceneById(row.scenes[axis]) : null;
}

/** Clé de scène, préfixe des brouillons, horodatages et réponses figées. */
export function sceneKey(scenarioIndex: number): string {
  return `s${scenarioIndex}`;
}

/** Le plan de la scène courante. Mémoïsé dans `scenePlan`. */
export function currentPlan(state: SessionState): Page[] {
  const scene = currentScene(state);
  return scene ? scenePlan(scene, state.session_id) : [];
}

export function currentPage(state: SessionState): Page | null {
  return currentPlan(state)[state.page_index] ?? null;
}

/** Le stage courant. Il n'est JAMAIS persisté : il se lit sur le plan, donc il
    ne peut pas diverger du curseur. */
export function currentStage(state: SessionState): StageNo | null {
  return currentPage(state)?.stage ?? null;
}

export function initialState(
  seed: Partial<SessionState> & Pick<SessionState, "session_id" | "pid">,
): SessionState {
  return {
    version: VERSION,
    prolific_study_id: "",
    prolific_session_id: "",
    is_preview: false,
    row_id: null,
    completion_code: null,
    step: "boot",
    scenario_index: 0,
    page_index: 0,
    reveal: 0,
    committed: {},
    concepts: {},
    drafts: {},
    shown_at: {},
    queue: [],
    seq: 0,
    resumed: false,
    fatal_reason: null,
    ...seed,
  };
}

export type Action =
  | { type: "SET_STEP"; step: SessionState["step"]; reason?: string }
  | { type: "ASSIGNED"; row_id: number }
  | { type: "SET_DRAFT"; key: string; value: string | number }
  | { type: "MARK_SHOWN"; key: string }
  | { type: "ENQUEUE"; events: StudyEvent[] }
  | { type: "DEQUEUE"; upToSeq: number }
  /**
   * Fige une réponse et avance d'un cran. `advance` dit lequel : la révélation
   * suivante DANS la page, ou la page suivante. C'est le composant qui tranche,
   * parce que le nombre de révélations d'une page de checklist dépend du
   * nombre d'options cochées, connu seulement à l'exécution.
   */
  | { type: "COMMIT_ANSWER"; key: string; text: string; rating: number | null; advance: "reveal" | "page" }
  | { type: "COMMIT_CONCEPTS"; selection: CommittedConcepts; advance: "reveal" | "page" }
  | { type: "COMPLETED"; code: string | null }
  | { type: "CLEAR_RESUMED" };

/**
 * Réducteur pur. Deux propriétés y sont structurelles, pas cosmétiques :
 *
 *  - le triplet `(scenario_index, page_index, reveal)` est LEXICOGRAPHIQUEMENT
 *    STRICTEMENT CROISSANT à chaque validation. Aucune action ne le fait
 *    reculer, et il fait partie de l'état persisté : une réponse quittée est
 *    donc figée, y compris après un rafraîchissement de page, et aucune liste
 *    d'options ne peut être montée avant que la prose qui la précède soit
 *    verrouillée.
 *  - `committed` est APPEND-ONLY : réécrire une clé déjà posée est un no-op.
 *    En v1 le gel reposait entièrement sur l'avancée du curseur ; avec des
 *    révélations à l'intérieur d'une page, il vaut mieux qu'il soit une
 *    propriété du dictionnaire lui-même. Ça protège aussi du double-clic.
 */
export function reduce(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, fatal_reason: action.reason ?? state.fatal_reason };

    case "ASSIGNED":
      // Une attribution réussie efface la trace d'un échec précédent.
      return { ...state, row_id: action.row_id, fatal_reason: null };

    case "SET_DRAFT":
      return { ...state, drafts: { ...state.drafts, [action.key]: action.value } };

    case "MARK_SHOWN":
      if (state.shown_at[action.key] != null) return state;
      return { ...state, shown_at: { ...state.shown_at, [action.key]: Date.now() } };

    case "ENQUEUE":
      return {
        ...state,
        queue: [...state.queue, ...action.events],
        seq: state.seq + action.events.length,
        resumed: false,
      };

    case "DEQUEUE":
      return { ...state, queue: state.queue.filter((e) => e.seq > action.upToSeq) };

    case "COMMIT_ANSWER": {
      if (state.committed[action.key] !== undefined) return state; // append-only
      const committed = { ...state.committed, [action.key]: { text: action.text, rating: action.rating } };
      return advance({ ...state, committed }, action.advance);
    }

    case "COMMIT_CONCEPTS": {
      const concepts = { ...state.concepts, [sceneKey(state.scenario_index)]: action.selection };
      return advance({ ...state, concepts }, action.advance);
    }

    case "COMPLETED":
      return { ...state, step: "done", completion_code: action.code };

    case "CLEAR_RESUMED":
      return { ...state, resumed: false };

    default:
      return state;
  }
}

/**
 * Le seul endroit qui fait bouger le curseur. `reveal` avance dans la page ;
 * `page` passe à la page suivante, puis à la scène suivante, puis au
 * questionnaire. Les brouillons sont vidés à chaque changement de page : ils
 * sont clés par page, un reliquat n'irait nulle part mais encombrerait l'état
 * persisté d'une session à rallonge.
 */
function advance(state: SessionState, how: "reveal" | "page"): SessionState {
  if (how === "reveal") return { ...state, reveal: state.reveal + 1 };

  const next = state.page_index + 1;
  if (next < currentPlan(state).length) {
    return { ...state, page_index: next, reveal: 0, drafts: {} };
  }
  // Dernière page de la scène : scène suivante, ou fin du parcours. Le
  // questionnaire clôt la session (il est à la FIN, pas au début : demander son
  // expertise à quelqu'un avant la tâche le met en mode examen, l'inverse de
  // l'intuition de première réaction que l'étude cherche).
  if (state.scenario_index >= studyConfig.scoredCount) {
    return { ...state, drafts: {}, page_index: 0, reveal: 0, step: "self_assess" };
  }
  return { ...state, scenario_index: state.scenario_index + 1, page_index: 0, reveal: 0, drafts: {} };
}
