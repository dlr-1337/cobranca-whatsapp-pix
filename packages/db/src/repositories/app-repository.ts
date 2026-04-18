import type { AuthDatabase } from "../auth/auth-repository.js";
import { createAuthRepository } from "../auth/auth-repository.js";
import { createAuditRepository } from "./audit-repository.js";
import { createChargesRepository } from "./charges-repository.js";
import { createMessagingRepository } from "./messaging-repository.js";
import { createPaymentsRepository } from "./payments-repository.js";
import { createWalletRepository } from "./wallet-repository.js";

export function createAppRepository(db: AuthDatabase) {
  return {
    ...createAuthRepository(db),
    ...createAuditRepository(db),
    ...createChargesRepository(db),
    ...createMessagingRepository(db),
    ...createPaymentsRepository(db),
    ...createWalletRepository(db),
  };
}

export type AppRepository = ReturnType<typeof createAppRepository>;
