import { addDays, diffDays, weekStartOf } from "./dates";
import { isScheduled, scheduledDates } from "./schedule";
import type { Habit, LocalDate, Log } from "./types";

export function achievementRate(
  habit: Habit,
  logs: Log[],
  from: LocalDate,
  to: LocalDate,
  today: LocalDate,
): { rate: number | null; done: number; scheduled: number } {
  const effectiveTo = to <= today ? to : today;
  const scheduled = scheduledDates(habit, from, effectiveTo);
  const logByDate = new Map(logs.map((l) => [l.date, l]));

  const todayHasLog = logByDate.get(today)?.done === true;
  const countDates = scheduled.filter(
    (d) => d !== today || todayHasLog,
  );

  const done = countDates.filter(
    (d) => logByDate.get(d)?.done === true,
  ).length;
  const scheduledCount = countDates.length;

  return {
    rate: scheduledCount === 0 ? null : done / scheduledCount,
    done,
    scheduled: scheduledCount,
  };
}

export function cumulativeAmount(_habit: Habit, logs: Log[]): number {
  return logs
    .filter((l) => l.done)
    .reduce((sum, l) => sum + l.amount, 0);
}

export function weeklySeries(
  habit: Habit,
  logs: Log[],
  today: LocalDate,
  weeks = 12,
): {
  weekStart: LocalDate;
  doneCount: number;
  scheduledCount: number;
  amount: number;
}[] {
  const logByDate = new Map(logs.map((l) => [l.date, l]));
  const currentWeekStart = weekStartOf(today);
  const result: {
    weekStart: LocalDate;
    doneCount: number;
    scheduledCount: number;
    amount: number;
  }[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(currentWeekStart, -7 * i);
    const we = addDays(ws, 6);
    const scheduled = scheduledDates(habit, ws, we);
    let doneCount = 0;
    let amount = 0;

    for (let d = 0; d < 7; d++) {
      const date = addDays(ws, d);
      const log = logByDate.get(date);
      if (log?.done) {
        amount += log.amount;
        if (scheduled.includes(date)) {
          doneCount++;
        }
      }
    }

    result.push({
      weekStart: ws,
      doneCount,
      scheduledCount: scheduled.length,
      amount,
    });
  }

  return result;
}

export function streak(
  habit: Habit,
  logs: Log[],
  today: LocalDate,
): number {
  const logByDate = new Map(logs.map((l) => [l.date, l]));
  let count = 0;

  const start = habit.startedOn;
  const days = diffDays(today, start);

  const scheduledDays: LocalDate[] = [];
  for (let i = days; i >= 0; i--) {
    const d = addDays(start, i);
    if (isScheduled(habit, d)) {
      scheduledDays.push(d);
    }
  }

  for (const d of scheduledDays) {
    const log = logByDate.get(d);
    if (d === today && !log) {
      continue;
    }
    if (log?.done) {
      count++;
    } else {
      break;
    }
  }

  return count;
}
