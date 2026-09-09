/**
 * Tous les textes vus par le participant. La section `drawingConvention` et les
 * intitulés d'items sont donnés VERBATIM au modèle lors de la passation
 * automatique : les deux côtés doivent recevoir exactement la même consigne
 * (§ Model side and analysis). Ne pas reformuler d'un côté seulement.
 */

import { studyConfig } from "./studyConfig";

/** 5 scènes scorées + 1 scène d'entraînement. Écrit ici plutôt que recopié en
    dur dans les consignes : le nombre de scènes par participant est le levier
    d'ajustement d'après pilote, et une consigne qui annonce « 6 sketches »
    quand le tirage en sert 5 est un mensonge silencieux. */
const N_SKETCHES = studyConfig.scoredCount + 1;

export const AXIS_LABELS = {
  projection: "Throwing, launching and falling objects",
  oscillation_elasticity: "Bouncing, springs and swinging",
  equilibrium_levers: "Balancing, see-saws and tipping",
  friction: "Sliding, rubbing, and surfaces that slow things down",
  collision: "Objects bumping into each other",
} as const;

// DURÉE ANNONCÉE : « about 35 minutes » vaut pour le protocole v1 (trois blocs
// par scène). La v2 en change complètement la forme — un stage 1 plus court,
// mais deux stages de notation dont la longueur dépend du nombre d'outils de la
// scène (mesuré : de 1 à 7). À RE-CHIFFRER sur un passage chronométré avant
// lancement, y compris sur une scène à 7 outils et sur une scène à 1 outil.
export const consent = {
  title: "About this study",
  body: [
    "You are invited to take part in a short online study about how people think about everyday physical situations.",
    "You will see a series of simple hand-drawn sketches, each with a short description. For each one you will be asked what you think happens next and why, and then to rate a few short descriptions and a few drawing tools that a computer program produced for that same sketch. There are no right or wrong answers: we are interested in what people expect to happen, not in textbook physics.",
    "The study takes about 35 minutes. Your answers are recorded anonymously and linked only to your Prolific ID, which is used to pay you and is not published. Anonymized responses may be shared as part of scientific publication.",
    "Taking part is voluntary. You can stop at any time by closing the window, though you will only be paid for a completed session.",
  ],
  checkbox: "I have read the information above and I agree to take part.",
  button: "Start",
};

export const selfAssessment = {
  title: "Last few questions",
  intro:
    "That is the sketches done. To finish, a few quick questions about you. There are no right answers here either — please just answer honestly.",
  familiarityPrompt: "How familiar do you consider yourself with each of the following?",
  familiarityScale: [
    "1 — not familiar at all",
    "2 — slightly familiar",
    "3 — somewhat familiar",
    "4 — quite familiar",
    "5 — very familiar",
  ],
  confidenceItem: "Overall, how confident do you feel about physics?",
  confidenceScale: [
    "1 — not at all confident",
    "2 — slightly confident",
    "3 — somewhat confident",
    "4 — fairly confident",
    "5 — very confident",
  ],
  educationItem: "What is the highest level of physics teaching you have completed?",
  educationOptions: [
    "None",
    "Physics at school (up to age 16)",
    "Physics at school (age 16–18)",
    "Some physics at university level",
    "A degree in physics or engineering",
    "Postgraduate study in physics",
    "Prefer not to say",
  ],
  button: "Continue",
};

export const instructions = {
  title: "How this works",
  body: [
    `You will see ${N_SKETCHES} sketches, one at a time, each with a short description of what it shows. The first sketch is a practice round so you can get used to the questions.`,
    "For each sketch you go through three parts. First you say in your own words what you think happens, what has an effect on it, and what you would change. Then you read some descriptions of what might happen and rate each one. Then you look at some tools that would let you change the drawing, and rate those too.",
    "Please answer in your own words — a sentence or two is plenty. We want your first reaction, not a carefully worked-out calculation. When you rate something, there are no right answers: we want to know how well it matches what YOU had in mind.",
    "You cannot go back to a question once you have moved on.",
  ],
  /** Donné mot pour mot au modèle. */
  drawingConvention:
    "The sketches use one drawing convention: a dashed yellow arrow — the motion arrow — shows movement, or the direction something is being sent off in. Everything else in the drawing is just the scene itself.",
  conventionCaption: "Here the motion arrow means the ball has been thrown up and to the right.",
  conventionSceneId: "1-01-baseball-pitch",
  button: "I understand — begin",
};

