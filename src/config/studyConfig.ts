/**
 * Seul point de réglage de l'étude. Rien de secret ici : le code de complétion
 * Prolific vit dans l'onglet `meta` du Sheet et n'est renvoyé qu'à la fin, par
 * le serveur — il ne doit jamais apparaître dans le bundle.
 */
export const studyConfig = {
  /**
   * URL /exec du déploiement Apps Script (voir study/README.md).
   *
   * VIDE SUR LA BRANCHE v2, ET C'EST VOLONTAIRE. La v2 écrit 32 colonnes, des
   * `item_key` nouveaux et une colonne `stage` là où la v1 avait `block` : la
   * laisser pointer vers le déploiement de la vague du 04/09/2026
   * (AKfycby4Gyov8s2X…) ferait entrer des lignes v2 dans le Sheet v1, et un
   * simple aperçu local y écrivait déjà une ligne `preview`.
   *
   * À remplir à l'étape « nouveau Sheet, nouveau déploiement » : classeur
   * neuf, `setup()` (qui écrit lui-même les 32 colonnes puisque l'onglet est
   * vide), code de complétion recopié dans l'onglet `meta`, puis l'URL ici.
   * Tant qu'elle est vide, l'app tourne en aperçu PUREMENT LOCAL : elle
   * n'atteint aucun réseau, n'enregistre rien et ne délivre aucun code.
   */
  appsScriptUrl: "",

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
      /** Index de la scène scorée (1..5) où l'injecter. La v2 n'a plus qu'UNE
          liste de concepts par scène, donc plus de champ `block` : il n'y a
          plus de choix à faire une fois la scène désignée. */
      scenarioIndex: 3,
    },
  },

  /** File d'events : envoi groupé, réessais. */
  network: {
    flushDebounceMs: 400,
    /** délai maximal de rétention d'une réponse enfilée hors fin de bloc */
    maxHoldMs: 4 * 60 * 1000,
    maxRetries: 6,
    backoffBaseMs: 1000,
    backoffMaxMs: 30000,
    /** au-delà, on prévient le participant que la sauvegarde ne passe pas */
    warnAfterFailures: 3,
  },

  /** Redirection automatique vers Prolific, en secondes (0 = manuelle). */
  redirectDelaySeconds: 5,
};
