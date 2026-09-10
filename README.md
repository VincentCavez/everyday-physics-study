# Everyday physics elicitation — Experiment 1

Static web app for the Prolific elicitation study: 75 sketched scenes across 5 axes,
1 practice + 5 scored scenarios per participant, **three stages per scene**,
responses streamed to a Google Sheet.

> **Protocol v2 (2026-09-09).** The three elicitation *blocks* are replaced by three
> *stages*. Stage 1 is the participant's own theory, now ending in a **partial ranking**
> of the options they ticked. Stages 2 and 3 ask them to **rate what the pipeline
> produced**: three descriptions of what might happen (pipeline, raw-Gemini baseline,
> lure) and every tool generated for the scene (plus a lure tool). Nothing is generated
> during a session: `src/config/proposals.json` is written offline and versioned here.

The app has no backend of its own. It is a static bundle deployed to GitHub Pages,
talking to a Google Apps Script web app bound to a Sheet.

## Session structure

```
consent → instructions (motion-arrow convention) → 6 sketches → questionnaire → completion code
```

Each sketch is shown with a written description above it; both are part of the input and
**the model must be given the same description verbatim**, or the human/model comparison
would run on different inputs. The sketch and its description stay on screen for the whole
scene.

| Stage | Pages | What it asks |
|---|---|---|
| 1 · the participant's own theory | 2 | prediction → **what decides it** → counterfactual → confidence (one page, revealed in four steps), then the concept list → partial ranking |
| 2 · rating theories | 4 | three descriptions, one at a time, then a forced choice |
| 3 · rating tools | n+1 | one tool per page, in two steps (the tool, then its values), then one optional free field |

**Stage 1** keeps the v1 wording, verbatim, and the v1 `item_key`s (`prediction`,
`free_counterfactual`, `concepts`): the phase has to stay comparable to the answers
already collected on 2026-09-04. One question is **new**, and deliberately not
comparable: `what_decides` — *"What is it about the scene that decides {outcome}?"*.
Without it the participant never says which properties are in play except by ticking
a list of 37 options, and the whole design rests on prose coming BEFORE the list, so
that an uncued measure exists to set against the cued one. It also gives stage 2 the
referent it otherwise lacks: stage 2 asks how well a *theory* matches "what you
thought", and until this question existed nobody had been asked to state a theory. It
carries a new key rather than v1's `explanation` because it is a different question,
and two different questions must never pool under one name.

A locked prose zone is redisplayed as a **quotation**, not a greyed-out field. Three
three-row textareas plus the scale did not fit the no-scroll grid at the smallest
accepted viewport (measured at 1000×620: 106 px of overflow, Continue off-screen); and
a disabled field reads as something that might reopen, which a committed answer never
does. What is new is the **partial ranking** at the end: the
participant elects the option that matters most (required), then may reorder the rest by
dragging. Ranks 2..k stay pre-filled in tick order, which is a *default*, so every row
carries `tick_order` and `rank_touched` — otherwise a ranking nobody touched (i.e. the
tick order, i.e. the shuffled display order) would be indistinguishable from a judgement.

**Stage 2** shows exactly three theories, one at a time, in an order drawn per
participant, with no hint of origin, count or order. **The progress banner therefore
carries no item counter** on stages 2 and 3.

**Stage 3** shows every tool the pipeline generated for the scene, plus one lure tool
taken from another scene of the same axis. Each tool is rated on its name and gesture
alone; only then are its values revealed and rated. Roughly 30 % of tools have a
*continuous* value mapping (a `position` host): there is no palette to reveal, so the
values question is **not asked** for them, and the missing value is recorded as such.

Answers are final once submitted and there is no way back. Scene pages are laid out to
fit the viewport — nothing scrolls. Small screens are turned away up front (the sketches
are 1200×800).

The self-assessment (per-axis familiarity, confidence, physics education) runs at the
**end**, not the start: asking about expertise first pushes participants into exam mode,
which is the opposite of the first-reaction intuition the study elicits.

### Why the stage-1 questions are scene-specific

The prediction question is authored per scene (`prediction` in `scenes.json`) rather than
being a generic "What happens next?", for three reasons:

- **"Next" has no fixed timescale.** People segment an event at several nested grains at
  once, so an open question lets two participants answer about different moments — the ball
  leaves the hand, the ball lands, the ball rolls to a stop. Naming the object and the
  outcome collapses that variance. This is what the reference paradigm in intuitive physics
  does: Battaglia et al. (PNAS 2013) ask "Will it fall?" and "In which direction?", never an
  open question.
