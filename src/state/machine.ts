import designData from "../config/design.json";
import scenesData from "../config/scenes.json";
import { studyConfig } from "../config/studyConfig";
import { BLOCKS, BLOCK_ORDER, type ProseItem } from "../config/protocol";
import type { AxisId, BlockNo, DesignRow, SceneMeta, SessionState, StudyEvent } from "../types";

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

/** Le bloc 2 peut être restreint à une seule scène (§ Optional variants). */
export function blocksFor(scenarioIndex: number): BlockNo[] {
  const only = studyConfig.variants.freeCounterfactualOnScenario;
  if (only == null || scenarioIndex === 0 || scenarioIndex === only) return BLOCK_ORDER;
  return BLOCK_ORDER.filter((b) => b !== 2);
}

export function initialState(seed: Partial<SessionState> & Pick<SessionState, "session_id" | "pid">): SessionState {
  return {
    version: 1,
    prolific_study_id: "",
    prolific_session_id: "",
    is_preview: false,
    row_id: null,
    completion_code: null,
    step: "boot",
    scenario_index: 0,
    block: 1,
    item_index: 0,
    committed: {},
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
  | { type: "COMMIT_ITEM"; itemKey: string; text: string; confidence: number | null }
  | { type: "COMMIT_CONCEPTS" }
  | { type: "COMPLETED"; code: string | null }
  | { type: "CLEAR_RESUMED" };

/**
 * Réducteur pur. Deux propriétés y sont structurelles, pas cosmétiques :
 *  - aucune action ne fait reculer le curseur (item_index, block,
 *    scenario_index n'augmentent jamais que d'un cran). Une réponse quittée est
 *    donc figée, et la liste de concepts ne peut pas contaminer la prose.
 *  - le curseur fait partie de l'état persisté, donc l'invariant survit à un
 *    rafraîchissement de page.
 */
export function reduce(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, fatal_reason: action.reason ?? state.fatal_reason };

    case "ASSIGNED":
      return { ...state, row_id: action.row_id };

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

    case "COMMIT_ITEM":
      return {
        ...state,
        item_index: state.item_index + 1,
        committed: {
          ...state.committed,
          [`${blockKey(state.scenario_index, state.block)}.${action.itemKey}`]: {
            text: action.text,
            confidence: action.confidence,
          },
        },
      };

    case "COMMIT_CONCEPTS": {
      const blocks = blocksFor(state.scenario_index);
      const nextBlock = blocks[blocks.indexOf(state.block) + 1];
      if (nextBlock) {
        return { ...state, block: nextBlock, item_index: 0, drafts: {} };
      }
      // Dernier bloc de la scène : scène suivante, ou fin du parcours. Le
      // questionnaire clôt la session (§ Pre-task self-assessment, variante de
      // fin retenue pour ne pas amorcer les participants).
      if (state.scenario_index >= studyConfig.scoredCount) {
        return { ...state, drafts: {}, block: 1, item_index: 0, step: "self_assess" };
      }
      const next = state.scenario_index + 1;
      return {
        ...state,
        scenario_index: next,
        block: blocksFor(next)[0],
        item_index: 0,
        drafts: {},
      };
    }

    case "COMPLETED":
      return { ...state, step: "done", completion_code: action.code };

    case "CLEAR_RESUMED":
      return { ...state, resumed: false };

    default:
      return state;
  }
}

/** Clé de bloc, préfixe des brouillons, horodatages et prose figée. */
export function blockKey(scenarioIndex: number, block: BlockNo): string {
  return `s${scenarioIndex}b${block}`;
}

/** Item en prose de la page courante, ou null sur la page de concepts. */
export function currentItem(state: SessionState): ProseItem | null {
  return BLOCKS[state.block].items[state.item_index] ?? null;
}
