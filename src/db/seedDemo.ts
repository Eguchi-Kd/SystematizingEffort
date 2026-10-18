import { addDays, toLocalDate, weekStartOf } from "../domain/dates";
import type {
  Countermeasure,
  Habit,
  Log,
  WeeklyCheck,
} from "../domain/types";
import { db } from "./db";
import { initializeApp } from "./init";

export async function seedDemo(): Promise<void> {
  await db.habits.clear();
  await db.logs.clear();
  await db.weeklyChecks.clear();
  await db.countermeasures.clear();

  await initializeApp();

  const today = toLocalDate(new Date());
  const startedOn = addDays(today, -56);

  const habit: Habit = {
    id: "demo-running",
    kind: "build",
    name: "ランニング",
    purpose: "体力をつける",
    unit: "分",
    amount: 10,
    minAmount: 5,
    amountChangedOn: startedOn,
    schedule: { days: [1, 3, 5], time: "07:00" },
    place: "近所の公園",
    how: "",
    status: "active",
    startedOn,
    createdAt: `${startedOn}T00:00:00`,
  };

  const habit2: Habit = {
    id: "demo-reading",
    kind: "build",
    name: "読書",
    purpose: "知識を深める",
    unit: "ページ",
    amount: 10,
    minAmount: 3,
    amountChangedOn: startedOn,
    schedule: { days: [0, 1, 2, 3, 4, 5, 6], cue: "就寝前" },
    place: "ベッド",
    how: "",
    status: "active",
    startedOn,
    createdAt: `${startedOn}T00:00:00`,
  };

  await db.habits.bulkAdd([habit, habit2]);

  const logs: Log[] = [];
  const tags = await db.reasonTags.toArray();
  const tiredTag = tags.find((t) => t.label === "疲れ");
  const forgotTag = tags.find((t) => t.label === "忘れた");

  // Running: Mon/Wed/Fri for 8 weeks
  // Fridays have low achievement (~2/8), Mon/Wed are mostly done
  for (let w = 0; w < 8; w++) {
    const weekBase = addDays(startedOn, w * 7);
    const monday = weekBase;
    const wednesday = addDays(weekBase, 2);
    const friday = addDays(weekBase, 4);

    // Monday: always done
    logs.push({
      id: `run-mon-${w}`,
      habitId: "demo-running",
      date: monday,
      done: true,
      amount: 10,
      reasonTagIds: [],
      recordedAt: `${monday}T07:30:00`,
    });

    // Wednesday: always done
    logs.push({
      id: `run-wed-${w}`,
      habitId: "demo-running",
      date: wednesday,
      done: true,
      amount: 10,
      reasonTagIds: [],
      recordedAt: `${wednesday}T07:30:00`,
    });

    // Friday: only done on weeks 0 and 3
    if (w === 0 || w === 3) {
      logs.push({
        id: `run-fri-${w}`,
        habitId: "demo-running",
        date: friday,
        done: true,
        amount: 10,
        reasonTagIds: [],
        recordedAt: `${friday}T07:30:00`,
      });
    } else {
      logs.push({
        id: `run-fri-${w}`,
        habitId: "demo-running",
        date: friday,
        done: false,
        amount: 0,
        reasonTagIds: tiredTag ? [tiredTag.id] : [],
        recordedAt: `${friday}T20:00:00`,
      });
    }
  }

  // Reading: daily for 8 weeks, with some misses
  for (let d = 0; d < 56; d++) {
    const date = addDays(startedOn, d);
    const dayOfWeek = new Date(
      parseInt(date.slice(0, 4)),
      parseInt(date.slice(5, 7)) - 1,
      parseInt(date.slice(8, 10)),
    ).getDay();

    // Miss about 1 day per week (Saturdays sometimes)
    if (dayOfWeek === 6 && d % 14 < 7) {
      logs.push({
        id: `read-${d}`,
        habitId: "demo-reading",
        date,
        done: false,
        amount: 0,
        reasonTagIds: forgotTag ? [forgotTag.id] : [],
        recordedAt: `${date}T22:00:00`,
      });
    } else {
      logs.push({
        id: `read-${d}`,
        habitId: "demo-reading",
        date,
        done: true,
        amount: 10,
        reasonTagIds: [],
        recordedAt: `${date}T22:00:00`,
      });
    }
  }

  await db.logs.bulkAdd(logs);

  // Weekly checks for running (weeks 2-7)
  const weeklyChecks: WeeklyCheck[] = [];
  for (let w = 2; w < 8; w++) {
    const ws = weekStartOf(addDays(startedOn, w * 7));
    weeklyChecks.push({
      id: `wc-run-${w}`,
      habitId: "demo-running",
      weekStart: ws,
      automaticity: [
        Math.min(5, 2 + Math.floor(w / 2)) as 1 | 2 | 3 | 4 | 5,
        Math.min(5, 2 + Math.floor(w / 2)) as 1 | 2 | 3 | 4 | 5,
        Math.min(5, 1 + Math.floor(w / 2)) as 1 | 2 | 3 | 4 | 5,
        Math.min(5, 2 + Math.floor(w / 2)) as 1 | 2 | 3 | 4 | 5,
      ],
      answeredAt: `${ws}T18:00:00`,
    });
  }

  // Weekly checks for reading (weeks 2-7), higher scores
  for (let w = 2; w < 8; w++) {
    const ws = weekStartOf(addDays(startedOn, w * 7));
    weeklyChecks.push({
      id: `wc-read-${w}`,
      habitId: "demo-reading",
      weekStart: ws,
      automaticity: [
        Math.min(5, 3 + Math.floor(w / 2)) as 1 | 2 | 3 | 4 | 5,
        Math.min(5, 3 + Math.floor(w / 2)) as 1 | 2 | 3 | 4 | 5,
        Math.min(5, 3 + Math.floor(w / 2)) as 1 | 2 | 3 | 4 | 5,
        Math.min(5, 3 + Math.floor(w / 2)) as 1 | 2 | 3 | 4 | 5,
      ],
      answeredAt: `${ws}T18:00:00`,
    });
  }

  await db.weeklyChecks.bulkAdd(weeklyChecks);

  const countermeasures: Countermeasure[] = [
    {
      id: "cm-1",
      habitId: "demo-running",
      conditionKey: "weekday:5",
      conditionLabel: "金曜日",
      action: "木曜夜にウェアを準備しておく",
      createdOn: addDays(today, -14),
    },
  ];
  await db.countermeasures.bulkAdd(countermeasures);
}
