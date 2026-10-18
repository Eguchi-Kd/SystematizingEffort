import { addDays } from "./dates";
import { isScheduled } from "./schedule";
import type { Habit, LocalDate, Log } from "./types";

export function pendingReasonPrompts(
  habits: Habit[],
  logs: Log[],
  today: LocalDate,
): { habitId: string; date: LocalDate }[] {
  const logSet = new Set(logs.map((l) => `${l.habitId}:${l.date}`));
  const result: { habitId: string; date: LocalDate }[] = [];

  for (const habit of habits) {
    if (habit.status !== "active") continue;
    for (let i = -3; i <= -1; i++) {
      const date = addDays(today, i);
      if (
        isScheduled(habit, date) &&
        !logSet.has(`${habit.id}:${date}`)
      ) {
        result.push({ habitId: habit.id, date });
      }
    }
  }

  return result;
}
