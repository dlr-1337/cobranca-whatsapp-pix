---
phase: 04-pix-payments-and-reconciliation
plan: "01"
subsystem: pix-domain-and-adapter
tags:
  - pix
  - asaas
  - payments
  - postgres
  - drizzle
  - multi-tenant
provides:
  - Internal tenant-scoped payment model decoupled from Asaas payloads
  - PSP customer/payment persistence for Pix generation and later reconciliation
  - Asaas adapter for customer creation, Pix charge creation, QR retrieval, and webhook parsing
affects:
  - pix-lifecycle
  - provider-mapping
  - reconciliation-foundation
tech-stack:
  added:
    - payment domain schemas and sync helpers
    - payment schema, migration, and repository operations
    - Asaas HTTP/in-memory adapters
    - payment-specific config parsing
  patterns:
    - internal payment state stays provider-agnostic while raw payloads remain auditable
    - provider customer mapping is persisted to avoid duplicate PSP records
    - reconciliation works against provider snapshots instead of controller-local branching
key-files:
  created:
    - packages/domain/src/payments/schemas.ts
    - packages/domain/src/payments/sync.ts
    - packages/db/src/schema/payments.ts
    - packages/db/src/repositories/payments-repository.ts
    - packages/db/src/migrations/0005_payment_foundation.sql
    - packages/integrations/src/payments/asaas.ts
  modified:
    - packages/domain/src/index.ts
    - packages/domain/src/audit/schemas.ts
    - packages/db/src/index.ts
    - packages/db/src/repositories/app-repository.ts
    - packages/db/src/schema/index.ts
    - packages/integrations/src/index.ts
    - packages/config/src/env.ts
key-decisions:
  - "Asaas became the first PSP because it gives the milestone a lower-friction Pix path with customer, payment, QR, and webhook primitives in one adapter."
  - "Stored provider payloads verbatim alongside normalized internal payment state so later replay and forensic work can rely on append-only evidence."
  - "Kept provider-specific status mapping at the integration/domain boundary instead of leaking PSP enums into API and UI layers."
duration: 55min
completed: 2026-04-17
---

# Phase 4 Plan 01 Summary

Implemented the Pix payment foundation, Asaas adapter, and internal persistence model.

## Delivered
- Internal payment/provider-event/reconciliation schemas with tenant scoping.
- Repository operations for provider customer mapping, Pix state, webhook inbox, and reconciliation runs.
- Asaas client and webhook parser for customer creation, Pix charge creation, QR retrieval, and status normalization.

## Verification
- `pnpm --filter @cobrazap/db exec vitest run test/payments-repository.test.ts`
- `pnpm --filter @cobrazap/config test`
- `pnpm --filter @cobrazap/domain typecheck`
- `pnpm --filter @cobrazap/integrations typecheck`
- `pnpm --filter @cobrazap/db typecheck`

## Outcome
The product now has a provider-agnostic Pix core with enough auditability and persistence to support webhook ingestion, reconciliation, and operator UI work.
