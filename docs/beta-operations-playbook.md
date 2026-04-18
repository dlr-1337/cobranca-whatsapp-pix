# Beta Operations Playbook

## Purpose

This playbook is the minimum operating guide for CobraZap's closed beta. It assumes the product loop is already implemented and focuses on keeping payment, messaging, and replay operations predictable.

## Before onboarding a beta tenant

Confirm these environment variables are present and correct:

- `DATABASE_URL`
- `REDIS_URL`
- `APP_BASE_URL`
- `ASAAS_API_BASE_URL`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`

Confirm these services are reachable:

- API process
- Web app
- Worker consuming `payments` and `messaging`
- Asaas webhook target pointing to `/payments/webhooks/asaas`

## Daily operator checks

1. Open `/painel/cobrancas` and confirm charges, Pix blocks, WhatsApp blocks, reconciliation history, and PSP inbox all load.
2. Review the PSP inbox summary. Failed events must be investigated before end of day.
3. Run manual reconciliation when PSP state and dashboard state appear to diverge.
4. For unpaid charges, confirm reminders are still scheduled and that paid charges no longer show future reminders.

## WhatsApp-assisted sending

- Always review the preview before opening the deep link.
- `Abrir cobranca` and `Abrir lembrete` record dispatch history before opening WhatsApp.
- Reminder slots `D-1`, `D0`, and `D+1` are only valid while the charge remains operationally unpaid.
- Payment confirmation should only be sent after the charge is already marked paid or received.

## When Pix diverges

1. Inspect the Pix block on the charge card.
2. Check the reconciliation panel for recent divergence/failure counts.
3. Review the PSP inbox summary and individual processing summaries.
4. Run manual reconciliation if the provider and internal status appear misaligned.

## When a PSP inbox event fails

1. Open `/painel/cobrancas`.
2. Scroll to `Inbox PSP e falhas`.
3. Read the `processingSummary` on the failed event.
4. Click `Reprocessar` only after the underlying cause is understood or corrected.
5. Confirm the event leaves `failed` state and the charge/payment state remains coherent.

Replay is safe because it reuses the same idempotent `processAsaasEvent` flow used by webhook processing.

## Export workflow

Use the filters in `/painel/cobrancas` to narrow by:

- status
- origin
- customer
- plan
- due-date range

Then click `Exportar CSV`. The export mirrors the current filtered view, so adjust filters first and export second.

## Verification commands

Run these before shipping a beta build:

```bash
pnpm --filter @cobrazap/web typecheck
pnpm --filter @cobrazap/domain typecheck
pnpm --filter @cobrazap/worker typecheck
pnpm --filter @cobrazap/db exec vitest run test/messaging-repository.test.ts
pnpm --filter @cobrazap/api exec vitest run test/messaging.e2e-spec.ts --config vitest.e2e.config.ts
pnpm --filter @cobrazap/api exec vitest run test/payments.e2e-spec.ts --config vitest.e2e.config.ts
```

## Exit criteria for the first closed beta

- Operators can create charges, generate Pix, open WhatsApp-assisted sends, and see confirmed payments.
- Failed PSP inbox events can be replayed safely from the dashboard.
- The filtered dashboard dataset can be exported as CSV for follow-up work.
- Reconciliation, reminders, and audit traces remain tenant-scoped and readable.