export const scenario = {
  trialTag: "practice, does not count",

  // ── Stage 1 · la théorie du participant ──────────────────────────────────
  //
  // Les deux énoncés restent ANCRÉS DANS LA SCÈNE (`prediction` et `outcome`
  // de scenes.json) plutôt que génériques. Trois raisons, toutes mesurées
  // ailleurs, et toutes encore vraies en v2 :
  //
  //  - « What happens next? » est ambigu en échelle de temps. Les observateurs
  //    segmentent un même événement à plusieurs granularités emboîtées, donc
  //    deux participants répondent à des questions différentes. Nommer l'objet
  //    et l'issue supprime cette variance — c'est ce que fait le paradigme de
  //    référence en physique intuitive (Battaglia et al. 2013 : « Will it
  //    fall? », « In which direction? », jamais une question ouverte).
  //  - Les dimensions d'un modèle de situation sont représentées à la demande :
  //    ce qu'on ne demande pas, on ne l'obtient pas.
  //  - Une question à deux volets est interprétée de façon inconsistante par
  //    les non-spécialistes (Adams et al. 2006, CLASS). Le contrefactuel fixe
  //    donc l'issue et laisse l'intervention libre : c'est l'attribut choisi
  //    qui est mesuré, et le fixer ne le contraint pas — la propriété exacte
  //    n'est jamais nommée.
  //
  // La comparabilité avec la vague du 04/09/2026 N'EST PLUS UNE CONTRAINTE
  // (décision de Vincent, 09/09 : ces données-là sont ignorées). Les libellés
  // de la v2 sont donc libres, et `free_counterfactual` a effectivement changé
  // de formulation en gardant sa clé. Ne pas rétablir cette contrainte sans
  // rétablir aussi les libellés : une clé stable sous deux énoncés différents
  // est le pire des deux mondes.
  items: {
    /**
     * CE QUI DÉCIDE DE L'ISSUE (rétabli le 2026-09-09, retour de Vincent).
     *
     * La v2 avait perdu l'item « pourquoi » de la v1 en supprimant les blocs :
     * il n'y restait qu'une prédiction et un levier, si bien que le participant
     * ne disait JAMAIS quelles propriétés sont en jeu autrement qu'en cochant
     * une liste de 37 options. Or toute l'architecture repose sur la prose qui
     * PRÉCÈDE la liste, pour disposer d'une mesure non indicée à confronter à
     * la mesure indicée. Et le stage 2, qui fait noter des THÉORIES contre
     * « ce que vous pensiez », notait contre quelque chose que personne
     * n'avait formulé.
     *
     * Formulation VISÉE SUR LES PROPRIÉTÉS plutôt que le « Why do you think
     * that will happen? » de la v1 (décision de Vincent) : elle demande ce qui
     * A UN EFFET (« decide » a été écarté le 09/09 : trop tranchant, il
     * appelait UNE cause souveraine là où la scène en a plusieurs, et c'est
     * l'inverse de ce que le stage 3 fait noter), ce que produit aussi le
     * pipeline, donc les deux côtés parlent
     * enfin de la même chose. Cet item n'est pas
     * la même question que l'`explanation` de la v1, d'où une clé NOUVELLE
     * (`what_decides`) : deux questions différentes ne doivent jamais se
     * mélanger sous le même nom, même quand la vague précédente est ignorée.
     *
     * L'ordre compte : ce qui décide AVANT ce qu'on changerait. Les deux ne
     * sont pas la même question (on peut changer autre chose que le
     * déterminant principal, parce que c'est ce qu'on a sous la main), et
     * c'est précisément cet écart que l'étude mesure.
     *
     * PLURIEL ASSUMÉ dans les deux énoncés, « thing(s) » (décision de Vincent,
     * 09/09) : le stage 3 propose ENSUITE plusieurs outils, chacun portant une
     * propriété. Une question au singulier (« What one thing... ») demanderait
     * au participant de n'en désigner qu'une, puis lui en ferait noter n : la
     * note du deuxième outil se lirait alors comme un refus alors qu'elle ne
     * dit que « ce n'est pas celui que j'avais choisi ». La forme « (s) »
     * autorise une réponse unique sans jamais l'imposer.
     */
    whatDecides: (outcome: string) => `What thing(s) in the scene have an effect on ${outcome}?`,
    freeCounterfactual: (outcome: string) =>
      `What thing(s) in the scene could you change to make a difference to ${outcome}?`,
  },

  /** L'UNIQUE item de confiance de l'élicitation, une fois par scène, posée
      une fois les TROIS zones verrouillées. D'où le pluriel : au singulier,
      le participant ne saurait pas laquelle des trois il note, et la mesure
      ne voudrait plus dire la même chose d'une personne à l'autre. Le
      questionnaire final garde par ailleurs sa confiance générale en 1-5. */
  confidencePrompt: "How sure are you about your answers?",
  confidenceLow: "0 = not sure at all",
  confidenceHigh: "10 = completely sure",

  conceptPrompt:
    "Which of these, if any, played a part in what you just described? Tick as many or as few as you like.",
  otherPlaceholder: "Please specify",

  /** Classement partiel : on n'ordonne QUE ce qui a été coché. Sauté quand il y
      a moins de deux options classables — il n'y a alors rien à ordonner. */
  rankPrompt: (outcome: string) =>
    `Among the properties you ticked, rank them from the one that affects ${outcome} the most to the least.`,
  rankHint: "Click the one that matters most, then drag the rest into order.",
  rankTopHint: "Click the one that matters most.",

  // ── Stage 2 · notation des théories ──────────────────────────────────────
  theoriesIntro:
    "Here are some descriptions of what might happen in this drawing. Rate each one on its own.",
  theoryRatePrompt: "How well does this match what you thought?",
  theoryRateLow: "0 = not at all what I had in mind",
  theoryRateHigh: "10 = exactly what I had in mind",
  /** Second temps de chaque théorie (décision de Vincent, 09/09) : le seul
      endroit où « le pipeline retire ce qui ne joue pas » peut être crédité.
      Une théorie sélective perd sinon contre une théorie exhaustive à l'item
      de ressemblance, même quand elle a raison de se taire. */
  theoryExcessPrompt: "Is there anything in this description that does not actually matter here?",
  theoryExcessLow: "0 = nothing, it all matters",
  theoryExcessHigh: "10 = yes, a lot of it doesn't matter",
  theoryChoicePrompt: "Which one is closest to what you thought?",

  // ── Stage 3 · notation des outils ────────────────────────────────────────
  toolsIntro:
    "Imagine an app where you could change this drawing and watch what happens. Below are some tools it might give you for this drawing. Rate each one on its own.",
  toolFitPrompt: "How well does this tool let you try what you had in mind?",
  toolFitLow: "0 = not at all what I had in mind",
  toolFitHigh: "10 = exactly what I had in mind",
  valuesLabel: "Values:",
  toolValuesPrompt: "Do these options make sense for this drawing?",
  toolValuesLow: "0 = not at all",
  toolValuesHigh: "10 = perfectly",
  wishPrompt: "Is there something else you would want to change in this drawing?",
  wishOptional: "Optional.",

  submitProse: "Continue",
  submitConcepts: "Continue",
  finalNotice: "You will not be able to change this answer.",
};

