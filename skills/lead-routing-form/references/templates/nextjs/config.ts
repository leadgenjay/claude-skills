/**
 * Lead Routing Form — your routing config (the ONLY file you normally edit).
 *
 * The interview fills this in. The shape is documented in references/config-schema.md;
 * the full types live in ./engine/types. A complete worked example is
 * references/templates/book-a-call.example.json.
 *
 * Install layout (copy these from the skill into your project):
 *   src/lib/lead-routing/engine/{evaluate.ts,types.ts,countries.ts}   ← verbatim engine
 *   src/lib/lead-routing/config.ts                                     ← THIS file
 *   src/components/lead-routing/qualification-router.tsx               ← the form
 *   src/app/api/<key>/submit/route.ts                                  ← webhook forwarder
 *
 * Adjust the relative import below to wherever you placed the engine.
 */

import type { RoutingConfig } from "./engine/types";

export const ROUTING_CONFIG: RoutingConfig = {
  key: "book-a-call",
  funnel: "book-a-call",
  contactFields: { phone: true, phoneCountry: true, website: true },
  questions: [
    {
      id: "interest",
      label: "What are you most interested in?",
      type: "radio",
      required: true,
      allowOther: true,
      otherPlaceholder: "Tell us what you're after…",
      options: [
        { value: "lead-gen", label: "Lead generation" },
        { value: "ai-automation", label: "AI & Automation" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "monthly_revenue",
      label: "What's your current monthly revenue?",
      type: "radio",
      required: true,
      options: [
        { value: "lt-5k", label: "Under $5K/mo" },
        { value: "5k-25k", label: "$5K – $25K/mo" },
        { value: "25k-100k", label: "$25K – $100K/mo" },
        { value: "100k-500k", label: "$100K – $500K/mo" },
        { value: "500k-plus", label: "$500K+/mo" },
      ],
    },
    {
      id: "journey_stage",
      label: "Where are you in your journey?",
      type: "radio",
      required: true,
      options: [
        { value: "curious", label: "Just curious and exploring" },
        { value: "looking", label: "Actively looking for solutions" },
        { value: "ready", label: "Ready to work with you — just have a few questions" },
      ],
    },
  ],
  consents: [
    {
      id: "respect",
      label: "I understand slots are limited. I'll show up to my call at the time I book.",
      required: true,
    },
  ],
  salespeople: [
    { id: "general", name: "Strategy Team", role: "Strategy Team", bookingUrl: "https://YOUR-CALENDAR.example/booking/general" },
    { id: "senior", name: "Senior Strategist", role: "Senior Growth Strategist", bookingUrl: "https://YOUR-CALENDAR.example/booking/senior" },
    { id: "mid", name: "Growth Strategist", role: "Growth Strategist", bookingUrl: "https://YOUR-CALENDAR.example/booking/mid" },
    { id: "qualifier", name: "Qualification Specialist", role: "Qualification Specialist", bookingUrl: "https://YOUR-CALENDAR.example/booking/qualifier" },
  ],
  rules: [],
  scoring: {
    points: {
      monthly_revenue: { "lt-5k": 0, "5k-25k": 1, "25k-100k": 2, "100k-500k": 3, "500k-plus": 3 },
      journey_stage: { curious: 0, looking: 2, ready: 3 },
    },
    country: {
      answerKey: "__country_iso",
      tier1: ["US", "CA", "GB", "AU", "NZ", "IE"],
      tier2: ["AE", "AT", "BE", "CH", "DE", "DK", "ES", "FI", "FR", "HK", "IL", "IT", "JP", "NL", "NO", "PL", "PT", "SA", "SE", "SG"],
      tier1Points: 5,
      tier2Points: 2,
      tier3Points: 0,
    },
    bands: [
      { minScore: 9, outcome: { type: "assign", salespersonId: "senior" } },
      { minScore: 6, outcome: { type: "assign", salespersonId: "mid" } },
      { minScore: 3, outcome: { type: "assign", salespersonId: "qualifier" } },
      { minScore: 0, outcome: { type: "disqualify", reason: "needs_qualification" } },
    ],
  },
  defaultOutcome: { type: "assign", salespersonId: "general" },
  disqualified: {
    headline: "Let's start with a quick qualification call",
    body: "Based on your answers, a short qualification call is the best next step. Prefer to move faster on your own? Grab the self-serve option below.",
    bookingUrl: "https://YOUR-CALENDAR.example/booking/qualifier",
    cta: { label: "Get the self-serve option", href: "https://YOUR-SITE.example/offer" },
    downsellByAnswer: {
      questionId: "interest",
      map: {
        "lead-gen": { label: "Get the lead-gen starter", href: "https://YOUR-SITE.example/lead-gen-offer" },
        "ai-automation": { label: "Explore the automation program", href: "https://YOUR-SITE.example/automation-offer" },
      },
    },
  },
  ghlPrefillKeys: {
    interest: "interest",
    monthly_revenue: "monthly_revenue",
    journey_stage: "journey_stage",
  },
};
