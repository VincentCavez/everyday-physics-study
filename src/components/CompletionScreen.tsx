import { useEffect, useState } from "react";
import { completion, errors } from "../config/instructions";
import { studyConfig } from "../config/studyConfig";
import { complete as apiComplete } from "../data/api";
import { flush } from "../data/queue";
import { downloadSession } from "../utils/download";
import { dispatch, getState, useSession } from "../state/store";

/** Vide la file, réclame le code de complétion, puis renvoie vers Prolific. */
export function CompletingScreen() {
  const s = useSession();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await flush();
      if (cancelled) return;
      if (s.is_preview) return void dispatch({ type: "COMPLETED", code: null });
      try {
        const st = getState();
        const res = await apiComplete({
          pid: st.pid,
          session_id: st.session_id,
          row_id: st.row_id,
          is_test: st.is_preview,
        });
        if (!cancelled) dispatch({ type: "COMPLETED", code: res.code ?? null });
      } catch (e) {
        if (!cancelled) {
          dispatch({ type: "SET_STEP", step: "fatal", reason: (e as Error).message });
        }
      }
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
