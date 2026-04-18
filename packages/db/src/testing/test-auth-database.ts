import { newDb } from "pg-mem";
import { drizzle } from "drizzle-orm/node-postgres";

import { createAppRepository } from "../repositories/app-repository.js";
import { runMigrations } from "../migrations/run-migrations.js";
import * as schema from "../schema/index.js";

export interface TestAuthDatabase {
  db: ReturnType<typeof drizzle<typeof schema>>;
  repository: ReturnType<typeof createAppRepository>;
  close: () => Promise<void>;
}

export async function createTestAuthDatabase(): Promise<TestAuthDatabase> {
  const memory = newDb({
    autoCreateForeignKeyIndices: true,
  });

  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const originalQuery = pool.query.bind(pool);

  pool.query = (async (query: unknown, ...rest: unknown[]) => {
    let wantsArrayRows = false;
    let sanitizedQuery = query;

    if (query && typeof query === "object") {
      const draft = { ...(query as Record<string, unknown>) };
      wantsArrayRows = draft.rowMode === "array";
      delete draft.types;
      delete draft.rowMode;
      sanitizedQuery = draft;
    }

    const result = await (
      originalQuery as (...args: [unknown, ...unknown[]]) => Promise<{
        rows: Array<Record<string, unknown>>;
      }>
    )(sanitizedQuery, ...rest);

    if (!wantsArrayRows) {
      return result;
    }

    return {
      ...result,
      rows: result.rows.map((row: Record<string, unknown>) => Object.values(row)),
    };
  }) as typeof pool.query;

  await runMigrations(pool);

  const db = drizzle(pool, { schema });

  return {
    db,
    repository: createAppRepository(db),
    close: async () => {
      await pool.end();
    },
  };
}
