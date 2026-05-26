// Posts a short message to a Slack incoming webhook. Used by the
// demo-request endpoint to flag unrouted leads so the events team
// can manually QB them.
//
// Set `SLACK_LEADS_WEBHOOK_URL` to enable. If unset, calls are
// no-ops — keeps local dev and unconfigured environments clean.

export async function notifyEventsTeam(payload: {
  playerName: string;
  email: string;
  company: string | null;
  eventName: string;
  bestScore: number | null;
}): Promise<void> {
  const url = process.env.SLACK_LEADS_WEBHOOK_URL;
  if (!url) return;
  const score =
    payload.bestScore != null
      ? ` — best score $${payload.bestScore.toLocaleString()}`
      : "";
  const text = `🛡 Demo request needs routing: *${payload.playerName}* <${payload.email}> from ${payload.company ?? "—"} at *${payload.eventName}*${score}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.warn("Slack notification failed:", err);
  }
}
