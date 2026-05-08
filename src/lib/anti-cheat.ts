// Layered defenses from CLAUDE.md §7. Each rule has a clear name so
// rejected submissions can be filed under a specific reason in logs.

export const SCORE_PER_SECOND_MAX = 350;
export const MIN_DURATION_SECONDS = 5;
export const MAX_SCORE = 50000;
export const RATE_LIMIT_SECONDS = 5;
export const WALL_CLOCK_TOLERANCE_SECONDS = 5;

export interface ScoreSubmission {
  score: number;
  durationSeconds: number;
  rankTitle: string;
  startedAt: Date | null;
  lastSubmissionAt: Date | null;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string; status: number };

export function validateScore(
  input: ScoreSubmission,
  now: Date = new Date(),
): ValidationResult {
  const { score, durationSeconds, startedAt, lastSubmissionAt } = input;

  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    !Number.isInteger(score) ||
    score < 0
  ) {
    return { ok: false, reason: "invalid_score", status: 400 };
  }
  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 0
  ) {
    return { ok: false, reason: "invalid_duration", status: 400 };
  }
  if (durationSeconds < MIN_DURATION_SECONDS) {
    return { ok: false, reason: "duration_below_floor", status: 400 };
  }
  if (score > MAX_SCORE) {
    return { ok: false, reason: "score_above_ceiling", status: 400 };
  }
  if (score / Math.max(1, durationSeconds) > SCORE_PER_SECOND_MAX) {
    return { ok: false, reason: "score_per_second_too_high", status: 400 };
  }
  if (lastSubmissionAt) {
    const sinceLast = (now.getTime() - lastSubmissionAt.getTime()) / 1000;
    if (sinceLast < RATE_LIMIT_SECONDS) {
      return { ok: false, reason: "rate_limited", status: 429 };
    }
  }
  if (startedAt) {
    const elapsedReal = (now.getTime() - startedAt.getTime()) / 1000;
    if (Math.abs(elapsedReal - durationSeconds) > WALL_CLOCK_TOLERANCE_SECONDS) {
      return { ok: false, reason: "wall_clock_mismatch", status: 400 };
    }
  }
  return { ok: true };
}
