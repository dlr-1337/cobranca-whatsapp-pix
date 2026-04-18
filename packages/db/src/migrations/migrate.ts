import { createDatabase } from "../client.js";
import { runMigrations } from "./run-migrations.js";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const { pool } = createDatabase(databaseUrl);

  try {
    await runMigrations(pool);
  } finally {
    await pool.end();
  }
}

void main();
