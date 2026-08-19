import { useMemo } from "react";
import { scenario as texts } from "../config/instructions";
import { BLOCKS, type ProseItem } from "../config/protocol";
import { studyConfig } from "../config/studyConfig";
import { record } from "../data/queue";
import { stimulusUrl, usePreload } from "../hooks/usePreload";
import { rtFor, useShown } from "../hooks/useRt";
import { blockKey, blocksFor, conceptPrefill, currentItem, currentScene, rowById } from "../state/machine";
import { dispatch, useSession } from "../state/store";
import type { BlockNo } from "../types";
import { ConceptSelect } from "./ConceptSelect";
import { ItemPage } from "./ItemPage";

const acConcept = studyConfig.attentionChecks.concept;

/**
 * Une scène. Neuf pages : six items en prose (une question par page) et trois
 * listes de concepts, une par bloc. Le croquis et sa description restent
 * affichés sur les neuf, le rendu ne dépend que du curseur — et comme aucune
 * action ne le fait reculer, la liste de concepts d'un bloc n'est montée
 * qu'après la dernière page en prose de ce bloc.
 */
export function ScenarioScreen() {
  const s = useSession();
  const scene = currentScene(s);
  const blocks = blocksFor(s.scenario_index);
  const items: ProseItem[] = BLOCKS[s.block].items;
  const item = currentItem(s);
  const isTrial = s.scenario_index === 0;
  const key = blockKey(s.scenario_index, s.block);

  // Précharge la scène suivante pendant que celle-ci est en cours.
  const nextSceneId = useMemo(() => {
    if (s.row_id == null || s.scenario_index >= studyConfig.scoredCount) return null;
    const row = rowById(s.row_id);
    const axis = row.scored_order[s.scenario_index];
    return axis ? row.scenes[axis] : null;
  }, [s.row_id, s.scenario_index]);
  usePreload([nextSceneId]);

  const pageKey = `${key}.${item ? item.key : "concepts"}`;
  useShown([pageKey]);

  if (!scene) return null;

  const questionFor = (it: ProseItem) => it.question(scene);
  const phase = isTrial ? ("trial" as const) : ("scored" as const);
  const common = {
    phase,
    scene_id: scene.id,
    axis: scene.axis,
    scenario_index: s.scenario_index,
    block: s.block,
  };

  function submitItem(it: ProseItem, text: string, confidence: number | null) {
    record([
      { ...common, item_key: it.key, response_text: text, confidence, rt_ms: rtFor(pageKey) },
    ]);
    dispatch({ type: "COMMIT_ITEM", itemKey: it.key, text, confidence });
  }

  function submitConcepts(sel: { keys: string[]; order: string[]; other: string }) {
    record([
      {
        ...common,
        item_key: "concepts",
        concepts: sel.keys,
        concept_order: sel.order,
        other_text: sel.other,
        rt_ms: rtFor(pageKey),
      },
    ]);
    dispatch({ type: "COMMIT_CONCEPTS", selection: { keys: sel.keys, other: sel.other } });
  }

  const withCheck =
    !isTrial && s.scenario_index === acConcept.scenarioIndex && s.block === (acConcept.block as BlockNo);

  // Rappel de la réponse que cette page demande de justifier.
  const explained = item?.explains ? items.find((x) => x.key === item.explains) : undefined;
  const recall =
    explained && s.committed[`${key}.${explained.key}`]
      ? {
          question: questionFor(explained),
          text: s.committed[`${key}.${explained.key}`].text,
        }
      : null;

  const draftText = (s.drafts[`${pageKey}.text`] as string) ?? "";
  const draftConf = (s.drafts[`${pageKey}.conf`] as number | undefined) ?? null;

  return (
    <main className={`page scenario${item ? "" : " on-concepts"}`}>
      <header className="progress">
        <span>
          Sketch {s.scenario_index + 1} of {studyConfig.scoredCount + 1}
          {isTrial && ` — ${texts.trialTag}`}
        </span>
        <span>
          {BLOCKS[s.block].title} · part {blocks.indexOf(s.block) + 1} of {blocks.length}
        </span>
      </header>

      <p className="description">{scene.description}</p>

      <figure className="stimulus">
        <img src={stimulusUrl(scene.id)} alt={scene.description} />
      </figure>

      {item ? (
        <ItemPage
          key={pageKey}
          question={questionFor(item)}
          recall={recall}
          text={draftText}
          confidence={draftConf}
          withConfidence={item.confidence}
          onText={(v) => dispatch({ type: "SET_DRAFT", key: `${pageKey}.text`, value: v })}
          onConfidence={(v) => dispatch({ type: "SET_DRAFT", key: `${pageKey}.conf`, value: v })}
          onSubmit={() => submitItem(item, draftText, draftConf)}
        />
      ) : (
        <ConceptSelect
          key={pageKey}
          presentationKey={`${s.session_id}|${scene.id}|${s.block}`}
          withAttentionCheck={withCheck}
          initial={conceptPrefill(s)}
          onSubmit={submitConcepts}
        />
      )}
    </main>
  );
}
