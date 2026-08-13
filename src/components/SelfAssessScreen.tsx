import { useState } from "react";
import { AXIS_LABELS, selfAssessment } from "../config/instructions";
import { studyConfig } from "../config/studyConfig";
import { record } from "../data/queue";
import { rtFor, useShown } from "../hooks/useRt";
import { dispatch } from "../state/store";
import type { AxisId } from "../types";
import { Scale } from "./Scale";

const AXES = Object.keys(AXIS_LABELS) as AxisId[];
const ac = studyConfig.attentionChecks.likert;

/**
 * Auto-évaluation, posée en toute fin de session (§ Pre-task self-assessment,
 * « priming caveat ») : une familiarité par axe, la confiance globale, le
 * niveau d'enseignement. Interroger l'expertise avant les scènes pousserait les
 * participants en mode examen, à rebours de l'intuition qu'on cherche à
 * recueillir. Un item d'attention instruit est glissé dans le même bloc, au
 * même format.
 */
export function SelfAssessScreen() {
  const [familiarity, setFamiliarity] = useState<Record<string, number>>({});
  const [confidence, setConfidence] = useState<number | null>(null);
  const [check, setCheck] = useState<number | null>(null);
  const [education, setEducation] = useState("");

  const keys = [...AXES.map((a) => `familiarity_${a}`), "physics_confidence", ac.itemKey, "physics_education"];
  useShown(keys);

  const complete =
    AXES.every((a) => familiarity[a] != null) && confidence != null && check != null && education !== "";

  function submit() {
    record([
      ...AXES.map((a) => ({
        phase: "survey" as const,
        item_key: `familiarity_${a}`,
        axis: a,
        confidence: familiarity[a],
        rt_ms: rtFor(`familiarity_${a}`),
      })),
      {
        phase: "survey" as const,
        item_key: "physics_confidence",
        confidence,
        rt_ms: rtFor("physics_confidence"),
      },
      {
        phase: "check" as const,
        item_key: ac.itemKey,
        confidence: check,
        response_text: String(ac.expected),
        rt_ms: rtFor(ac.itemKey),
      },
      {
        phase: "survey" as const,
        item_key: "physics_education",
        response_text: education,
        rt_ms: rtFor("physics_education"),
      },
    ]);
    dispatch({ type: "SET_STEP", step: "completing" });
  }

  return (
    <main className="page">
      <h1>{selfAssessment.title}</h1>
      <p>{selfAssessment.intro}</p>

      <h2>{selfAssessment.familiarityPrompt}</h2>
      {AXES.map((a) => (
        <fieldset key={a} className="item">
          <legend>{AXIS_LABELS[a]}</legend>
          <Scale
            name={`familiarity_${a}`}
            labels={selfAssessment.familiarityScale}
            value={familiarity[a] ?? null}
            onChange={(v) => setFamiliarity((f) => ({ ...f, [a]: v }))}
          />
        </fieldset>
      ))}

      <fieldset className="item">
        <legend>{ac.label}</legend>
        <Scale
          name={ac.itemKey}
          labels={selfAssessment.familiarityScale}
          value={check}
          onChange={setCheck}
        />
      </fieldset>

      <fieldset className="item">
        <legend>{selfAssessment.confidenceItem}</legend>
        <Scale
          name="physics_confidence"
          labels={selfAssessment.confidenceScale}
          value={confidence}
          onChange={setConfidence}
        />
      </fieldset>

      <fieldset className="item">
        <legend>{selfAssessment.educationItem}</legend>
        <select value={education} onChange={(e) => setEducation(e.target.value)}>
          <option value="">— please choose —</option>
          {selfAssessment.educationOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </fieldset>

      <button className="primary" disabled={!complete} onClick={submit}>
        {selfAssessment.button}
      </button>
    </main>
  );
}
