/**
 * Calendar Routing — shared type model.
 *
 * A reusable "Qualification → Routing → Calendar" engine: a lead answers
 * qualification questions on a calendar page, and based on the answers the flow
 * either loads the correct salesperson's GHL calendar embed OR shows an inline
 * "not a fit" card with an optional downsell CTA.
 *
 * Config lives in a typed code registry (registry.ts) keyed by page. The engine
 * reads it through getRoutingConfig() so a DB/admin layer could be swapped in
 * later without changing the component or the evaluator.
 */

/** A single qualification question. */
export interface RoutingQuestion {
  /** Stable answer key — used in Answers, rule conditions, and GHL prefill maps. */
  id: string;
  /** Visible question text. */
  label: string;
  /** Render style. Both are single-select today. */
  type: "radio" | "select";
  /** Whether an answer is required to advance (defaults to true). */
  required?: boolean;
  options: ReadonlyArray<{ value: string; label: string }>;
  /**
   * When true, selecting the `other` option reveals an OPTIONAL free-text input.
   * The typed value is stored under `${id}_other` in Answers (empty allowed).
   * Requires an option with value "other" in `options` so routing rules + the
   * config guard can still reference it.
   */
  allowOther?: boolean;
  /** Placeholder for the revealed "Other" text input. */
  otherPlaceholder?: string;
  /**
   * Optional answer-driven label overrides for THIS question's options. When the
   * lead's answer to `dependsOn` (an earlier question id) has a mapped entry, the
   * matching option's visible label is swapped — e.g. re-word "AI / lead gen" by
   * the lead's stated interest. Falls back to the static option `label` when
   * there's no match. Purely presentational: routing/scoring read option VALUES,
   * never labels, so an adaptive label can never change an outcome.
   */
  adaptiveLabels?: {
    /** An earlier question id whose answer selects the label set. */
    dependsOn: string;
    /** answerValue (of `dependsOn`) → { optionValue (of this question) → label }. */
    map: Record<string, Record<string, string>>;
  };
}

/** A required-to-proceed acknowledgement checkbox shown before the calendar. */
export interface RoutingConsent {
  /** Stable id — stored as `consent_${id}` in Answers. */
  id: string;
  /** Visible acknowledgement text. */
  label: string;
  /** Whether the box must be checked to advance (defaults to true). */
  required?: boolean;
}

/** A salesperson and the GHL calendar a routed lead should book on. */
export interface Salesperson {
  /** Stable id referenced by routing rules. */
  id: string;
  name: string;
  /** Optional title shown on the "matched strategist" card (e.g. "Senior Growth Strategist"). */
  role?: string;
  /** Optional headshot shown on the "matched strategist" card; falls back to name initials when unset. */
  avatarUrl?: string;
  /** Calendar booking URL (any provider), e.g. https://calendar.example/booking/<calendarId> */
  bookingUrl: string;
  /**
   * GHL calendarId (the `/widget/booking/<id>` suffix). Used by the availability-
   * weighted balancer to read this closer's open slots via the GHL free-slots API.
   * Must equal the bookingUrl suffix (guard-checked).
   */
  calendarId?: string;
}

/** The lead's answers, keyed by question id. */
export type Answers = Record<string, string>;

/** A single condition over one question's answer. */
export interface RuleCondition {
  questionId: string;
  /** Answer matches when its value is in this set. */
  in: ReadonlyArray<string>;
}

/** Where a lead ends up. */
export type RoutingOutcome =
  | { type: "assign"; salespersonId: string }
  | { type: "disqualify"; reason?: string };

/** An ordered routing rule. First matching rule wins. */
export interface RoutingRule {
  when: ReadonlyArray<RuleCondition>;
  /** "all" = every condition must match (default); "any" = at least one. */
  matchMode?: "all" | "any";
  outcome: RoutingOutcome;
}

/** A downsell / next-step link. */
export interface DownsellCta {
  label: string;
  href: string;
}

/** Copy + optional qualification call + downsell shown when a lead is disqualified. */
export interface DisqualifiedCopy {
  headline: string;
  body: string;
  /**
   * Optional short qualification-call calendar embedded INSIDE the DQ card (e.g.
   * a 15-min qualifier). When set, a disqualified lead still books a (shorter)
   * call instead of only seeing a downsell — a soft-DQ rather than a dead end.
   */
  bookingUrl?: string;
  /**
   * Optional small-print disclosure shown with the embedded `bookingUrl` calendar
   * (e.g. a refundable booking-fee notice). Informational only — rendered as a
   * calm info note, never a CTA-styled element.
   */
  bookingNote?: string;
  /** Default downsell CTA — e.g. self-serve offer, resource, or newsletter. */
  cta?: DownsellCta;
  /**
   * Dynamic downsell: when the lead's answer for `questionId` has a mapped CTA,
   * it REPLACES `cta` (e.g. route by stated interest to the most relevant
   * self-serve offer). Falls back to `cta` when there's no match.
   */
  downsellByAnswer?: { questionId: string; map: Record<string, DownsellCta> };
}

