import { uuid } from "../utils/rng";
import { getState } from "../state/store";
import { MATERIALS_VERSION } from "../config/proposals";
import type { AxisId, Phase, StageNo, StudyEvent } from "../types";

/** La version du PROTOCOLE et des MATÉRIAUX, sur chaque ligne. Deux vagues qui
    coexisteraient dans un même onglet se lisent alors d'un coup d'œil, et un
    `proposals.json` changé en cours de vague ne peut pas passer inaperçu. */
export const PROTOCOL_VERSION = `v2/${MATERIALS_VERSION}`;

export interface EventInput {
  phase: Phase;
  item_key: string;
  scene_id?: string | null;
  axis?: AxisId | null;
  scenario_index?: number | null;
  stage?: StageNo | null;
  response_text?: string;
  /** L'échelle 1-5 du questionnaire, et elle seule. */
  confidence?: number | null;
  concepts?: string[];
  concept_order?: string[];
  other_text?: string;
  rt_ms?: number | null;
  item_id?: string;
  origin?: string;
  orig_rank?: number | null;
  display_position?: number | null;
  /** Toute note 0-10. */
  rating?: number | null;
  options?: string[];
  ts_shown?: number | null;
  rank?: number | null;
  tick_order?: number | null;
  rank_touched?: boolean | null;
}

/** Construit les events d'une soumission. `seq` est attribué à l'enfilage. */
export function makeEvents(inputs: EventInput[]): StudyEvent[] {
  const base = getState();
  return inputs.map((e, i) => ({
    event_id: uuid(),
    seq: base.seq + i + 1,
    ts_client: new Date().toISOString(),
    phase: e.phase,
    scene_id: e.scene_id ?? null,
    axis: e.axis ?? null,
    scenario_index: e.scenario_index ?? null,
    stage: e.stage ?? null,
    item_key: e.item_key,
    response_text: e.response_text ?? "",
    confidence: e.confidence ?? null,
    concepts_json: e.concepts ? JSON.stringify(e.concepts) : "",
    concept_order_json: e.concept_order ? JSON.stringify(e.concept_order) : "",
    other_text: e.other_text ?? "",
    rt_ms: e.rt_ms ?? null,
    resumed: base.resumed,
    item_id: e.item_id ?? "",
    origin: e.origin ?? "",
    orig_rank: e.orig_rank ?? null,
    display_position: e.display_position ?? null,
    rating: e.rating ?? null,
    options_json: e.options ? JSON.stringify(e.options) : "",
    ts_shown: e.ts_shown != null ? new Date(e.ts_shown).toISOString() : null,
    protocol_version: PROTOCOL_VERSION,
    rank: e.rank ?? null,
    tick_order: e.tick_order ?? null,
    rank_touched: e.rank_touched ?? null,
  }));
}
