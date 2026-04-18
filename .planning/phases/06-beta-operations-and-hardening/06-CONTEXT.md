# Phase 6: Beta Operations and Hardening - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Mode:** Autonomous follow-on from Phase 5

<domain>
## Phase Boundary

Phase 6 does not add a new product loop. It hardens the loop already validated in phases 1-5 so a closed beta operator can:

- find the right charges quickly with operational filters
- export a trustworthy CSV snapshot of the current workload
- inspect provider-event failures and replay them safely
- rely on tests and a runbook instead of tribal knowledge

The phase ends when operational continuity improves without weakening tenant isolation or idempotency guarantees.

</domain>

<decisions>
## Implementation Decisions

### Locked
- **D-01:** Hardening stays inside the existing operator surfaces. No new admin console or detached failure tool will be introduced.
- **D-02:** Replay must remain tenant-scoped and idempotent, reusing the payment event inbox instead of bypassing it.
- **D-03:** CSV export is an operational artifact of the filtered charges dataset, not a new reporting subsystem.

### Chosen for this phase
- **D-04:** The charges screen will absorb the remaining beta-ops features because it already hosts filters, Pix state, reminders, reconciliation, and webhook inbox context.
- **D-05:** Period and plan filters will be applied in the operator dashboard and exported exactly as viewed, keeping CSV aligned with operator intent.
- **D-06:** Failed PSP events will be replayed through the same `processAsaasEvent` path used by webhooks/workers so replay correctness depends on existing idempotent sync logic.
- **D-07:** Beta readiness documentation will live in-repo as an operational checklist so onboarding a first tenant does not depend on oral transfer.

</decisions>

<code_context>
## Existing Code Insights

- `/painel/cobrancas` already contains status, origin, customer filters, Pix context, reconciliation history, and PSP inbox visibility.
- `PaymentsService.processAsaasEvent` already replays provider snapshots through the normalized sync path and marks provider events as processed or failed.
- `payment_provider_events` persists raw provider payloads and processing summaries, which is enough to support operator inspection and manual replay.
- The web app already uses a same-origin BFF pattern, so new export or replay actions should follow that path instead of calling the API directly from the browser.

</code_context>

<specifics>
## Specific Ideas

- Extend charge filters with plan and period boundaries, then allow CSV export of the filtered result set.
- Add a focused PSP failure panel that highlights failed inbox items, processing summaries, and replay actions.
- Add a replay endpoint/service method that is safe to run repeatedly and records audit evidence.
- Add regression coverage around replay and export formatting helpers.
- Add a beta-readiness playbook covering webhook token, queue health, reconciliation, reminder sync, and manual-send expectations.

</specifics>

<deferred>
## Deferred Ideas

- Rich BI dashboards, scheduled email reports, or multi-format exports.
- Generic replay tooling for every queue and event type in the platform.
- External observability stacks or alert routing beyond the in-product beta checklist.
- Bulk replay or automated dead-letter recovery.

</deferred>
