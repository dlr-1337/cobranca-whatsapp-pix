# UI Spec - Phase 6

## Operator Surfaces

### Charges dashboard hardening

The existing `/painel/cobrancas` screen gains:

- period and plan filters in addition to status/customer/origin
- an explicit CSV export action for the filtered charge dataset
- a failure-focused PSP panel with replay controls
- small telemetry summaries around pending/processed/failed PSP inbox items

### Documentation surface

No new in-app documentation screen is required. Beta-readiness guidance can live in repo docs for now.

## Interaction Contract

- Export must reflect exactly the charge slice visible after filters are applied.
- Replay actions only appear for provider events that are currently failed.
- Replay feedback must be explicit and leave the operator on the same screen.
- Failure cards must show provider event id, summary, received time, and current processing status.

## UX Notes

- Keep hardening features embedded in the existing utilitarian layout.
- Avoid modal-heavy flows; use direct actions with clear banners and inline context.
- Treat CSV and replay as operational tools, not marketing-grade report surfaces.
