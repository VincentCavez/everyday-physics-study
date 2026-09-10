import { useMemo } from "react";
import conceptsData from "../config/concepts.json";
import { scenario as texts } from "../config/instructions";
import { logMetaFor, shownOrder } from "../config/proposals";
import { studyConfig } from "../config/studyConfig";
import { record } from "../data/queue";
import { stimulusUrl, usePreload } from "../hooks/usePreload";
import { rtFor, shownAt, useShown } from "../hooks/useRt";
import { OWN_ZONES } from "../config/protocol";
import { currentPage, currentPlan, currentScene, rowById, sceneKey } from "../state/machine";
import { dispatch, useSession } from "../state/store";
import type { ConceptOption, StageNo } from "../types";
import { ConceptRank, type RankRow } from "./ConceptRank";
import { ConceptSelect } from "./ConceptSelect";
import { OwnTheoryPage } from "./OwnTheoryPage";
import { ProseZone } from "./ProseZone";
import { TheoryChoicePage, TheoryRatePage } from "./TheoryPages";
import { ToolRatePage } from "./ToolRatePage";

const OPTIONS = conceptsData.options as unknown as ConceptOption[];
const acConcept = studyConfig.attentionChecks.concept;
const LABEL_OF = new Map(OPTIONS.map((o) => [o.key, o.label]));

/** Les options qu'on peut CLASSER : ni « aucun de ceux-ci » (exclusif, donc
 *  seul), ni l'option instruite du contrôle d'attention (ce n'est pas un
 *  attribut de la scène). « Something else » EST classable : c'est un attribut
 *  que le participant a nommé lui-même. */
const RANKABLE = new Set(OPTIONS.filter((o) => o.kind !== "none").map((o) => o.key));
function rankable(keys: string[]): string[] {
  return keys.filter((k) => RANKABLE.has(k));
}

/**
 * UNE SCÈNE, protocole v2. Le rendu ne dépend que du curseur
 * `(page_index, reveal)`, et comme aucune action ne le fait reculer, aucune
 * liste d'options ne peut être montée avant que la prose qui la précède soit
 * verrouillée. C'est le même invariant qu'en v1, sur un curseur plus long.
 */
