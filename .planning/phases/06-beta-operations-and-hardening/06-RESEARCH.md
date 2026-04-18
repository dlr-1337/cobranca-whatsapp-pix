# Research - Phase 6

## Goal

Prepare CobraZap for a closed beta by strengthening the operator workflow that already exists instead of layering on separate tooling.

## Findings

### 1. The current charges screen is already the operations cockpit

The dashboard already centralizes:

- charge filters
- Pix generation and state
- reminder visibility
- manual reconciliation
- webhook inbox context

Adding export and replay here keeps the operator on one surface and avoids introducing a second workflow to learn during beta.

### 2. Replay can piggyback on the existing inbox model

The payment event inbox already stores:

- raw provider payload
- tenant ownership
- provider event id
- processing status and summary

`PaymentsService.processAsaasEvent` already applies provider snapshots through the same idempotent sync path used after webhook ingestion. A manual replay endpoint can safely reuse that path if it remains tenant-scoped and auditable.

### 3. CSV export should mirror the filtered operator view

For beta operations, the valuable export is not a complex report. It is a trustworthy dump of the exact charge slice the operator is viewing:

- period
- status
- plan
- customer

That means export logic should derive from the same filtered dataset shown in the UI, reducing mismatch risk.

### 4. Documentation is part of the feature, not an afterthought

This milestone explicitly treats operability as functional scope. A beta-readiness checklist should cover:

- required env and webhook setup
- what to inspect when Pix diverges
- how to replay failed provider events
- how reminders behave around payment confirmation
- what manual WhatsApp-assisted sending does and does not guarantee

## Chosen Direction

- UI: extend `/painel/cobrancas` rather than creating a new screen.
- Replay: add tenant-scoped manual replay for failed PSP inbox items.
- Export: generate CSV from the filtered charge dataset already in memory.
- Readiness: add an in-repo beta operations playbook and verify replay/export flows with tests.

## Risks and Mitigations

| Risk | Why it matters | Mitigation |
|------|----------------|------------|
| Replay mutates already-processed state incorrectly | Could corrupt financial truth | Route replay through existing idempotent sync path and audit every replay |
| CSV differs from what the operator sees | Operators lose trust in export | Build export from the same filtered rows rendered on screen |
| Failure panel floods the user with low-signal events | Beta ops becomes noisy | Highlight failed events first and surface processing summaries directly |
| Hardening scope grows into full observability platform work | Risks milestone slip | Keep scope to export, replay, tests, and closed-beta checklist |
