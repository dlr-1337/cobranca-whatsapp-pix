---
phase: 03-charge-engine-and-dashboard
plan: "01"
subsystem: charge-domain-and-repository
tags:
  - charges
  - recurring
  - idempotency
  - postgres
  - drizzle
  - multi-tenant
provides:
  - Internal charge model for manual and recurring billing
  - Unique competence guard for recurring generation per subscription
  - Repository lifecycle operations for pay, cancel, and replace without deleting history
affects:
  - recurring-engine
  - charge-lifecycle
  - dashboard-data
  - auditability
tech-stack:
  added:
    - charge domain schemas and recurring helpers
    - DB schema and migration for charges and charge events
    - charge repository operations and repository tests
  patterns:
    - recurring generation advances the subscription cursor only after each competence is created or found
    - replacement creates a new open charge and leaves the original as `replaced`
    - charge reads remain tenant-scoped and dashboard-ready
key-files:
  created:
    - packages/domain/src/charges/schemas.ts
    - packages/domain/src/charges/index.ts
    - packages/db/src/schema/charges.ts
    - packages/db/src/migrations/0004_charge_engine_foundation.sql
    - packages/db/src/repositories/charges-repository.ts
    - packages/db/test/charges-repository.test.ts
  modified:
    - packages/domain/src/index.ts
    - packages/domain/src/audit/schemas.ts
    - packages/db/src/index.ts
    - packages/db/src/repositories/app-repository.ts
    - packages/db/src/schema/index.ts
key-decisions:
  - "Used `(tenant_id, subscription_id, competence_key)` as the recurring uniqueness boundary so idempotency is enforced in both repository logic and the database."
  - "Kept replacement charges as new `manual` records while preserving customer, plan, and subscription links, which avoids recurring competence collisions without losing operational context."
  - "Returned dashboard-ready summaries from the repository instead of forcing the API/UI to reconstruct overdue and due-soon buckets."
duration: 25min
completed: 2026-04-17
---

# Phase 3 Plan 01 Summary

Implemented the charge domain, recurring engine, and repository guarantees for Phase 3.

## Delivered
- Manual and recurring charge entities with append-only charge events.
- Idempotent recurring generation keyed by subscription competence.
- Repository lifecycle flows for mark-paid, cancel, replace, and dashboard aggregation.

## Verification
- `pnpm --filter @cobrazap/db test -- test/charges-repository.test.ts`
- `pnpm --filter @cobrazap/db test -- test/wallet-repository.test.ts test/charges-repository.test.ts`

## Outcome
The product now has a tenant-safe internal charge engine that can feed the dashboard and support Pix/webhook work without reworking the billing core.
