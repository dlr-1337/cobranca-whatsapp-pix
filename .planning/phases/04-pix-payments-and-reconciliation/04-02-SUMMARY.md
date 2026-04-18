---
phase: 04-pix-payments-and-reconciliation
plan: "02"
subsystem: payments-api-and-worker
tags:
  - nestjs
  - bullmq
  - webhook
  - payments
  - e2e
provides:
  - Tenant-scoped Pix API for charge payment generation and operational reads
  - Webhook inbox ingestion with shared-token validation and idempotent persistence
  - Worker processing for PSP events outside the HTTP request path
affects:
  - operator-api
  - webhook-processing
  - worker-runtime
tech-stack:
  added:
    - payments API controller, module, and service
    - worker job for provider event processing
    - payments end-to-end and worker tests
  patterns:
    - webhook handlers acknowledge after persistence and offload downstream work to queues
    - test mode processes provider events inline only to keep e2e deterministic
    - worker execution reuses tenant-aware repository logic instead of duplicating charge transitions
key-files:
  created:
    - apps/api/src/modules/payments/payments.controller.ts
    - apps/api/src/modules/payments/payments.module.ts
    - apps/api/src/modules/payments/payments.service.ts
    - apps/api/test/payments.e2e-spec.ts
    - apps/worker/src/jobs/payments/process-provider-event.ts
    - apps/worker/src/jobs/payments/process-provider-event.test.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/package.json
    - apps/worker/src/main.ts
    - apps/worker/src/main.test.ts
    - apps/worker/package.json
key-decisions:
  - "Used the Asaas shared webhook token on the `asaas-access-token` header as the first authenticity gate, then relied on the inbox table for idempotency."
  - "Kept the public API small around charge-bound Pix operations so the operator flow stays anchored on charges rather than a separate payment workspace."
  - "Allowed inline event processing only in test mode; production paths always enqueue worker jobs to preserve the architecture rule against inline webhook work."
duration: 50min
completed: 2026-04-17
---

# Phase 4 Plan 02 Summary

Implemented the Pix API surface, webhook inbox, and worker-side provider event processing.

## Delivered
- `/payments/charges/:chargeId/pix`, `/payments/current`, webhook, and reconciliation endpoints.
- Idempotent webhook persistence and token validation for Asaas callbacks.
- BullMQ worker flow that processes pending provider events and syncs charge/payment state.

## Verification
- `pnpm --filter @cobrazap/api exec vitest run test/payments.e2e-spec.ts --config vitest.e2e.config.ts`
- `pnpm --filter @cobrazap/worker exec vitest run src/jobs/payments/process-provider-event.test.ts src/main.test.ts`
- `pnpm --filter @cobrazap/worker typecheck`

## Outcome
The system now closes the provider callback loop without relying on controller-inline reconciliation, which makes Pix status updates replayable and operationally safer.
