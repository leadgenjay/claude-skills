# Conflict Resolution Rules

## Resolution priority

Unless the user decides otherwise:

1. safety, legal, license, and data integrity
2. explicit user requirements and approved contract
3. target public behavior and backward compatibility
4. target architecture and existing integrations
5. source capability semantics
6. source implementation details
7. developer convenience

## Common conflict classes

| Area | Default resolution |
|---|---|
| Auth | Keep target identity/session system; map source concepts through adapters |
| Authorization | Preserve target role/tenant model; reimplement source checks |
| Database | Keep target database and migration tooling; translate source schema |
| Billing | Keep target billing and entitlements; map source paid features |
| UI | Reimplement with target design system unless visual fidelity is the primary goal |
| State management | Use target pattern; preserve source behavior, not its state library |
| APIs | Preserve target contracts; add adapters or versioned endpoints |
| Deployment | Keep target platform; split services only with explicit approval |
| Logging/observability | Use target stack and correlation conventions |
| Email/queues/storage | Replace source provider with target abstraction when available |
| Dependencies | Avoid duplicates; use target-compatible versions |
| Config/env | Preserve target naming when stable; document mappings |
| Testing | Port behavioral tests; rewrite harness-specific implementation |
| Licensing | Prefer reimplementation/reference when direct copying creates obligations the user has not approved |

## Risk classification

### High risk — user decision required

- destructive or irreversible data migration
- replacing auth, authorization, billing, or production deployment
- changing externally visible behavior or public APIs
- adding a new paid service or material operational burden
- transmitting sensitive data to a new party
- license incompatibility or source-disclosure obligations
- removing security controls
- cutover and rollback choices

### Medium risk — recommend, ask when product-sensitive

- new runtime or major dependency
- substantial schema redesign
- visual behavior changes
- background jobs and retry semantics
- upstream synchronization strategy
- new environment configuration

### Low risk — auto-resolve and record

- file placement following target conventions
- formatting, naming, lint, and test harness adaptation
- replacing duplicate utility libraries
- target-native error and logging wrappers
- non-semantic refactors needed for integration

## Strategy vocabulary

- **Preserve:** retain source behavior and implementation with minimal changes
- **Adapt:** keep implementation but conform it to target interfaces
- **Reimplement:** reproduce behavior using target-native implementation
- **Replace:** use an existing target capability instead
- **Isolate:** place behind an adapter or service boundary
- **Vendor:** consume as an external or vendored dependency
- **Reject:** omit intentionally
- **Reference:** learn from source without copying code

## Recommendation format

For each unresolved conflict, provide:

- **Recommended:** one strategy
- **Why:** evidence-based reason
- **Tradeoff:** what is lost or made harder
- **Options:** 2–4 concrete alternatives
- **Decision effect:** files, migrations, tests, rollout, and maintenance affected