export const completion = {
  title: "Thank you",
  body: "That is the end of the study. Your answers have been saved.",
  codeLabel: "Your completion code:",
  redirect: "You will be returned to Prolific automatically.",
  manual: "If you are not returned automatically, use the button below.",
  button: "Return to Prolific",
};

export const errors = {
  gateTitle: "Please use a computer",
  gateBody:
    "This study shows detailed drawings and needs a larger screen. Please open it on a desktop or laptop computer, in a maximised window.",
  fullTitle: "This study is complete",
  fullBody:
    "All available slots have now been filled. Please return your submission on Prolific so you are not charged for an incomplete study — you will not be penalised for returning it.",
  closedTitle: "This study is not currently open",
  closedBody: "Please return your submission on Prolific. You will not be penalised.",
  saveWarning:
    "We are having trouble saving your answers. Please check your internet connection — your answers are kept on this device in the meantime, and will be sent automatically when the connection comes back.",
  fatalTitle: "Something went wrong",
  fatalBody:
    "We could not reach our server. Your answers are kept on this device. Please try again in a moment with the button below. If it keeps failing, download your answers with the second button and message us through Prolific (paste the content of the file into the message) — you will still be paid.",
  nocodeTitle: "Your answers have been saved",
  nocodeBody:
    "All your answers reached our server, but we could not retrieve your completion code because the server is busy. Please try again in a moment with the button below. If that still fails, return to Prolific, submit with the code NOCODE and send us a short message there: your submission will be approved manually and you will be paid in full.",
  retryButton: "Try again",
  downloadButton: "Download my answers",
  previewNotice: "Preview mode — no data is being recorded and no completion code will be issued.",
};