- **Situation-model dimensions are built on demand** — people track space "when asked". What
  you do not ask about, you do not get.
- **Never two questions in one stem.** Lay respondents answer double-barrelled items
  inconsistently (Adams et al. 2006, the CLASS wording study), which is why the change and
  its consequence are two separate zones rather than one question.

The counterfactual **fixes the outcome and leaves the change free**: the participant's
chosen attribute is the measurement, so it must stay free, but pinning the outcome makes
answers comparable across participants without ever naming the property under study.

None of these strings may contain the vocabulary of the concept list; `tools/check-study.mjs`
warns on any that do.

## Contents

| Path | What |
|---|---|
| `src/config/design.json` | 75 design rows (scored scenes, order, practice scene). Generated — do not edit by hand. |
| `src/config/scenes.json` | Per scene: written description, prediction question, outcome clause, imposed counterfactual. All four go to the model verbatim. **Needs author review.** |
| `src/config/concepts.json` | The concept multi-select list, mapped to catalog `concept_id`s. **Needs author review.** |
| `src/config/instructions.ts` | Every participant-facing string, incl. the arrow convention given verbatim to the model. |
| `src/config/proposals.json` | Per scene: the three theories and the tools rated at stages 2 and 3, with a `provenance` block that is **never shown**. Generated — do not edit by hand. |
| `src/config/proposals.ts` | The only door components use to reach those materials: it strips `provenance` **at runtime**, not just in the types. |
| `src/config/studyConfig.ts` | Apps Script URL, Prolific redirect, attention checks, protocol variants. |
| `apps-script/Code.gs` | The backend: row assignment, response logging, completion code. |
| `public/stimuli/*.png` | The 75 stimuli. Generated. |

Generators live in the main PhysicsPainter repo:

```bash
node tools/gen-design.mjs               # → study/src/config/design.json
node tools/export-stimuli.mjs           # → study/public/stimuli/*.png + contact sheet
npx tsx tools/gen-proposals.ts --fake --all   # → proposals.json, FAKE materials, offline
npx tsx tools/gen-proposals.ts          # → proposals.json, real materials (needs the recordings)
node tools/check-study.mjs              # plan / stimuli / texts / proposals consistency
```

`--fake` writes stub materials with the **real** tool count, ranks, palettes and
palette/range mix of every scene, so the interface can be walked before any real content
exists. `check-study.mjs` **fails** while `$meta.fake` is set, so a fake file cannot reach
Prolific; pass `--allow-fake` to check everything else during development.

## Local development

```bash
npm install
npm run dev
```

Without a Prolific ID in the URL the app runs in **preview mode**: it assigns a row
locally, records nothing, and issues no completion code. That is also how you review
wording end to end. With `studyConfig.appsScriptUrl` still unset, preview mode never
touches the network at all.

Two query parameters help while testing:

| Parameter | Effect |
|---|---|
| `?reset=1` | Discard the stored session and start clean. A session is otherwise resumed exactly where it stopped, so you need this between test runs. |
| `?row=N` | Force design row `N` (1–75) in preview, to review a particular set of scenes. Ignored once a backend is configured. |

So `http://localhost:5173/?reset=1&row=12` walks row 12 from the top. To exercise the
real participant path instead, append Prolific-style parameters:
`?PROLIFIC_PID=test123&STUDY_ID=x&SESSION_ID=y` — this consumes a real row and writes
to the Sheet, so only do it once the backend is set up.

## Setup — Google Sheet backend

1. Create a Google Sheet, then **Extensions ▸ Apps Script**, and paste `apps-script/Code.gs`.
2. Run `setup()` once from the editor (it creates the `rows`, `sessions`, `responses`
   and `meta` tabs and seeds 75 free rows). Grant the permission prompt.
3. In the `meta` tab, replace `PASTE_PROLIFIC_COMPLETION_CODE` with the completion code
   Prolific gives you. Keep it out of this repo — the code is only ever returned by the
   server at the end of a session.
4. **Deploy ▸ New deployment ▸ Web app**, *Execute as: me*, *Who has access: Anyone*.
5. Copy the `/exec` URL into `src/config/studyConfig.ts` (`appsScriptUrl`).
6. Check the round trip before anything else:

```bash
curl -sL "PASTE_EXEC_URL?action=ping"
```

It must return JSON (`{"ok":true,...}`). HTML back means the deployment access setting
is wrong. Redeploying later: use *Manage deployments ▸ edit ▸ new version* so the URL
stays stable.