/**
 * Country tiering for the country-weighted lead score. ISO alpha-2 codes; any
 * country not in tier1/tier2 — or no country captured — scores as tier 3.
 */
export interface CountryScoring {
  /** Reserved answer key holding the lead's ISO (defaults to "__country_iso"). */
  answerKey?: string;
  tier1: ReadonlyArray<string>;
  tier2: ReadonlyArray<string>;
  tier1Points: number;
  tier2Points: number;
  tier3Points: number;
}

/**
 * Lead-scoring router: sum weighted points across answers + country tier, then
 * map the total to an outcome via ordered bands (first band whose `minScore` is
 * ≤ the total wins). When a RoutingConfig has `scoring`, the evaluator uses it
 * AFTER any hard `rules` and BEFORE `defaultOutcome`. Banding (not single-axis
 * gates) is what keeps revenue — or any one answer — from disqualifying a lead
 * on its own: a DQ requires a low TOTAL across every axis.
 */
export interface RoutingScoring {
  /** questionId → { answerValue → points }. Answers not listed contribute 0. */
  points: Record<string, Record<string, number>>;
  /** Optional country-tier weighting (the heaviest axis for book-a-call). */
  country?: CountryScoring;
  /** Ordered high→low. The first band whose `minScore` ≤ total wins. */
  bands: ReadonlyArray<{ minScore: number; outcome: RoutingOutcome }>;
  /**
   * Optional volume balancer. When present, a QUALIFIED score (one whose band is
   * an `assign` to a listed `closerIds` salesperson) is re-routed to the
   * least-loaded eligible closer instead of the raw band winner — keeping the
   * listed closers' call volume within `maxSpreadPct` of each other over a
   * rolling `windowDays` window, while the score only tilts WHICH closer gets the
   * better leads inside that band. The DQ band + any non-listed assign are left
   * exactly as the bands decide. See balancedAssign() in evaluate.ts.
   */
  balance?: {
    /** The salespeople to balance across (e.g. the 3 closers; excludes the DQ host). */
    closerIds: ReadonlyArray<string>;
    /** Max load spread as a fraction of average (default 0.15 = within ~15%). */
    maxSpreadPct?: number;
    /** Rolling window (days) the load counts are read over (default 30). */
    windowDays?: number;
    /**
     * Optional calendar-availability overflow gate. When enabled, a closer with fewer
     * than `minSlots` open slots in the next `weekdays` business days is excluded from
     * the eligible pool, so his share overflows to the next-best available closer.
     * Volume remains EQUAL across the eligible pool (not proportional). Falls back to
     * equal count-balancing across all closers when availability can't be read.
     */
    availability?: {
      enabled: boolean;
      /** Business days ahead to count open slots (default 2). */
      weekdays?: number;
      /** Minimum open slots to stay eligible; closers below this are skipped (default 1). */
      minSlots?: number;
      /** IANA timezone for the free-slots query (default America/New_York). */
      timezone?: string;
    };
  };
}

/** Per-page routing configuration. */
export interface RoutingConfig {
  /** Registry key, matches the page (e.g. "book-a-call"). */
  key: string;
  /** Journey funnel name used for createJourney() / journey stages. */
  funnel: string;
  /**
   * Contact fields to collect up front (name + email always collected).
   * - phone: render a phone input
   * - phoneCountry: pair the phone input with a country-code dropdown (default
   *   +1/US); captures the dial code (Answers.__phone_cc) + country name
   *   (Answers.__country) and composes E.164 for GHL prefill
   * - website: render an OPTIONAL website field (Answers.__website)
   */
  contactFields?: { phone?: boolean; phoneCountry?: boolean; website?: boolean };
  questions: ReadonlyArray<RoutingQuestion>;
  /**
   * Acknowledgement checkboxes shown as a final gate before the calendar. All
   * `required` boxes must be checked to advance — a commitment filter, NOT a
   * routing input (consents never feed evaluateRouting()).
   */
  consents?: ReadonlyArray<RoutingConsent>;
  salespeople: ReadonlyArray<Salesperson>;
  /** Ordered; first match wins. Evaluated BEFORE `scoring` (hard overrides). */
  rules: ReadonlyArray<RoutingRule>;
  /**
   * Optional lead-scoring router. When present, the evaluator scores the answers
   * and maps the total to an outcome — used AFTER `rules` and BEFORE
   * `defaultOutcome`. This is how book-a-call routes best/mid/worst/DQ.
   */
  scoring?: RoutingScoring;
  /** Outcome when no rule matches (and no scoring band catches). */
  defaultOutcome: RoutingOutcome;
  disqualified: DisqualifiedCopy;
  /**
   * Maps an answer id → the GHL calendar widget's prefill Query Key, so the
   * assigned salesperson sees the answers prefilled on the booking widget.
   * Optional — answers without a mapping are simply not prefilled.
   */
  ghlPrefillKeys?: Record<string, string>;
  /**
   * Maps an answer id → a GHL custom-field UUID. When set, the answer is written
   * to the contact via setCustomFields(). Optional — empty by default so the
   * flow never depends on field IDs that may not be configured yet.
   */
  ghlFieldIds?: Record<string, string>;
}
