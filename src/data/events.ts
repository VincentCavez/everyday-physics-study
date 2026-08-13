import { uuid } from "../utils/rng";
import { getState } from "../state/store";
import type { AxisId, BlockNo, Phase, StudyEvent } from "../types";

export interface EventInput {
  phase: Phase;
  item_key: string;
  scene_id?: string | null;
  axis?: AxisId | null;
  scenario_index?: number | null;
  block?: BlockNo | null;
  response_text?: string;
  confidence?: number | null;
  concepts?: string[];
  concept_order?: string[];
  other_text?: string;
  rt_ms?: number | null;
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
    block: e.block ?? null,
    item_key: e.item_key,
    response_text: e.response_text ?? "",
    confidence: e.confidence ?? null,
    concepts_json: e.concepts ? JSON.stringify(e.concepts) : "",
    concept_order_json: e.concept_order ? JSON.stringify(e.concept_order) : "",
    other_text: e.other_text ?? "",
    rt_ms: e.rt_ms ?? null,
    resumed: base.resumed,
  }));
}