export function ScenarioScreen() {
  const s = useSession();
  const scene = currentScene(s);
  const plan = currentPlan(s);
  const page = currentPage(s);
  const isTrial = s.scenario_index === 0;
  const key = sceneKey(s.scenario_index);

  // Précharge la scène suivante pendant que celle-ci est en cours.
  const nextSceneId = useMemo(() => {
    if (s.row_id == null || s.scenario_index >= studyConfig.scoredCount) return null;
    const row = rowById(s.row_id);
    const axis = row.scored_order[s.scenario_index];
    return axis ? row.scenes[axis] : null;
  }, [s.row_id, s.scenario_index]);
  usePreload([nextSceneId]);

  const pageKey = page ? `${key}.${page.key}` : `${key}.none`;
  /** Une clé d'horodatage PAR RÉVÉLATION : la latence d'un second temps se
      compte depuis SA propre apparition, pas depuis l'entrée sur la page. */
  const stepKey = `${pageKey}.r${s.reveal}`;
  useShown([stepKey]);

  if (!scene || !page) return null;

  const phase = isTrial ? ("trial" as const) : ("scored" as const);
  const common = {
    phase,
    scene_id: scene.id,
    axis: scene.axis,
    scenario_index: s.scenario_index,
    stage: page.stage as StageNo,
  };
  const timing = { rt_ms: rtFor(stepKey), ts_shown: shownAt(stepKey) };

  /** Dernière page de la SCÈNE : c'est là qu'on pousse le lot au serveur.
      UN envoi par scène depuis le 2026-09-10 (trois auparavant, un par stage).
      Mesuré sur les cinq premiers participants : 26 requêtes chacun, dont 10 %
      au-delà du délai de 45 s du client, qui réessayait — un quart des lots
      sont partis deux fois. Le gros du défaut était côté serveur (une écriture
      Sheets par LIGNE) et il est corrigé ; diviser les requêtes par trois est
      la marge, pas le correctif. Rien n'est risqué entre deux envois : la file
      vit dans localStorage, et `maxHoldMs` (4 min) la vide de toute façon. */
  const endsScene = s.page_index + 1 >= plan.length;

  const draftKey = `${stepKey}.text`;
  const ratingKey = `${stepKey}.rating`;
  const draftText = (s.drafts[draftKey] as string) ?? "";
  const draftRating = (s.drafts[ratingKey] as number | undefined) ?? null;
  const setText = (v: string) => dispatch({ type: "SET_DRAFT", key: draftKey, value: v });
  const setRating = (v: number) => dispatch({ type: "SET_DRAFT", key: ratingKey, value: v });

  function commit(
    itemKey: string,
    extra: Record<string, unknown>,
    committedKey: string,
    text: string,
    rating: number | null,
    advance: "reveal" | "page",
    send = false,
  ) {
    record([{ ...common, item_key: itemKey, ...timing, ...extra }], { send });
    dispatch({ type: "COMMIT_ANSWER", key: `${key}.${committedKey}`, text, rating, advance });
  }

  // ── Stage 1, page A : deux zones puis la confiance ────────────────────────
  if (page.kind === "own") {
    // Trois zones de prose puis la confiance. `OWN_ZONES` porte les clés de
    // journal, dans l'ordre : prédiction, ce qui décide, ce qu'on changerait.
    const isConf = s.reveal >= OWN_ZONES.length;
    const sub = isConf ? "conf" : `z${s.reveal + 1}`;
    const itemKey = isConf ? "confidence" : OWN_ZONES[s.reveal]!;
    const onSubmit = () =>
      isConf
        ? commit(itemKey, { rating: draftRating }, sub, "", draftRating, "page")
        : commit(itemKey, { response_text: draftText }, sub, draftText, null, "reveal");
    return (
      <Frame scene={scene} s={s} onConcepts={false}>
        <OwnTheoryPage
          scene={scene}
          reveal={s.reveal}
          locked={OWN_ZONES.map((_, i) => s.committed[`${key}.z${i + 1}`]?.text)}
          draftText={draftText}
          draftRating={draftRating}
          onText={setText}
          onRating={setRating}
          onSubmit={onSubmit}
        />
      </Frame>
    );
  }

  // ── Stage 1, page B : la checklist, puis le classement partiel ────────────
  if (page.kind === "own_concepts") {
    const picked = s.concepts[key];

    const submitConcepts = (sel: { keys: string[]; order: string[]; other: string }) => {
      const canRank = rankable(sel.keys).length >= 2;
      record(
        [
          {
            ...common,
            item_key: "concepts",
            concepts: sel.keys,
            concept_order: sel.order,
            other_text: sel.other,
            ...timing,
          },
        ],
        { send: !canRank && endsScene },
      );
      // Moins de deux options classables : il n'y a rien à ordonner, la page se
      // valide directement et `rank` reste vide côté Sheet. C'est le « vide si
      // non classé » du protocole, pas une donnée manquante.
      dispatch({
        type: "COMMIT_CONCEPTS",
        selection: { keys: sel.keys, other: sel.other },
        advance: canRank ? "reveal" : "page",
      });
    };

    const submitRank = (rows: RankRow[]) => {
      const order = picked?.keys ?? [];
      const shuffledOrder = JSON.parse(s.drafts[`${pageKey}.order`] as string | undefined ?? "[]") as string[];
      record(
        rows.map((r) => ({
          ...common,
          item_key: "concept_rank",
          item_id: r.key,
          rank: r.rank,
          tick_order: order.indexOf(r.key) + 1,
          rank_touched: r.touched,
          display_position: shuffledOrder.indexOf(r.key) + 1 || null,
          ...timing,
        })),
        { send: endsScene },
      );
      dispatch({
        type: "COMMIT_ANSWER",
        key: `${key}.rank`,
        text: rows.map((r) => r.key).join(","),
        rating: null,
        advance: "page",
      });
    };

    const withCheck = !isTrial && s.scenario_index === acConcept.scenarioIndex;
    return (
      <Frame scene={scene} s={s} onConcepts>
        {s.reveal === 0 ? (
          <ConceptSelect
            key={pageKey}
            presentationKey={`${s.session_id}|${scene.id}|concepts`}
            withAttentionCheck={withCheck}
            onSubmit={(sel) => {
              // L'ordre d'AFFICHAGE de la liste sert au biais de position des
              // lignes de classement : il est mémorisé le temps de la page.
              dispatch({ type: "SET_DRAFT", key: `${pageKey}.order`, value: JSON.stringify(sel.order) });
              submitConcepts(sel);
            }}
          />
        ) : (
          <ConceptRank
            key={`${pageKey}.rank`}
            // `ac_concept` ne peut pas arriver ici : il n'est pas dans
            // `concepts.json`, donc pas dans `RANKABLE`. C'est voulu — le
            // contrôle d'attention instruit n'est pas un attribut de la scène,
            // et le classer fausserait Borda.
            options={rankable(picked?.keys ?? []).map((k) => ({ key: k, label: LABEL_OF.get(k) ?? k }))}
            outcome={scene.outcome}
            onSubmit={submitRank}
          />
        )}
      </Frame>
    );
  }

  // ── Stage 2 : les théories, une par une, puis le choix forcé ──────────────
  if (page.kind === "theory_rate") {
    // DEUX temps (09/09) : la ressemblance (`theory_rate`), puis « quelque
    // chose en trop » (`theory_excess`), même colonne `rating`, même item_id.
    // Le premier temps ne pousse jamais au serveur : c'est le second qui clôt
    // la page, et la dernière page du stage qui clôt le lot.
    const isExcess = s.reveal >= 1;
    const fit = s.committed[`${key}.${page.key}.fit`]?.rating ?? null;
    const meta = { item_id: page.card.id, ...logMetaFor(scene.id, page.card.id), display_position: page.position };
    return (
      <Frame scene={scene} s={s} onConcepts={false}>
        <TheoryRatePage
          key={`${pageKey}.r${s.reveal}`}
          card={page.card}
          withIntro={page.position === 1 && !isExcess}
          reveal={s.reveal}
          fit={fit}
          value={draftRating}
          onChange={setRating}
          onSubmit={() =>
            isExcess
              ? commit("theory_excess", { ...meta, rating: draftRating }, `${page.key}.excess`, "", draftRating, "page", endsScene)
              : commit("theory_rate", { ...meta, rating: draftRating }, `${page.key}.fit`, "", draftRating, "reveal")
          }
        />
      </Frame>
    );
  }

  if (page.kind === "theory_choice") {
    return (
      <Frame scene={scene} s={s} onConcepts={false}>
        <TheoryChoicePage
          key={pageKey}
          cards={page.cards}
          onSubmit={(id) =>
            commit(
              "theory_choice",
              {
                response_text: id,
                item_id: id,
                ...logMetaFor(scene.id, id),
                display_position: page.cards.findIndex((c) => c.id === id) + 1,
                options: shownOrder(page.cards),
              },
              page.key,
              id,
              null,
              "page",
              endsScene,
            )
          }
        />
      </Frame>
    );
  }

  // ── Stage 3 : les outils, en deux temps ───────────────────────────────────
  if (page.kind === "tool_rate") {
    const { tool, position, key: pk } = page;
    const isRange = tool.values.kind === "range";
    const fit = s.committed[`${key}.${pk}.fit`]?.rating ?? null;
    const valueLabels = tool.values.kind === "palette" ? tool.values.items : [tool.values.sentence];

    const onSubmit = () => {
      if (s.reveal === 0) {
        // Un outil `range` n'a pas de second temps : rien à révéler, rien à
        // noter. La page se valide donc ici, comme n'importe quelle page à une
        // seule révélation, et aucune ligne `tool_values` n'existera pour lui.
        // C'est cette ABSENCE qui le désigne à l'analyse, `proposals.json`
        // donnant le `mapping_kind` de chaque outil.
        record(
          [
            {
              ...common,
              item_key: "tool_fit",
              item_id: tool.id,
              ...logMetaFor(scene.id, tool.id),
              display_position: position,
              rating: draftRating,
              ...timing,
            },
            // La RÉVÉLATION des valeurs, event distinct, dont l'horodatage
            // démarre la latence du second temps. Seulement s'il y en a un.
            ...(isRange
              ? []
              : [
                  {
                    ...common,
                    item_key: "tool_values_shown",
                    item_id: tool.id,
                    ...logMetaFor(scene.id, tool.id),
                    display_position: position,
                    options: valueLabels,
                  },
                ]),
          ],
          { send: isRange && endsScene },
        );
        dispatch({
          type: "COMMIT_ANSWER",
          key: `${key}.${pk}.fit`,
          text: "",
          rating: draftRating,
          advance: isRange ? "page" : "reveal",
        });
        return;
      }
      // Second temps : la note de la palette.
      commit(
        "tool_values",
        {
          item_id: tool.id,
          ...logMetaFor(scene.id, tool.id),
          display_position: position,
          rating: draftRating,
          options: valueLabels,
        },
        `${pk}.values`,
        "",
        draftRating,
        "page",
        endsScene,
      );
    };

    return (
      <Frame scene={scene} s={s} onConcepts={false}>
        <ToolRatePage
          key={`${pageKey}.r${s.reveal}`}
          tool={tool}
          withIntro={position === 1 && s.reveal === 0}
          reveal={s.reveal}
          fit={fit}
          draftRating={draftRating}
          onRating={setRating}
          onSubmit={onSubmit}
        />
      </Frame>
    );
  }

  // ── Stage 3, fin : le souhait libre, facultatif ───────────────────────────
  return (
    <Frame scene={scene} s={s} onConcepts={false}>
      <section className="itempage">
        <ProseZone id="wish" question={texts.wishPrompt} value={draftText} onChange={setText} single autoFocus />
        <div className="actions">
          <button
            className="primary"
            onClick={() => commit("wish", { response_text: draftText }, page.key, draftText, null, "page", endsScene)}
          >
            {texts.submitProse}
          </button>
          <span className="sub">{texts.wishOptional}</span>
        </div>
      </section>
    </Frame>
  );
}

/**
 * Le cadre commun : le bandeau, la description et le croquis, qui restent
 * affichés sur toutes les pages de la scène.
 *
 * LE BANDEAU NE PORTE AUCUN COMPTEUR D'ITEMS. « No hint of origin, count or
 * order » : dire « 2 sur 4 » au stage 3 révélerait combien d'outils la scène a
 * produits, donc que le dernier est peut-être le leurre. On perd la progression
 * fine sur une dizaine de pages par scène ; c'est le prix, et il est assumé.
 */
function Frame({
  scene,
  s,
  onConcepts,
  children,
}: {
  scene: { id: string; description: string };
  s: { scenario_index: number };
  onConcepts: boolean;
  children: React.ReactNode;
}) {
  const isTrial = s.scenario_index === 0;
  return (
    <main className={`page scenario${onConcepts ? " on-concepts" : ""}`}>
      <header className="progress">
        <span>
          Sketch {s.scenario_index + 1} of {studyConfig.scoredCount + 1}
          {isTrial && ` — ${texts.trialTag}`}
        </span>
      </header>

      <p className="description">{scene.description}</p>

      <figure className="stimulus">
        <img src={stimulusUrl(scene.id)} alt={scene.description} />
      </figure>

      {children}
    </main>
  );
}
