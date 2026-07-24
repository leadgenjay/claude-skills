# Deep Interview Taxonomy

Ask only questions that remain unresolved after repository analysis. Ask one at a time, with a recommended answer and concrete consequences.

## 1. Outcome and scope

- Which source capability creates the actual user value?
- Is the goal parity, selective reuse, visual similarity, or workflow inspiration?
- What is explicitly out of scope?
- Which user roles and journeys must remain unchanged?

## 2. Center of gravity

- Should the target remain authoritative, should the source become the base, or should a separate service/package be created?
- Is this a transplant, reimplementation, fork, vendor, or reference-only job?

## 3. Product behavior

- Where source and target behavior differ, which behavior wins?
- Are backward compatibility and existing customers required?
- What constitutes acceptable feature parity?

## 4. Authentication and authorization

- Which identity provider remains authoritative?
- How are users, teams, roles, organizations, sessions, and permissions mapped?
- Can source authorization assumptions be removed or must an adapter preserve them?

## 5. Data and migrations

- Which database/schema is authoritative?
- Must source data be imported, transformed, dual-written, backfilled, or ignored?
- What are retention, tenancy, uniqueness, deletion, and rollback rules?
- Are destructive migrations allowed, and under what approval?

## 6. Integrations

- Which source services should be kept, replaced, or abstracted?
- Who owns credentials and environments?
- What happens when external services fail, rate-limit, or differ between development and production?

## 7. Billing and monetization

- Which billing provider, product catalog, entitlement model, webhooks, and pricing remain authoritative?
- Are source paid features mapped, removed, or granted under target entitlements?

## 8. UI and design system

- Is the source UI copied, restyled, or reimplemented with target components?
- Which navigation, responsive, accessibility, and state conventions win?
- Is visual fidelity or maintainability more important when they conflict?

## 9. Runtime and dependencies

- Can new runtimes, services, packages, containers, or build tools be added?
- Are versions pinned to target constraints?
- Is a package acceptable when an existing target capability already covers it?

## 10. Security, privacy, and compliance

- What data classifications and trust boundaries apply?
- Are telemetry, uploads, callbacks, shell execution, or outbound network access allowed?
- Are compliance or regional constraints relevant?

## 11. Licensing and provenance

- Is the source license compatible with the intended distribution?
- Must notices, attribution, source disclosure, or modification notices be included?
- Should code be copied, behavior reimplemented, or only referenced?

## 12. Deployment and operations

- Which platform, environments, domains, CI/CD, observability, and incident ownership remain authoritative?
- Is a new service acceptable or must everything remain in the existing deployment unit?

## 13. Rollout and migration

- Big bang, feature flag, shadow mode, dual run, canary, or staged migration?
- What is the rollback trigger and mechanism?
- How are existing users and data handled during transition?

## 14. Testing and acceptance

- Which source tests express required behavior?
- What target regressions are unacceptable?
- What measurable criteria define done?
- Which checks require human review or production-like environments?

## 15. Maintenance ownership

- Will the adapted code track upstream changes?
- Who resolves future conflicts and dependency updates?
- Is the source pinned, periodically synced, or intentionally diverged?

## 16. Skill/plugin interface

Only when packaging is requested:

- What is the primary callable job?
- What arguments and outputs should the command expose?
- Can Claude auto-invoke it, or must it be user-only?
- What tools and side effects require approval?
- Project skill, personal skill, plugin, marketplace, subagent, or MCP server?
