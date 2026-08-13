import { useState } from "react";
import { consent, errors } from "../config/instructions";
import { dispatch } from "../state/store";
import { useSession } from "../state/store";

export function ConsentScreen() {
  const s = useSession();
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="page">
      {s.is_preview && <p className="notice">{errors.previewNotice}</p>}
      <h1>{consent.title}</h1>
      {consent.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <label className="check">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>{consent.checkbox}</span>
      </label>
      <button
        className="primary"
        disabled={!agreed}
        onClick={() => dispatch({ type: "SET_STEP", step: "instructions" })}
      >
        {consent.button}
      </button>
    </main>
  );
}
