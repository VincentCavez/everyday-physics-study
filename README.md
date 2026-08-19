# Everyday physics elicitation — Experiment 1

Static web app for the Prolific elicitation study: 75 sketched scenes across 5 axes,
1 practice + 5 scored scenarios per participant, three elicitation blocks per scene,
responses streamed to a Google Sheet.

The app has no backend of its own. It is a static bundle deployed to GitHub Pages,
talking to a Google Apps Script web app bound to a Sheet.

## Session structure

```
consent → instructions (motion-arrow convention) → 6 sketches → questionnaire → completion code
```

Each sketch is shown with a written description above it; both are part of the input and
**the model must be given the same description verbatim**, or the human/model comparison
would run on different inputs. Each sketch takes nine pages — one question per page, never
two text fields on screen at once:

| Block | Pages |
|---|---|
| 1 | prediction → explanation → concept list |
| 2 | free counterfactual → explanation → concept list (pre-filled with block 1's ticks) |
| 3 | imposed counterfactual → explanation → concept list (pre-filled with block 2's ticks) |

The concept list of blocks 2 and 3 starts from the participant's ticks of the previous block
for the same sketch, with a one-line note saying so; they adjust rather than re-find every
option. Nothing carries over between sketches. Pilot feedback: finding the list empty three
times per sketch was the single most tedious part of the session.

### Why the questions are scene-specific

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
  inconsistently (Adams et al. 2006, the CLASS wording study). The old free counterfactual
  asked for the change *and* its consequence in one breath; those are now separate pages.

The block-2 question **fixes the outcome and leaves the change free**:
"What one thing in the scene could you change to make a difference to `{outcome}`?" The
participant's chosen attribute is the measurement (RQ2, causal relevance), so it must stay
free — but pinning the outcome makes answers comparable across participants without ever
naming the property under study. Block 3 reuses the block-1 prediction question verbatim
after the imposed clause, so the counterfactual-direction comparison is defined on the same
outcome variable in both blocks.

None of these strings may contain the vocabulary of the concept list; `tools/check-study.mjs`
warns on any that do, and checks that `prediction` and `outcome` refer to the same thing.

That is 54 scene pages per participant, plus consent, instructions and the questionnaire —
62 recorded responses in all. An explanation page shows the answer it asks about as a
read-only quote; answers are final once submitted and there is no way back.

The self-assessment (per-axis familiarity, confidence, physics education) runs at the
**end**, not the start: asking about expertise first pushes participants into exam mode,
which is the opposite of the first-reaction intuition the study elicits.

Scene pages are laid out to fit the viewport — nothing scrolls, on any screen the study
accepts. Small screens are turned away up front (the sketches are 1200×800).

## Contents

| Path | What |
|---|---|
| `src/config/design.json` | 75 design rows (scored scenes, order, practice scene). Generated — do not edit by hand. |
| `src/config/scenes.json` | Per scene: written description, prediction question, outcome clause, imposed counterfactual. All four go to the model verbatim. **Needs author review.** |
| `src/config/concepts.json` | The concept multi-select list, mapped to catalog `concept_id`s. **Needs author review.** |
| `src/config/instructions.ts` | Every participant-facing string, incl. the arrow convention given verbatim to the model. |
| `src/config/studyConfig.ts` | Apps Script URL, Prolific redirect, attention checks, protocol variants. |
| `apps-script/Code.gs` | The backend: row assignment, response logging, completion code. |
| `public/stimuli/*.png` | The 75 stimuli. Generated. |

Generators live in the main PhysicsPainter repo:

```bash
node tools/gen-design.mjs      # → study/src/config/design.json
node tools/export-stimuli.mjs  # → study/public/stimuli/*.png + contact sheet
node tools/check-study.mjs     # plan / stimuli / texts consistency
```

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

`progress()` counts row statuses · `freeRow(id)` releases a row after a rejection so a
replacement gets the same design row (this is what preserves the balance) ·
`closeStudy()` / `openStudy()` stop and resume recruitment without unpublishing.

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
- [ ] Review the 75 imposed counterfactuals in `scenes.json`.
- [ ] Review the concept labels in `concepts.json`.
- [ ] Fill in the ethics/contact placeholder in `instructions.ts` (`consent.body`).
- [ ] Put the real completion code in the Sheet's `meta` tab.
- [ ] Run one full preview pass, then one real pass with a test Prolific ID and check
      the `responses` tab.
- [ ] Soft-launch ~10 participants, check attention-check pass rate and session length
      before releasing the rest.

## Data model

`responses` is long format, one row per item response: `ts_server, ts_client, pid,
session_id, row_id, is_test, scene_id, axis, phase, scenario_index, block, item_key,
response_text, confidence, concepts_json, concept_order_json, other_text, rt_ms,
resumed, event_id, seq`.

- `phase`: `survey` · `check` · `trial` (practice, **excluded from all analyses**) · `scored`
- `scenario_index`: 0 = practice, 1–5 = scored
- `item_key`: `prediction` · `explanation` · `free_counterfactual` · `free_explanation` ·
  `imposed_counterfactual` · `imposed_explanation` · `concepts` — one row each, so nine rows
  per sketch. `rt_ms` is per question, since each has its own page.
- `concept_order_json`: the presentation order of that concept list, so position bias is auditable
- `concepts_json` for `block` 2 and 3 is the **final** selection of a list that was pre-filled
  with the previous block's `concepts_json` (same `session_id`, same `scene_id`). The pre-fill
  is therefore fully reconstructible and the per-block diff is derivable; a short `rt_ms` on
  those two pages is expected, not a sign of inattention. Block 1 always starts empty.
- `resumed = 1`: the participant refreshed or returned; treat `rt_ms` as unreliable
- Retries can duplicate rows — deduplicate on `event_id` before analysis.
