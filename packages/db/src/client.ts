import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema/index.js";

export type CobraZapDatabase = ReturnType<typeof drizzle<typeof schema>>;

export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
  });

  return {
    pool,
    db: drizzle(pool, { schema }),
  };
}
