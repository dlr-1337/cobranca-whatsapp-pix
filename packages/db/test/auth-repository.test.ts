import { describe, expect, it } from "vitest";

import {
  createTestAuthDatabase,
  type TestAuthDatabase,
} from "../src/testing/test-auth-database";

async function createHarness(): Promise<TestAuthDatabase> {
  return createTestAuthDatabase();
}

describe("auth repository", () => {
  it("creates tenant, owner membership, and settings in one flow", async () => {
    const harness = await createHarness();

    const created = await harness.repository.bootstrapOwnerTenant({
      businessName: "Padaria Centro",
      primaryEmail: "financeiro@padariacentro.com.br",
      whatsappPhone: "+5511999999999",
      timezone: "America/Sao_Paulo",
      defaultDueDay: 7,
      ownerEmail: "Dona.Carla@PadariaCentro.com.br",
      ownerPasswordHash: "argon2-hash",
    });

    const snapshot = await harness.repository.getTenantBootstrapSnapshot(
      created.tenantId,
      created.userId,
    );

    expect(snapshot.tenant.id).toBe(created.tenantId);
    expect(snapshot.user.id).toBe(created.userId);
    expect(snapshot.membership.role).toBe("owner");
    expect(snapshot.settings.businessName).toBe("Padaria Centro");
    expect(snapshot.settings.defaultDueDay).toBe(7);
  });

  it("enforces case-insensitive uniqueness for owner email", async () => {
    const harness = await createHarness();

    await harness.repository.bootstrapOwnerTenant({
      businessName: "Padaria Centro",
      primaryEmail: "financeiro@padariacentro.com.br",
      whatsappPhone: "+5511999999999",
      timezone: "America/Sao_Paulo",
      defaultDueDay: 7,
      ownerEmail: "dona.carla@padariacentro.com.br",
      ownerPasswordHash: "argon2-hash",
    });

    await expect(
      harness.repository.bootstrapOwnerTenant({
        businessName: "Padaria B",
        primaryEmail: "contato@padariab.com.br",
        whatsappPhone: "+5511988888888",
        timezone: "America/Sao_Paulo",
        defaultDueDay: 10,
        ownerEmail: "DONA.CARLA@PADARIACENTRO.COM.BR",
        ownerPasswordHash: "argon2-hash-2",
      }),
    ).rejects.toThrow(/email/i);
  });

  it("resolves only active sessions and revokes all sessions on password change", async () => {
    const harness = await createHarness();
    const created = await harness.repository.bootstrapOwnerTenant({
      businessName: "Padaria Centro",
      primaryEmail: "financeiro@padariacentro.com.br",
      whatsappPhone: "+5511999999999",
      timezone: "America/Sao_Paulo",
      defaultDueDay: 7,
      ownerEmail: "dona.carla@padariacentro.com.br",
      ownerPasswordHash: "argon2-hash",
    });

    const expiresAt = new Date("2026-04-20T12:00:00.000Z");
    const createdAt = new Date("2026-04-19T11:45:00.000Z");
    await harness.repository.createSession({
      tenantId: created.tenantId,
      userId: created.userId,
      membershipId: created.membershipId,
      tokenHash: "session-token-hash",
      expiresAt,
      createdAt,
      lastSeenAt: createdAt,
      idleTimeoutMinutes: 30,
      userAgent: "vitest",
      ipAddress: "127.0.0.1",
    });

    const activeBefore = await harness.repository.getActiveSessionByTokenHash(
      "session-token-hash",
      new Date("2026-04-19T12:00:00.000Z"),
    );
    expect(activeBefore?.tenantId).toBe(created.tenantId);

    await harness.repository.revokeAllUserSessions({
      userId: created.userId,
      tenantId: created.tenantId,
      reason: "password-change",
      revokedAt: new Date("2026-04-19T12:30:00.000Z"),
    });

    const activeAfter = await harness.repository.getActiveSessionByTokenHash(
      "session-token-hash",
      new Date("2026-04-19T12:31:00.000Z"),
    );
    expect(activeAfter).toBeNull();
  });

  it("creates single-use password reset tokens", async () => {
    const harness = await createHarness();
    const created = await harness.repository.bootstrapOwnerTenant({
      businessName: "Padaria Centro",
      primaryEmail: "financeiro@padariacentro.com.br",
      whatsappPhone: "+5511999999999",
      timezone: "America/Sao_Paulo",
      defaultDueDay: 7,
      ownerEmail: "dona.carla@padariacentro.com.br",
      ownerPasswordHash: "argon2-hash",
    });

    await harness.repository.createEmailActionToken({
      tenantId: created.tenantId,
      userId: created.userId,
      kind: "password-reset",
      tokenHash: "reset-token-hash",
      expiresAt: new Date("2026-04-18T12:00:00.000Z"),
    });

    const consumed = await harness.repository.consumeEmailActionToken({
      kind: "password-reset",
      tokenHash: "reset-token-hash",
      consumedAt: new Date("2026-04-18T11:00:00.000Z"),
    });
    expect(consumed?.userId).toBe(created.userId);

    const consumedAgain = await harness.repository.consumeEmailActionToken({
      kind: "password-reset",
      tokenHash: "reset-token-hash",
      consumedAt: new Date("2026-04-18T11:01:00.000Z"),
    });
    expect(consumedAgain).toBeNull();
  });
});
