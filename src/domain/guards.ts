import { addDays, diffDays } from "./dates";
import { achievementRate } from "./stats";
import { scheduledDates } from "./schedule";
import type { Habit, LocalDate, Log, Persona } from "./types";

export function smallStartSuggestion(
  amount: number,
  minAmount: number,
  persona?: Persona,
): number | null {
  const k = persona === "selfblame" ? 1.5 : 2;
  return amount > minAmount * k ? minAmount : null;
}

export function levelUpSuggestion(
  habit: Habit,
  logs: Log[],
  today: LocalDate,
): number | null {
  const from = addDays(today, -13);
  const scheduled = scheduledDates(habit, from, today);
  if (scheduled.length < 4) return null;

  if (diffDays(today, habit.amountChangedOn) < 14) return null;

  const { rate } = achievementRate(habit, logs, from, today, today);
  if (rate === null || rate < 0.9) return null;

  return Math.max(habit.amount + 1, Math.ceil(habit.amount * 1.25));
}
