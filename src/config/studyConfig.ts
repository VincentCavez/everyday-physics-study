/**
 * Seul point de réglage de l'étude. Rien de secret ici : le code de complétion
 * Prolific vit dans l'onglet `meta` du Sheet et n'est renvoyé qu'à la fin, par
 * le serveur — il ne doit jamais apparaître dans le bundle.
 */
export const studyConfig = {
  /** URL /exec du déploiement Apps Script (voir study/README.md). */
  appsScriptUrl: "PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE",

  /** Retour Prolific après complétion (https://app.prolific.com/submissions/complete?cc=...). */
  prolificCompleteUrl: "https://app.prolific.com/submissions/complete",

  /** Nombre de scènes scorées (une par axe) après la scène d'essai. */
  scoredCount: 5,

  /** Largeur minimale : les stimuli font 1200×800, le mobile est exclu. */
  minViewportWidth: 1000,

  /** Options du protocole (§ Optional variants). Désactivées par défaut. */
  variants: {
    /** Bloc 2 (contrefactuel libre) sur la seule scène scorée d'index donné. */
    freeCounterfactualOnScenario: null as number | null,
  },

  /** Contrôles d'attention (notés à l'analyse, aucune éjection en séance). */
  attentionChecks: {
    /** Item Likert instruit, inséré dans le questionnaire initial. */
    likert: {
      itemKey: "ac_likert",
      label: "To show you are reading carefully, please select 2 on this scale.",
      expected: 2,
    },
    /** Option instruite injectée dans une seule liste de concepts. */
    concept: {
      itemKey: "ac_concept",
      label: "Please tick this option to show you are reading carefully",
      /** index de la scène scorée (1..5) et bloc où l'injecter */
      scenarioIndex: 3,
      block: 2 as const,
    },
  },

  /** File d'events : envoi groupé, réessais. */
  network: {
    flushDebounceMs: 400,
    maxRetries: 6,
    backoffBaseMs: 1000,
    backoffMaxMs: 30000,
    /** au-delà, on prévient le participant que la sauvegarde ne passe pas */
    warnAfterFailures: 3,
  },

  /** Redirection automatique vers Prolific, en secondes (0 = manuelle). */
  redirectDelaySeconds: 5,
};
