import { diffDays } from "./dates";
import type { Habit, LocalDate, Persona, WeeklyCheck } from "./types";

export function reviewDue(
  habit: Habit,
  checks: WeeklyCheck[],
  today: LocalDate,
  persona?: Persona,
): boolean {
  const interval = persona === "meaning" ? 14 : 28;

  if (diffDays(today, habit.startedOn) < interval) return false;

  const habitChecks = checks.filter(
    (c) => c.habitId === habit.id && c.review !== undefined,
  );

  if (habitChecks.length === 0) return true;

  const latestReview = habitChecks.reduce((a, b) =>
    a.weekStart > b.weekStart ? a : b,
  );

  return diffDays(today, latestReview.weekStart) >= interval;
}