### Admin functions

`resetWave()` starts a **new wave on the same workbook**: it renames `responses` and
`sessions` to `…-<today>`, creates fresh ones, and frees all 75 design rows. Close the study
first (`closeStudy()`) — it refuses while the study is open, because freeing rows under a
live session would lose it. Pick it in the editor's function menu and press Run; no argument
needed. It leaves `meta` alone — the completion code comes from Prolific and changes with
every study, so copy the new one in by hand, then `openStudy()`. Nothing is deleted and the
`/exec` URL does not change, so the site needs no rebuild.

`progress()` counts row statuses, and splits `ASSIGNED` into *in progress* and *stale* ·
`freeRow(id)` releases a row after a rejection so a replacement gets the same design row
(this is what preserves the balance) · `closeStudy()` / `openStudy()` stop and resume
recruitment without unpublishing · `migrate()` is a **one-off** for a workbook that was
already running before 2026-09-10: it writes the `last_seen` header and pre-sizes the
`responses` grid.

### Abandonment, and why `stale_minutes` is not a timeout on the task

A row is assigned when the browser passes the width gate, before consent, so a
participant who opens the link and leaves holds a row. It returns to the pool after
`stale_minutes` (`meta` tab, 120 by default), and the session that lost it is logged as
`reclaimed-stale`.

Staleness is measured from the **last batch of answers received**, not from the moment of
assignment: on 2026-09-09 a session ran 1 h 04 with `stale_minutes` at 60, which under the
old rule would have handed that participant's row to someone else while they were still
answering. Set `stale_minutes` to roughly twice the time a participant needs to reach the
first send (end of scene 1, a few minutes), never to the length of the task.

Nothing is lost when a row is reclaimed: answers carry the participant's `pid`, and the
analysis keys on `pid`, never on `row_id`. `assign_count` on the row counts how many
participants went through it.

## Deployment — GitHub Pages

This directory is the root of its own public repository.

1. Create the repo, copy this directory into it (including `.github/`, `package-lock.json`
   and `public/stimuli/`), push to `main`.
2. Repo **Settings ▸ Pages ▸ Source: GitHub Actions**.
3. The included workflow builds and publishes on every push to `main`.
4. The study URL is `https://<user>.github.io/<repo>/`.

## Prolific configuration

- Study URL: `https://<user>.github.io/<repo>/?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}`
- Completion: **redirect to a URL** — the app redirects itself using the code from the Sheet.
- **Restrict to desktop.** The stimuli are 1200×800; the app blocks narrow screens anyway.
- Recruit ~83 to net 75 completions. Do not exceed 75 net completions: beyond that the
  one-practice-scene-per-scenario property breaks. Handle surplus by freeing rows
  (`freeRow`), not by adding rows.

## Before launch — checklist

- [ ] Review the 75 scene descriptions in `scenes.json` against `stimuli-contact-sheet.html`.
      A wrong description is worse than no description: it becomes the participant's reading
      of the sketch. `node tools/check-study.mjs` warns about any that use concept-list
      vocabulary, but it cannot tell you whether a description is *true* of its sketch.
- [ ] Review the 75 prediction questions and outcome clauses in `scenes.json`. Read each
      `prediction` aloud after its `imposed` clause (that is exactly how block 3 renders it),
      and check the question names an outcome the sketch can actually settle.
- [ ] Review the 75 imposed counterfactuals in `scenes.json`. *(v2 no longer shows them;
      the field is kept because the model pass still uses it.)*
- [ ] **Read the three theories of every scene** in `proposals.json` (75 × 3). The length
      check in `check-study.mjs` is a net, not a guarantee: a pipeline theory that is
      consistently longer or more jargon-heavy than the baseline gives its provenance away
      without a single word being read.
- [ ] **Read the tool names, gestures and palettes.** A rank-2 label like
      "friction · the sliding body's own underside" is jargon and must not reach anyone.
- [ ] Put the real `/exec` URL of the **new** deployment in `studyConfig.ts` (it is
      deliberately empty on the v2 branch, so that a local preview cannot write into the
      v1 Sheet).
- [ ] **Re-time the session.** The consent text still says "about 35 minutes", which was
      the v1 figure. Time one pass on a seven-tool scene and one on a single-tool scene:
      it is that number, not the scene count, that sets the duration.
- [ ] Deploy with the window **closed** (`closeStudy()`, wait until no row is freshly
      ASSIGNED, deploy, `openStudy()`). There is no state migration: a participant mid
      session loses their unsent queue.
