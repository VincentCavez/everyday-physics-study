/**
 * Tous les textes vus par le participant. La section `drawingConvention` et les
 * intitulés d'items sont donnés VERBATIM au modèle lors de la passation
 * automatique : les deux côtés doivent recevoir exactement la même consigne
 * (§ Model side and analysis). Ne pas reformuler d'un côté seulement.
 */

export const AXIS_LABELS = {
  projection: "Throwing, launching and falling objects",
  oscillation_elasticity: "Bouncing, springs and swinging",
  equilibrium_levers: "Balancing, see-saws and tipping",
  friction: "Sliding, rubbing, and surfaces that slow things down",
  collision: "Objects bumping into each other",
} as const;

export const consent = {
  title: "About this study",
  body: [
    "You are invited to take part in a short online study about how people think about everyday physical situations — things falling, bouncing, sliding, balancing and bumping into each other.",
    "You will see a series of simple hand-drawn sketches, each with a short description. For each one you will be asked what you think happens next, and why. There are no right or wrong answers: we are interested in what ordinary people expect to happen, not in textbook physics.",
    "The study takes about 35 minutes. Your answers are recorded anonymously and linked only to your Prolific ID, which is used to pay you and is not published. Anonymised responses may be shared as part of scientific publication.",
    "Taking part is voluntary. You can stop at any time by closing the window, though you will only be paid for a completed session.",
    "PLACEHOLDER — add ethics approval reference, data controller and contact e-mail before launch.",
  ],
  checkbox: "I have read the information above and I agree to take part.",
  button: "Start",
};

export const selfAssessment = {
  title: "Last few questions",
  intro:
    "That is the sketches done. To finish, a few quick questions about you. There are no right answers here either — please just answer honestly.",
  familiarityPrompt: "How familiar do you consider yourself with each of the following?",
  familiarityScale: ["1 — not familiar at all", "2", "3", "4", "5 — very familiar"],
  confidenceItem: "Overall, how confident do you feel about physics?",
  confidenceScale: ["1 — not at all confident", "2", "3", "4", "5 — very confident"],
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
    "You will see 6 sketches, one at a time, each with a short description of what it shows. The first sketch is a practice round so you can get used to the questions.",
    "For each sketch you will be asked three sets of questions: what you think happens next, what would happen if you changed something in the scene, and what would happen if we changed something specific.",
    "You are asked one question per page. Please answer in your own words — a sentence or two is plenty. We want your first reaction, not a carefully worked-out calculation.",
    "Each answer is final once you move on, and you cannot go back. After a couple of questions a list of options will appear for you to tick; we ask you to write in your own words first, which is why the list comes afterwards.",
  ],
  /** Donné mot pour mot au modèle. */
  drawingConvention:
    "The sketches use one drawing convention: a thick yellow arrow — the motion arrow — shows movement, or the direction something is being sent off in. Everything else in the drawing is just the scene itself.",
  conventionCaption:
    "Here the motion arrow means the ball has been thrown up and to the right — it is not a rope, a line or part of the scene.",
  conventionSceneId: "1-01-baseball-pitch",
  button: "I understand — begin",
};

export const scenario = {
  trialTag: "practice, does not count",
  blockTitles: {
    1: "What happens next",
    2: "Change something yourself",
    3: "One more change",
  },
  /**
   * Les trois questions principales sont ancrées dans la scène (§ scenes.json,
   * champs `prediction` et `outcome`). Trois raisons, toutes documentées :
   *
   *  - « What happens next? » est ambigu en échelle de temps. Les observateurs
   *    segmentent un même événement à ~6 granularités emboîtées (Zwaan &
   *    Radvansky ; théorie de la segmentation), donc deux participants
   *    répondent à des questions différentes. Nommer l'objet et l'issue
   *    supprime cette variance — c'est ce que fait le paradigme de référence
   *    en physique intuitive (Battaglia et al. 2013 : « Will it fall? », « In
   *    which direction? », plutôt qu'une question ouverte).
   *  - Les dimensions d'un modèle de situation sont représentées à la demande
   *    (« people track space when asked ») : ce qu'on ne demande pas, on ne
   *    l'obtient pas.
   *  - Une question à deux volets est interprétée de façon inconsistante par
   *    les non-spécialistes (Adams et al. 2006, CLASS). L'ancien contrefactuel
   *    libre en posait deux d'un coup (« ce que vous changez » ET « ce qui se
   *    passerait ») : il est scindé, la page 1 ne demande que l'intervention.
   *
   * Le contrefactuel libre fixe l'issue et laisse l'intervention libre : c'est
   * l'attribut choisi qui est mesuré (§ RQ2, pertinence causale), et le fixer
   * ne le contraint pas — la propriété exacte n'est jamais nommée.
   * Le contrefactuel imposé reprend mot pour mot la question de prédiction du
   * bloc 1 : la comparaison de direction n'a de sens que si les deux blocs
   * portent sur la même issue.
   */
  items: {
    explanation: "Why do you think that will happen?",
    freeCounterfactual: (outcome: string) =>
      `What one thing in the scene could you change to make a difference to ${outcome}?`,
    freeExplanation: "Why would that change make a difference?",
    imposed: (clause: string, prediction: string) => `Now imagine that ${clause}. ${prediction}`,
    imposedExplanation: "Why do you think that would happen?",
  },
  conceptPrompt:
    "Which of these, if any, played a part in what you just described? Tick as many or as few as you like.",
  otherPlaceholder: "Please specify",
  confidencePrompt: "How confident are you about that?",
  confidenceScale: ["1 — not at all", "2", "3", "4", "5 — very confident"],
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
    "We could not save your answers to our server. Please download your data with the button below and message us through Prolific, attaching the file — you will still be paid.",
  downloadButton: "Download my answers",
  previewNotice: "Preview mode — no data is being recorded and no completion code will be issued.",
};
