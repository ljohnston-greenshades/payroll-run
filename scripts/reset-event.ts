import "dotenv/config";
import { sql } from "@vercel/postgres";

async function main(): Promise<void> {
  const eventSlug = process.env.NEXT_PUBLIC_EVENT_SLUG;
  if (!eventSlug) {
    throw new Error("NEXT_PUBLIC_EVENT_SLUG must be set in the environment.");
  }

  console.log(`Clearing scores for event: ${eventSlug}`);
  const { rowCount } = await sql`
    DELETE FROM scores WHERE event_slug = ${eventSlug}
  `;
  console.log(`✓ Deleted ${rowCount ?? 0} score rows. Players preserved.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
