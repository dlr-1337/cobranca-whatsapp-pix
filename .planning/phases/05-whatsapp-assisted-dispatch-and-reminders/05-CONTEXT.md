# Phase 5: WhatsApp Assisted Dispatch and Reminders - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Mode:** Autonomous follow-on from Phase 4

<domain>
## Phase Boundary

Phase 5 must close the communication side of the loop without jumping to full WhatsApp Cloud API/BSP automation. The safest milestone path is:

- keep the send step manual-assisted through a `wa.me` deep link
- persist dispatch history as first-class operational records
- use the same template model for cobranca inicial, lembrete, and confirmacao
- schedule reminder intents in the worker so D-1, D0, and D+1 exist and can be canceled when the charge is paid

The success condition is operational continuity, not transport sophistication: the operator must preview, open, resend, and audit the WhatsApp message path around an already-valid Pix charge.

</domain>

<decisions>
## Implementation Decisions

### Locked
- **D-01:** Phase 5 will not integrate the official WhatsApp Cloud API or a BSP. The transport remains manual-assisted via `wa.me`.
- **D-02:** Dispatch history is append-only and tenant-scoped, with one record per operator action or reminder intent.
- **D-03:** Reminder automation means scheduling reminder intents/jobs and surfacing them operationally; the actual send remains assisted.
- **D-04:** Future reminders must be canceled when the charge transitions away from an unpaid operational state, especially on payment confirmation.

### Chosen for this phase
- **D-05:** Templates will live in the tenant settings domain as simple per-kind text fields, which keeps the first implementation small while still supporting `charge_initial`, `charge_reminder`, and `payment_confirmation`.
- **D-06:** A new dispatch aggregate will store the rendered message snapshot, recipient phone, trigger, reminder slot, transport URL, and timestamps so audits never depend on re-rendering old templates.
- **D-07:** Reminder scheduling uses the tenant timezone and commercial window start/end hours; scheduled reminders outside the window shift to the next valid slot.
- **D-08:** Payment-generation and payment-status transitions are the places where reminder schedules are synchronized or canceled, because reminders depend on a valid Pix state.

</decisions>

<code_context>
## Existing Code Insights

- Wallet already stores normalized WhatsApp phone data for customers and a basic `messageTemplate` / `reminderProfile` on billing plans.
- Charges already expose a single operational dashboard and lifecycle actions that Phase 5 can extend instead of creating a new UI shell.
- Pix generation and webhook processing now exist, which means dispatch preview can include charge amount, due date, and Pix payload from the internal payment model.
- Worker infrastructure already runs BullMQ for payment jobs, so reminder scheduling can follow the same queue-oriented architecture.

</code_context>

<specifics>
## Specific Ideas

- Add tenant-level dispatch settings: three templates plus commercial window configuration.
- Add a dispatch history table with `template_kind`, `trigger`, `reminder_slot`, `status`, `rendered_message`, and `transport_url`.
- Add preview and manual-send endpoints for charges, backed by a deterministic template renderer.
- Add scheduled reminder records/jobs for D-1, D0, and D+1 when a valid Pix charge exists.
- Cancel scheduled reminders automatically on webhook-driven or manual payment confirmation.
- Expose dispatch history and due reminders directly in `/painel/cobrancas`.

</specifics>

<deferred>
## Deferred Ideas

- Official WhatsApp send/status webhooks via Cloud API or BSP.
- Template approval workflows, quality ratings, or media attachments.
- Fully automatic outbound delivery without operator interaction.
- Multi-channel reminders beyond WhatsApp.

</deferred>
