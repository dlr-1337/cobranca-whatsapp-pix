---
phase: 05-whatsapp-assisted-dispatch-and-reminders
plan: "02"
subsystem: assisted-whatsapp-api-and-ui
tags:
  - nestjs
  - nextjs
  - bff
  - whatsapp
  - operator-ui
provides:
  - API endpoints for message preview, manual send, and dispatch history reads
  - Charges dashboard controls for previewing and opening assisted WhatsApp sends
  - Tenant settings UI for editing templates and commercial-window rules
affects:
  - operator-workflow
  - messaging-visibility
  - settings-surface
tech-stack:
  added:
    - messaging API controller, module, and service
    - web BFF routes for messaging reads and manual send
    - WhatsApp blocks inside the charges and settings screens
  patterns:
    - assisted sends register dispatch history before opening `wa.me`
    - messaging stays embedded in the charge workflow instead of creating a second screen
    - tenant settings remain the single operational source for template text and window rules
key-files:
  created:
    - apps/api/src/modules/messaging/messaging.controller.ts
    - apps/api/src/modules/messaging/messaging.module.ts
    - apps/api/src/modules/messaging/messaging.service.ts
    - apps/api/test/messaging.e2e-spec.ts
    - apps/web/src/app/api/messaging/current/route.ts
    - apps/web/src/app/api/messaging/charges/[chargeId]/preview/route.ts
    - apps/web/src/app/api/messaging/charges/[chargeId]/manual-send/route.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/modules/auth/auth.service.ts
    - apps/api/src/modules/charges/charges.module.ts
    - apps/api/src/modules/charges/charges.service.ts
    - apps/api/src/modules/payments/payments.module.ts
    - apps/api/src/modules/payments/payments.service.ts
    - apps/web/src/components/charges/charges-screen.tsx
    - apps/web/src/components/settings/settings-screen.tsx
key-decisions:
  - "Used the same charges dashboard as the messaging control plane so operators never leave the financial workflow to send or resend WhatsApp messages."
  - "Preview and send are separate actions: preview is read-only, while manual send records the dispatch and opens the deep link."
  - "Settings expose raw template text directly because this milestone needs speed and auditability more than template-management abstraction."
duration: 55min
completed: 2026-04-17
---

# Phase 5 Plan 02 Summary

Delivered the assisted WhatsApp API surface and the operator UI for preview/send flows.

## Delivered
- `/messaging/current`, preview, and manual-send endpoints plus same-origin web BFF routes.
- Charge-card WhatsApp sections with preview, reminder rows, dispatch history, and assisted send actions.
- Settings fields for charge, reminder, and confirmation templates plus commercial-window hours.

## Verification
- `pnpm --filter @cobrazap/web typecheck`
- `pnpm --filter @cobrazap/api exec vitest run test/messaging.e2e-spec.ts --config vitest.e2e.config.ts`

## Outcome
Operators can now preview, open, resend, and review WhatsApp-assisted charge communication from the same dashboard that owns Pix and charge lifecycle actions.