- [ ] Review the concept labels in `concepts.json`.
- [ ] Fill in the ethics/contact placeholder in `instructions.ts` (`consent.body`).
- [ ] Put the real completion code in the Sheet's `meta` tab.
- [ ] Run one full preview pass, then one real pass with a test Prolific ID and check
      the `responses` tab.
- [ ] Soft-launch ~10 participants, check attention-check pass rate and session length
      before releasing the rest.

## Data model

`responses` is long format, one row per item response, **32 columns**:
`ts_server, ts_client, pid, session_id, row_id, is_test, scene_id, axis, phase,
scenario_index, stage, item_key, response_text, confidence, concepts_json,
concept_order_json, other_text, rt_ms, resumed, event_id, seq, item_id, origin,
orig_rank, display_position, rating, options_json, ts_shown, protocol_version,
rank, tick_order, rank_touched`.

Two rules the writer depends on: `appendEvents_` writes **positionally**, so a column is
only ever added at the END; and `setup()` writes the header only when the tab is empty, so
a live sheet would have to be widened by hand. Hence: **v2 goes on a fresh Sheet and a new
deployment.** v1 rows carry a `block` and no `rating`; mixing the two waves in one tab is a
permanent source of analysis error.

- `phase`: `survey` · `check` · `trial` (practice, **excluded from all analyses**) · `scored`
- `scenario_index`: 0 = practice, 1–5 = scored
- `stage` (column 11, formerly `block`): 1 · 2 · 3
- `confidence` is the questionnaire's **1–5** scale and nothing else; **every 0–10 rating
  goes in `rating`**, including stage 1's confidence. One column with two scales makes every
  average silently wrong.
- `ts_shown` is when the item appeared. With `ts_client` (when it was submitted) it gives
  the lock time of each prose zone, the moment the concept list opened, and the
  display-to-click latency — readable even when `rt_ms` is suspect (`resumed = 1`).
- `item_key`: `prediction` · `what_decides` · `free_counterfactual` · `confidence` · `concepts` ·
  `concept_rank` · `theory_rate` · `theory_choice` · `tool_fit` · `tool_values_shown` ·
  `tool_values` · `wish`, plus `familiarity_<axis>` ×5, `physics_confidence`, `ac_likert`,
  `physics_education`.
- `concepts` keeps its aggregate row (ticks, presentation order, `other_text`); the
  `concept_rank` rows are **added** on top, one per rankable ticked option. That is what
  keeps strict comparability with the 2026-09-04 wave, preserves the presentation order for
  the position-bias audit, and leaves a trace when nothing is ticked.
- `rank` is empty when there was nothing to rank (fewer than two rankable options ticked) —
  that is the protocol's "empty if unranked", not missing data.
- `tick_order` is the option's position in the order it was **ticked**; `display_position`
  is its position in the **shuffled** list. They are different things, and telling them
  apart is the whole point.
- `rank_touched = 1` means the participant moved that option. The elected head is always 1.
- `tool_values` with an empty `rating` is a `range` tool: no palette, so the question was
  not asked. Missing by construction.
- `origin` / `orig_rank` say where a rated item came from. They are written from a
  dedicated door (`proposals.ts:logMetaFor`) that returns two scalars and nothing
  renderable — provenance never reaches a component.
- `resumed = 1`: the participant refreshed or returned; treat `rt_ms` as unreliable
- Retries can duplicate rows — deduplicate on `event_id` before analysis.

Roughly 24 rows per scene on average (up to about 40 on a scene with seven tools), so
**~150 rows per participant** against 62 in v1.

## Analysis

`npx tsx tools/analyze-study.ts --responses=export.csv` reads the `responses` tab and
reports phase 1 at **three levels**, all at the grain of the 37 options:

- **a · set** — Jaccard, precision, recall against the human majority (unchanged).
- **b · head** — top-1 and top-2 agreement between the human rank 1 (the mode per scene)
  and the pipeline head. **Two heads are reported separately**: the stage-1 head (the
  model's prior from looking at the sketch) and the stage-3 head (what the sweep measured).
- **c · order** — a Borda consensus over the human rankings, then RBO (p = 0.9) against the
  pipeline ranking projected onto the options. NDCG as a secondary. Neither Spearman nor
  Kendall: the two lists share neither length nor items.

At levels b and c a `demoted` candidate counts as absent. Every level is read against a
**leave-one-out ceiling** (each participant against the consensus of the others). The
report also states how many rankings were actually moved beyond the head — the rest are
tick order wearing a judgement's clothes.
