import type { AuthDatabase } from "../auth/auth-repository.js";
import { createAuthRepository } from "../auth/auth-repository.js";
import { createAuditRepository } from "./audit-repository.js";

export function createAppRepository(db: AuthDatabase) {
  return {
    ...createAuthRepository(db),
    ...createAuditRepository(db),
  };
}

export type AppRepository = ReturnType<typeof createAppRepository>;
