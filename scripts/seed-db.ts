import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "@vercel/postgres";

function parseStatements(contents: string): string[] {
  // Strip line comments first so we don't accidentally filter out a
  // CREATE TABLE just because the file's first non-blank line is a comment.
  const stripped = contents.replace(/^\s*--.*$/gm, "");
  return stripped
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function runFile(name: string): Promise<void> {
  const path = join(process.cwd(), "sql", name);
  const statements = parseStatements(readFileSync(path, "utf8"));
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
