import { addDays, diffDays } from "./dates";
import { achievementRate } from "./stats";
import type { Habit, LocalDate, Log, WeeklyCheck } from "./types";

export function automaticityScore(check: WeeklyCheck): number {
  const sum = check.automaticity.reduce((a, b) => a + b, 0);
  return sum / 4;
}

export function graduationEligible(
  habit: Habit,
  logs: Log[],
  checks: WeeklyCheck[],
  today: LocalDate,
): boolean {
  if (diffDays(today, habit.startedOn) < 56) return false;

  const habitChecks = checks
    .filter((c) => c.habitId === habit.id)
    .sort((a, b) => (b.weekStart > a.weekStart ? 1 : -1));

  if (habitChecks.length < 3) return false;

  const top3 = habitChecks.slice(0, 3);
  if (top3.some((c) => automaticityScore(c) < 4.0)) return false;

  const from28 = addDays(today, -27);
  const { rate } = achievementRate(habit, logs, from28, today, today);
  if (rate === null || rate < 0.8) return false;

  return true;
}
