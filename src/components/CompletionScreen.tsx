import { useEffect, useState } from "react";
import { completion, errors } from "../config/instructions";
import { studyConfig } from "../config/studyConfig";
import { complete as apiComplete } from "../data/api";
import { flush } from "../data/queue";
import { downloadSession } from "../utils/download";
import { dispatch, getState, useSession } from "../state/store";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Vide la file, réclame le code de complétion, puis renvoie vers Prolific.
 * Le 04/09/2026, trois participants sur six ont vu l'écran d'échec alors que
 * leurs réponses et leur complétion étaient bien enregistrées : le serveur,
 * saturé, avait exécuté l'appel mais la réponse n'était pas revenue. D'où les
 * réessais ici (un « busy » du verrou serveur compte comme un échec à
 * réessayer), et deux écrans distincts selon que la file est vide (réponses
 * sauvées, code manquant) ou non (réponses en attente sur l'appareil).
 */
export function CompletingScreen() {
  const s = useSession();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (s.is_preview) {
        await flush();
        if (!cancelled) dispatch({ type: "COMPLETED", code: null });
        return;
      }
      let lastError = "";
      for (let attempt = 0; attempt <= studyConfig.network.maxRetries && !cancelled; attempt++) {
        const flushed = await flush();
        if (cancelled) return;
        if (flushed) {
          try {
            const st = getState();
            const res = await apiComplete({
              pid: st.pid,
              session_id: st.session_id,
              row_id: st.row_id,
              is_test: st.is_preview,
            });
            if (res.code) {
              if (!cancelled) dispatch({ type: "COMPLETED", code: res.code });
              return;
            }
            lastError = res.error ?? "no completion code returned";
          } catch (e) {
            lastError = (e as Error).message;
          }
        } else {
          lastError = "answers still queued on this device";
        }
        await sleep(
          Math.min(studyConfig.network.backoffBaseMs * 2 ** attempt, studyConfig.network.backoffMaxMs),
        );
      }
      if (cancelled) return;
      const queued = getState().queue.length;
      dispatch({ type: "SET_STEP", step: queued ? "fatal" : "nocode", reason: lastError });
    })();
    return () => {
      cancelled = true;
    };
  }, [s.is_preview]);

  return (
    <main className="page">
      <h1>{completion.title}</h1>
      <p>Saving your answers…</p>
    </main>
  );
}

export function DoneScreen() {
  const s = useSession();
  const [left, setLeft] = useState(studyConfig.redirectDelaySeconds);
  const url = s.completion_code
    ? `${studyConfig.prolificCompleteUrl}?cc=${encodeURIComponent(s.completion_code)}`
    : null;

  useEffect(() => {
    if (!url || left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [url, left]);

  useEffect(() => {
    if (url && left <= 0) location.href = url;
  }, [url, left]);

  return (
    <main className="page">
      <h1>{completion.title}</h1>
      <p>{completion.body}</p>
      {s.is_preview ? (
        <p className="notice">{errors.previewNotice}</p>
      ) : (
        <>
          <p className="code">
            {completion.codeLabel} <strong>{s.completion_code ?? "—"}</strong>
          </p>
          {url && (
            <>
              <p>
                {completion.redirect} ({left}s)
              </p>
              <p className="sub">{completion.manual}</p>
              <a className="primary" href={url}>
                {completion.button}
              </a>
            </>
          )}
        </>
      )}
      <button className="ghost" onClick={() => downloadSession(s)}>
        {errors.downloadButton}
      </button>
    </main>
  );
}
