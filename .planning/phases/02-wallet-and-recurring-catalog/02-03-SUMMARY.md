---
phase: 02-wallet-and-recurring-catalog
plan: "03"
subsystem: wallet-operator-ui
tags:
  - nextjs
  - bff
  - wallet
  - operator-ui
provides:
  - Wallet operator screen under /painel/carteira
  - Same-origin BFF routes mirroring the wallet API
  - Cross-navigation between wallet, settings, and audit surfaces
affects:
  - operator-workflow
  - onboarding
  - recurring-catalog
tech-stack:
  added:
    - wallet page and screen in the Next.js app
    - BFF route handlers for wallet collections and lifecycle actions
  patterns:
    - existing panel visual language reused instead of introducing a new layout system
    - operator workflows load from one aggregate endpoint and mutate through same-origin BFF routes
key-files:
  created:
    - apps/web/src/app/(app)/painel/carteira/page.tsx
    - apps/web/src/components/wallet/wallet-screen.tsx
    - apps/web/src/app/api/wallet/current/route.ts
    - apps/web/src/app/api/wallet/customers/route.ts
    - apps/web/src/app/api/wallet/plans/route.ts
    - apps/web/src/app/api/wallet/subscriptions/route.ts
  modified:
    - apps/web/src/components/settings/settings-screen.tsx
    - apps/web/src/components/audit/audit-screen.tsx
key-decisions:
  - "Kept the wallet UI inside the same single-screen panel pattern already used by settings and audit, which reduced surface area and preserved coherence."
  - "Used mirrored BFF routes instead of calling the API origin directly from the browser so session handling stays same-origin."
  - "Prioritized create/list/lifecycle actions over inline editing to support the manual assisted loop without overbuilding Phase 2."
duration: 35min
completed: 2026-04-17
---

# Phase 2 Plan 03 Summary

Delivered the operator-facing wallet workspace and BFF routes needed to use the recurring catalog manually.

## Delivered
- `/painel/carteira` with sections for customers, consent, plans, and subscriptions.
- BFF routes for wallet reads, writes, consent events, and subscription lifecycle actions.
- Navigation links connecting wallet, settings, and audit surfaces.

## Verification
- `pnpm --filter @cobrazap/web typecheck`
- `pnpm --filter @cobrazap/api test:integration -- wallet.e2e-spec.ts`

## Outcome
The operator can now build the tenant wallet and manage recurring entities from the web panel without leaving the authenticated same-origin flow.
