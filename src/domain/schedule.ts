import { addDays, diffDays, weekdayOf } from "./dates";
import type { Habit, LocalDate } from "./types";

export function isScheduled(habit: Habit, date: LocalDate): boolean {
  if (date < habit.startedOn) return false;
  if (habit.endedOn && date > habit.endedOn) return false;
  return habit.schedule.days.includes(weekdayOf(date));
}

export function scheduledDates(
  habit: Habit,
  from: LocalDate,
  to: LocalDate,
): LocalDate[] {
  const result: LocalDate[] = [];
  const days = diffDays(to, from);
  for (let i = 0; i <= days; i++) {
    const d = addDays(from, i);
    if (isScheduled(habit, d)) {
      result.push(d);
    }
  }
  return result;
}
