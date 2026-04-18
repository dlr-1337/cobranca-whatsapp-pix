---
phase: 06-beta-operations-and-hardening
plan: "02"
subsystem: psp-failure-replay
tags:
  - nestjs
  - webhook
  - replay
  - pix
  - audit
provides:
  - Tenant-scoped replay endpoint for failed PSP inbox events
  - Dashboard controls for reprocessing failed provider events
  - Audit evidence for manual replay activity
affects:
  - payment-ops
  - failure-recovery
  - provider-inbox
tech-stack:
  added:
    - replay endpoint on payments API
    - web BFF route for replay actions
    - failed-event replay controls in the charges dashboard
  patterns:
    - replay reuses the existing `processAsaasEvent` path instead of bespoke recovery logic
    - only failed events may be replayed manually
    - replay actions leave audit evidence under the same tenant scope
key-files:
  created:
    - apps/web/src/app/api/payments/provider-events/[providerEventId]/replay/route.ts
  modified:
    - apps/api/src/modules/payments/payments.controller.ts
    - apps/api/src/modules/payments/payments.service.ts
    - apps/web/src/components/charges/charges-screen.tsx
    - packages/domain/src/audit/schemas.ts
key-decisions:
  - "Manual replay is restricted to failed PSP inbox events so operators have a focused, low-risk recovery path."
  - "Replay calls the same idempotent sync flow as webhook processing, which keeps recovery semantics aligned with normal operation."
duration: 40min
completed: 2026-04-17
---

# Phase 6 Plan 02 Summary

Implemented operator-facing replay for failed PSP events.

## Delivered
- `POST /payments/provider-events/:providerEventId/replay` with tenant scoping and failure-state checks.
- Dashboard failure panel with replay buttons and PSP inbox telemetry counts.
- Audit event `payment.event_replayed` to trace manual recovery activity.

## Verification
- `pnpm --filter @cobrazap/api exec vitest run test/payments.e2e-spec.ts --config vitest.e2e.config.ts`
- `pnpm --filter @cobrazap/domain typecheck`
- `pnpm --filter @cobrazap/web typecheck`

## Outcome
Operators can now inspect PSP failures and replay them safely from the same operational surface used for Pix and reconciliation.
