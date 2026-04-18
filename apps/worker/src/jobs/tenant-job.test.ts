import { describe, expect, it } from "vitest";

import { runTenantAwareJob } from "./tenant-job";

describe("tenant-aware worker guard", () => {
  it("rejects payloads that do not carry tenant context", async () => {
    await expect(
      runTenantAwareJob(
        { correlationId: "job-01" },
        async () => true,
        async () => "ok",
      ),
    ).rejects.toThrow("tenant_id is required");
  });

  it("rejects payloads when tenant revalidation fails before work", async () => {
    await expect(
      runTenantAwareJob(
        { tenantId: "tenant-x", correlationId: "job-02" },
        async () => false,
        async () => "ok",
      ),
    ).rejects.toThrow("worker payload tenant could not be revalidated");
  });
});
