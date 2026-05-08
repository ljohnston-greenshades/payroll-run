// Anti-cheat is intentionally loose for booth gameplay: the goal is
// to catch obviously-fabricated submissions, not to penalize skilled
// players or strange but plausible runs. We don't lose anything if a
// few outlier scores slip through; the admin panel can clean them up.
export const SCORE_PER_SECOND_MAX = 10_000;
export const MIN_DURATION_SECONDS = 1;
export const MAX_SCORE = 999_999;
export const RATE_LIMIT_SECONDS = 2;
export const WALL_CLOCK_TOLERANCE_SECONDS = 60;

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
