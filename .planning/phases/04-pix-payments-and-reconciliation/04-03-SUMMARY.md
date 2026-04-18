---
phase: 04-pix-payments-and-reconciliation
plan: "03"
subsystem: pix-operator-ui
tags:
  - nextjs
  - bff
  - charges
  - payments
  - operator-ui
provides:
  - Pix block inside the charges dashboard with QR, copy-paste code, and PSP status
  - Same-origin BFF routes for payments reads, Pix generation, and reconciliation trigger
  - Operational visibility into reconciliation runs and webhook inbox state
affects:
  - operator-workflow
  - pix-visibility
  - payment-ops
tech-stack:
  added:
    - web BFF routes for payment state, Pix generation, and manual reconciliation
    - Pix controls and operational sections inside the charges screen
  patterns:
    - Pix stays embedded in the charge workflow instead of introducing a detached payments UI
    - operator reads aggregate payment state from the same-origin web layer
    - PSP inbox and reconciliation history are surfaced as operational context for later replay work
key-files:
  created:
    - apps/web/src/app/api/payments/current/route.ts
    - apps/web/src/app/api/payments/charges/[chargeId]/pix/route.ts
    - apps/web/src/app/api/payments/reconciliation/manual/route.ts
  modified:
    - apps/web/src/components/charges/charges-screen.tsx
key-decisions:
  - "Extended the existing charges screen instead of building a second payments screen so the operator stays on one operational surface."
  - "Surfaced webhook inbox state and reconciliation runs now, even before replay tooling, because operability is already part of the milestone scope."
  - "Kept manual reconciliation as an explicit operator action while phase 6 will harden replay and failure handling further."
duration: 35min
completed: 2026-04-17
---

# Phase 4 Plan 03 Summary

Delivered the operator-facing Pix experience inside the charges dashboard.

## Delivered
- Charge cards now show Pix status, provider identifiers, QR code, and copy-paste payload.
- Web BFF routes for reading payment operations, generating Pix, and running reconciliation.
- Reconciliation history and provider-event inbox visibility for operations.

## Verification
- `pnpm --filter @cobrazap/web typecheck`
- `pnpm --filter @cobrazap/api exec vitest run test/payments.e2e-spec.ts --config vitest.e2e.config.ts`

## Outcome
Operators can now generate Pix, inspect provider state, and reconcile divergences from the same charge workflow used by the rest of the product.
