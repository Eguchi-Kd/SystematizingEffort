import { diffDays, toLocalDate } from "../domain/dates";
import { exportDataSchema } from "../domain/exportSchema";
import type { Countermeasure, Habit, HabitStatus, LocalDate, WeeklyCheck } from "../domain/types";
import type { AppDatabase } from "./db";
import { db as defaultDb } from "./db";

function assertDateInRange(date: LocalDate, today: LocalDate): void {
  const diff = diffDays(today, date);
  if (diff < 0 || diff > 3) {
    throw new Error(`日付 ${date} は記録可能範囲外です`);
  }
}

function getToday(): LocalDate {
  return toLocalDate(new Date());
}

export async function recordDone(
  habitId: string,
  date: LocalDate,
  amount?: number,
  db: AppDatabase = defaultDb,
): Promise<void> {
  const today = getToday();
  assertDateInRange(date, today);

  const habit = await db.habits.get(habitId);
  if (!habit) throw new Error(`習慣 ${habitId} が見つかりません`);

  const existing = await db.logs
    .where("[habitId+date]")
    .equals([habitId, date])
    .first();

  const effectiveAmount = amount ?? habit.amount;

  if (existing) {
    if (existing.done) {
      await db.logs.update(existing.id, {
        amount: existing.amount + effectiveAmount,
        recordedAt: new Date().toISOString(),
      });
    } else {
      await db.logs.update(existing.id, {
        done: true,
        amount: effectiveAmount,
        reasonTagIds: [],
        recordedAt: new Date().toISOString(),
      });
    }
  } else {
    await db.logs.add({
      id: crypto.randomUUID(),
      habitId,
      date,
      done: true,
      amount: effectiveAmount,
      reasonTagIds: [],
      recordedAt: new Date().toISOString(),
    });
  }
}

export async function undoLog(
  habitId: string,
  date: LocalDate,
  db: AppDatabase = defaultDb,
): Promise<void> {
  const existing = await db.logs
    .where("[habitId+date]")
    .equals([habitId, date])
    .first();
  if (existing) {
    await db.logs.delete(existing.id);
  }
}

export async function recordMissed(
  habitId: string,
  date: LocalDate,
  reasonTagIds: string[],
  memo?: string,
  db: AppDatabase = defaultDb,
): Promise<void> {
  const today = getToday();
  assertDateInRange(date, today);

  const existing = await db.logs
    .where("[habitId+date]")
    .equals([habitId, date])
    .first();

  if (existing) {
    await db.logs.update(existing.id, {
      done: false,
      amount: 0,
      reasonTagIds,
      memo,
      recordedAt: new Date().toISOString(),
    });
  } else {
    await db.logs.add({
      id: crypto.randomUUID(),
      habitId,
      date,
      done: false,
      amount: 0,
      reasonTagIds,
      memo,
      recordedAt: new Date().toISOString(),
    });
  }
}

export async function saveHabit(
  habit: Habit,
  db: AppDatabase = defaultDb,
): Promise<void> {
  const existing = await db.habits.get(habit.id);
  if (existing && existing.amount !== habit.amount) {
    habit = { ...habit, amountChangedOn: getToday() };
  }
  await db.habits.put(habit);
}

export async function setHabitStatus(
  habitId: string,
  status: HabitStatus,
  note?: string,
  db: AppDatabase = defaultDb,
): Promise<void> {
  const today = getToday();
  const updates: Partial<Habit> = { status };

  if (status === "graduated" || status === "ended") {
    updates.endedOn = today;
    if (note) updates.endNote = note;
  } else if (status === "active") {
    updates.endedOn = undefined;
    updates.endNote = undefined;
  }

  await db.habits.update(habitId, updates);
}

export async function saveWeeklyCheck(
  check: WeeklyCheck,
  db: AppDatabase = defaultDb,
): Promise<void> {
  await db.weeklyChecks.put(check);

  if (check.review?.decision === "end") {
    await setHabitStatus(check.habitId, "ended", undefined, db);
  }
}

export async function saveCountermeasure(
  cm: Countermeasure,
  db: AppDatabase = defaultDb,
): Promise<void> {
  await db.countermeasures.put(cm);
}

export async function exportAll(
  db: AppDatabase = defaultDb,
): Promise<string> {
  const [habits, logs, reasonTags, weeklyChecks, countermeasures, settings] =
    await Promise.all([
      db.habits.toArray(),
      db.logs.toArray(),
      db.reasonTags.toArray(),
      db.weeklyChecks.toArray(),
      db.countermeasures.toArray(),
      db.settings.get("singleton"),
    ]);

  const data = {
    app: "effort-system" as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    habits,
    logs,
    reasonTags,
    weeklyChecks,
    countermeasures,
    settings: settings ?? {
      id: "singleton" as const,
      showStreak: true,
      onboarded: false,
    },
  };

  await db.settings.put({
    ...(settings ?? { id: "singleton", showStreak: true, onboarded: false }),
    lastExportAt: data.exportedAt,
  });

  return JSON.stringify(data, null, 2);
}

export async function importAll(
  json: string,
  db: AppDatabase = defaultDb,
): Promise<{ success: boolean; error?: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { success: false, error: "JSONの形式が不正です" };
  }

  const result = exportDataSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { success: false, error: issues };
  }

  const data = result.data;

  await db.transaction(
    "rw",
    [
      db.habits,
      db.logs,
      db.reasonTags,
      db.weeklyChecks,
      db.countermeasures,
      db.settings,
    ],
    async () => {
      await Promise.all([
        db.habits.clear(),
        db.logs.clear(),
        db.reasonTags.clear(),
        db.weeklyChecks.clear(),
        db.countermeasures.clear(),
        db.settings.clear(),
      ]);

      await Promise.all([
        db.habits.bulkAdd(data.habits),
        db.logs.bulkAdd(data.logs),
        db.reasonTags.bulkAdd(data.reasonTags),
        db.weeklyChecks.bulkAdd(data.weeklyChecks),
        db.countermeasures.bulkAdd(data.countermeasures),
        db.settings.put(data.settings),
      ]);
    },
  );

  return { success: true };
}
