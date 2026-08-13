import { studyConfig } from "../config/studyConfig";
import { dispatch, getState } from "../state/store";
import { sendEvents } from "./api";
import { makeEvents, type EventInput } from "./events";

/**
 * File d'envoi persistée. Les events sont enfilés dans l'état (donc écrits dans
 * localStorage) AVANT tout appel réseau : une coupure, un onglet fermé ou un
 * bloqueur de publicité ne peuvent pas faire perdre une réponse, seulement en
 * retarder l'envoi. Les doublons éventuels (réessai après une réponse perdue)
 * sont dédupliqués à l'analyse via event_id.
 */

let flushing = false;
let failures = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const watchers = new Set<(failures: number) => void>();

export function onQueueTrouble(fn: (failures: number) => void): () => void {
  watchers.add(fn);
  return () => watchers.delete(fn);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Enfile des réponses et déclenche un envoi groupé. */
export function record(inputs: EventInput[]): void {
  if (!inputs.length) return;
  dispatch({ type: "ENQUEUE", events: makeEvents(inputs) });
  scheduleFlush();
}

export function scheduleFlush(delay = studyConfig.network.flushDebounceMs): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), delay);
}

/** Vide la file. Renvoie true si tout est parti. */
export async function flush(): Promise<boolean> {
  if (flushing) return false;
  const s = getState();
  if (!s.queue.length) return true;
  if (s.is_preview) {
    // En prévisualisation on ne touche pas au Sheet, mais on vide la file pour
    // que le parcours se comporte exactement comme en conditions réelles.
    dispatch({ type: "DEQUEUE", upToSeq: s.queue[s.queue.length - 1].seq });
    return true;
  }

  flushing = true;
  try {
    for (let attempt = 0; attempt <= studyConfig.network.maxRetries; attempt++) {
      const batch = getState().queue;
      if (!batch.length) return true;
      try {
        const meta = getState();
        const res = await sendEvents(
          { pid: meta.pid, session_id: meta.session_id, row_id: meta.row_id, is_test: meta.is_preview },
          batch,
        );
        if (res.error) throw new Error(res.error);
        dispatch({ type: "DEQUEUE", upToSeq: batch[batch.length - 1].seq });
        failures = 0;
        watchers.forEach((w) => w(0));
        return true;
      } catch {
        failures++;
        watchers.forEach((w) => w(failures));
        const wait = Math.min(
          studyConfig.network.backoffBaseMs * 2 ** attempt,
          studyConfig.network.backoffMaxMs,
        );
        await sleep(wait);
      }
    }
    return false;
  } finally {
    flushing = false;
  }
}

export function queueFailures(): number {
  return failures;
}
