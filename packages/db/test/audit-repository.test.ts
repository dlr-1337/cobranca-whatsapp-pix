import { describe, expect, it } from "vitest";

import { createTestAuthDatabase } from "../src/testing/test-auth-database.js";

describe("audit repository", () => {
  it("stores append-only events per tenant and returns them newest-first", async () => {
    const harness = await createTestAuthDatabase();

    try {
      const tenantA = await harness.repository.bootstrapOwnerTenant({
        businessName: "Academia Centro",
        primaryEmail: "financeiro@academia.com.br",
        whatsappPhone: "+5511999999999",
        timezone: "America/Sao_Paulo",
        defaultDueDay: 5,
        ownerEmail: "otavio@academia.com.br",
        ownerPasswordHash: "hash-a",
      });
      const tenantB = await harness.repository.bootstrapOwnerTenant({
        businessName: "Oficina Nobre",
        primaryEmail: "financeiro@oficina.com.br",
        whatsappPhone: "+5511988887777",
        timezone: "America/Sao_Paulo",
        defaultDueDay: 10,
        ownerEmail: "ana@oficina.com.br",
        ownerPasswordHash: "hash-b",
      });

      await harness.repository.appendAuditEvent({
        tenantId: tenantA.tenantId,
        actorUserId: tenantA.userId,
        actorEmail: "otavio@academia.com.br",
        eventType: "auth.signup_requested",
        summary: "Cadastro inicial criado.",
        occurredAt: new Date("2026-04-17T10:00:00.000Z"),
      });
      await harness.repository.appendAuditEvent({
        tenantId: tenantA.tenantId,
        actorUserId: tenantA.userId,
        actorEmail: "otavio@academia.com.br",
        eventType: "tenant.settings_updated",
        summary: "Configurações atualizadas.",
        occurredAt: new Date("2026-04-17T12:00:00.000Z"),
      });
      await harness.repository.appendAuditEvent({
        tenantId: tenantB.tenantId,
        actorUserId: tenantB.userId,
        actorEmail: "ana@oficina.com.br",
        eventType: "auth.signup_requested",
        summary: "Cadastro inicial criado.",
        occurredAt: new Date("2026-04-17T11:00:00.000Z"),
      });

      const tenantAEvents = await harness.repository.listAuditEvents({
        tenantId: tenantA.tenantId,
        from: new Date("2026-04-16T00:00:00.000Z"),
      });
      const filteredTenantAEvents = await harness.repository.listAuditEvents({
        tenantId: tenantA.tenantId,
        from: new Date("2026-04-16T00:00:00.000Z"),
        type: "tenant.settings_updated",
      });

      expect(tenantAEvents).toHaveLength(2);
      expect(tenantAEvents.map((event) => event.summary)).toEqual([
        "Configurações atualizadas.",
        "Cadastro inicial criado.",
      ]);
      expect(tenantAEvents.every((event) => event.tenantId === tenantA.tenantId)).toBe(
        true,
      );
      expect(filteredTenantAEvents).toHaveLength(1);
      expect(filteredTenantAEvents[0]).toMatchObject({
        tenantId: tenantA.tenantId,
        actorEmail: "otavio@academia.com.br",
        eventType: "tenant.settings_updated",
      });
    } finally {
      await harness.close();
    }
  });
});
