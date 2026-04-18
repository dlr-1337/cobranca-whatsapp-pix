import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface Queryable {
  query: (sql: string) => Promise<unknown>;
}

function migrationsDirectory() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.dirname(currentFile);
}

function splitStatements(sql: string) {
  return sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function runMigrations(client: Queryable) {
  const migrationDir = migrationsDirectory();
  const files = (await readdir(migrationDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const contents = await readFile(path.join(migrationDir, file), "utf8");

    for (const statement of splitStatements(contents)) {
      await client.query(statement);
    }
  }
}
