import {
  MESSAGING_QUEUE_NAME,
  PAYMENTS_QUEUE_NAME,
  PROCESS_PROVIDER_EVENT_JOB,
  SYNC_CHARGE_REMINDERS_JOB,
} from "@cobrazap/domain";
import { describe, expect, it } from "vitest";

describe("worker bootstrap contract", () => {
  it("keeps the queue contracts stable", () => {
    expect(PAYMENTS_QUEUE_NAME).toBe("payments");
    expect(PROCESS_PROVIDER_EVENT_JOB).toBe("process-provider-event");
    expect(MESSAGING_QUEUE_NAME).toBe("messaging");
    expect(SYNC_CHARGE_REMINDERS_JOB).toBe("sync-charge-reminders");
  });
});
