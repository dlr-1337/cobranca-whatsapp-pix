---
phase: 1
slug: foundations-and-tenancy
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-17
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Supertest + Playwright |
| **Config file** | `vitest.workspace.ts`, `apps/api/test/vitest.config.ts`, `apps/web/playwright.config.ts` |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30s quick, ~5min full |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit`
- **After every plan wave:** Run `pnpm test`
- **Before phase verification:** Full suite must be green
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | AUTH-01 / OPS-02 | T-01-01 / T-01-03 | Workspace boots with shared env validation and no unscoped runtime entrypoints | workspace smoke | `pnpm lint && pnpm typecheck` | ❌ W0 | pending |
| 01-02 | 02 | 2 | AUTH-01 / AUTH-02 / AUTH-03 / AUTH-04 | T-01-04 / T-01-05 / T-01-06 | Signup/login/reset/settings enforce tenant resolution, hashed credentials, and revocable sessions | unit + api-e2e | `pnpm --filter @cobrazap/api test` | ❌ W0 | pending |
| 01-03 | 03 | 3 | OPS-01 / OPS-02 | T-01-07 / T-01-08 / T-01-09 | Audit is append-only and tenant scoping holds in API + worker flows | api-e2e + worker integration | `pnpm test:integration` | ❌ W0 | pending |
| 01-04 | 02-03 | 2-3 | AUTH-01 / AUTH-02 / AUTH-03 / AUTH-04 | T-01-05 / T-01-06 | Critical browser flows work without leaking auth state or tenant ambiguity | browser e2e | `pnpm --filter @cobrazap/web test:e2e` | ❌ W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `vitest.workspace.ts` - root Vitest workspace config
- [ ] `apps/api/test/helpers/tenant-fixtures.ts` - shared tenant-aware API fixtures
- [ ] `apps/web/tests/auth.spec.ts` - browser smoke coverage for signup/login/reset
- [ ] `docker-compose.yml` - reproducible Postgres and Redis for local and CI validation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Password reset email content is operationally understandable in PT-BR | AUTH-03 | Copy quality and visual affordances are best checked by a human | Request reset in dev mode, inspect the generated email/outbox item, confirm link and language |
| Audit log readability for operators | OPS-01 | Density and filtering usefulness require human judgment | Seed auth/settings events, open audit view, confirm filters and labels are understandable |

---

## Validation Sign-Off

- [x] All planned tasks have an automated verification path or explicit Wave 0 dependency
- [x] Sampling continuity avoids three consecutive tasks without automated verification
- [x] Wave 0 covers missing framework/bootstrap files
- [x] No watch-mode commands are part of the contract
- [x] Feedback latency target stays under 5 minutes for full runs
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
