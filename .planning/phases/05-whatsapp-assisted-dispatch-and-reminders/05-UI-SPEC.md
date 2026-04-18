# UI Spec - Phase 5

## Operator Surfaces

### Charges dashboard extensions

The existing `/painel/cobrancas` screen remains the operator control plane and gains:

- a dispatch preview block per charge
- manual send / resend actions for WhatsApp
- reminder timeline/history next to the existing Pix and charge history blocks
- visibility into scheduled, opened, and canceled reminders

### Settings extensions

The existing settings screen gains a compact operational section for:

- charge initial template
- reminder template
- payment confirmation template
- commercial window start/end hours

No new standalone screen is needed in this phase.

## Interaction Contract

- Operators only see manual-send actions when the charge has a valid customer WhatsApp and a Pix payload or is already paid for confirmation.
- Preview must show final message text, destination phone, and template kind before opening the WhatsApp deep link.
- Reminder rows must show slot (`D-1`, `D0`, `D+1`), scheduled time, and status (`scheduled`, `opened`, `canceled`, `failed`).
- Paid charges may show confirmation-send action but must never show future reminder actions.

## UX Notes

- Reuse the existing charge card layout; add messaging as another operational column/block instead of a modal-heavy subflow.
- Keep message text in plain textarea-style preview blocks for auditability and copyability.
- Settings fields should stay lightweight and text-first, matching the current utilitarian admin aesthetic.
