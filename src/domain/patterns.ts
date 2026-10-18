import { addDays, weekdayOf } from "./dates";
import { scheduledDates } from "./schedule";
import type { Habit, LocalDate, Log } from "./types";

const WEEKDAY_LABELS = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

interface Pattern {
  key: string;
  label: string;
  rate: number;
  n: number;
  overallRate: number;
}

export function detectPatterns(
  habit: Habit,
  logs: Log[],
  today: LocalDate,
): Pattern[] {
  const end = addDays(today, -1);
  if (end < habit.startedOn) return [];

  const scheduled = scheduledDates(habit, habit.startedOn, end);
  if (scheduled.length === 0) return [];

  const doneSet = new Set(
    logs.filter((l) => l.habitId === habit.id && l.done).map((l) => l.date),
  );

  const overallDone = scheduled.filter((d) => doneSet.has(d)).length;
  const overallRate = overallDone / scheduled.length;

  const candidates: Pattern[] = [];

  // weekday conditions
  for (let wd = 0; wd <= 6; wd++) {
    const matching = scheduled.filter((d) => weekdayOf(d) === wd);
    const n = matching.length;
    if (n < 8) continue;
    const done = matching.filter((d) => doneSet.has(d)).length;
    const rate = done / n;
    if (overallRate - rate >= 0.2) {
      candidates.push({
        key: `weekday:${wd}`,
        label: WEEKDAY_LABELS[wd],
        rate,
        n,
        overallRate,
      });
    }
  }

  // prevMissed condition
  const prevMissedDates: LocalDate[] = [];
  for (let i = 1; i < scheduled.length; i++) {
    if (!doneSet.has(scheduled[i - 1])) {
      prevMissedDates.push(scheduled[i]);
    }
  }
  if (prevMissedDates.length >= 8) {
    const done = prevMissedDates.filter((d) => doneSet.has(d)).length;
    const rate = done / prevMissedDates.length;
    if (overallRate - rate >= 0.2) {
      candidates.push({
        key: "prevMissed",
        label: "前回が未達成の翌日",
        rate,
        n: prevMissedDates.length,
        overallRate,
      });
    }
  }

  candidates.sort((a, b) => (b.overallRate - b.rate) - (a.overallRate - a.rate));
  return candidates.slice(0, 3);
}

export function reasonBreakdown(
  habit: Habit,
  logs: Log[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _today: LocalDate,
): { tagId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (log.habitId !== habit.id || log.done) continue;
    for (const tagId of log.reasonTagIds) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tagId, count]) => ({ tagId, count }))
    .sort((a, b) => b.count - a.count);
}
