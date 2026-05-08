import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "@vercel/postgres";

async function runFile(name: string): Promise<void> {
  const path = join(process.cwd(), "sql", name);
  const contents = readFileSync(path, "utf8");
  const statements = contents
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  console.log(`▶ ${name} (${statements.length} statements)`);
  for (const statement of statements) {
    await sql.query(statement);
  }
}

async function main(): Promise<void> {
  await runFile("001-create-tables.sql");
  await runFile("002-indexes.sql");
  console.log("✓ Database initialized.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
