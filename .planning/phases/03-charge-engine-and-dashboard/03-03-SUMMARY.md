---
phase: 03-charge-engine-and-dashboard
plan: "03"
subsystem: charges-dashboard
tags:
  - nextjs
  - bff
  - charges
  - operator-ui
provides:
  - Charges operator screen under /painel/cobrancas
  - Same-origin BFF routes for the charges API
  - KPI cards, filters, manual create, recurring trigger, and inline lifecycle actions
affects:
  - operator-workflow
  - dashboard-visibility
  - audit-navigation
tech-stack:
  added:
    - charges page and screen in the Next.js app
    - BFF route handlers for charges aggregate, create, lifecycle, and history
  patterns:
    - dashboard boots from aggregate reads and mutates through same-origin BFF routes
    - operator history is rendered from append-only charge events already returned by the API
    - panel navigation now links wallet, charges, settings, and audit surfaces
key-files:
  created:
    - apps/web/src/app/(app)/painel/cobrancas/page.tsx
    - apps/web/src/components/charges/charges-screen.tsx
    - apps/web/src/app/api/charges/current/route.ts
    - apps/web/src/app/api/charges/route.ts
    - apps/web/src/app/api/charges/generate-recurring/route.ts
  modified:
    - apps/web/src/components/settings/settings-screen.tsx
    - apps/web/src/components/audit/audit-screen.tsx
    - apps/web/src/components/wallet/wallet-screen.tsx
key-decisions:
  - "Kept filtering client-side against the aggregated charge payload for the first operational dashboard cut, which keeps the UI simple without weakening tenant boundaries."
  - "Rendered replacement as an explicit inline form so operators can control amount and due date instead of relying on implicit defaults."
  - "Extended audit filter options and cross-navigation now so charge operations remain discoverable inside the same shell used by the rest of the panel."
duration: 20min
completed: 2026-04-17
---

# Phase 3 Plan 03 Summary

Delivered the operator-facing charges dashboard and same-origin BFF layer.

## Delivered
- `/painel/cobrancas` with KPI cards, manual charge form, recurring trigger, filters, and lifecycle actions.
- BFF routes for charge reads, writes, recurring generation, and event history.
- Cross-navigation updates connecting charges with wallet, settings, and audit.

## Verification
- `pnpm --filter @cobrazap/web typecheck`
- `pnpm --filter @cobrazap/api test:integration -- wallet.e2e-spec.ts charges.e2e-spec.ts`

## Outcome
Operators can now run the full internal charge loop from the panel before Pix integration lands.
