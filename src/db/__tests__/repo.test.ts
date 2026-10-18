import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppDatabase } from "../db";
import {
  exportAll,
  importAll,
  recordDone,
  recordMissed,
  saveHabit,
  saveWeeklyCheck,
  undoLog,
} from "../repo";
import type { Habit, WeeklyCheck } from "../../domain/types";

let db: AppDatabase;

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const testHabit: Habit = {
  id: "h1",
  kind: "build",
  name: "テスト習慣",
  purpose: "テスト",
  unit: "回",
  amount: 10,
  minAmount: 5,
  amountChangedOn: "2026-10-05",
  schedule: { days: [1, 3, 5], time: "20:00" },
  place: "自宅",
  how: "",
  status: "active",
  startedOn: "2026-10-05",
  createdAt: "2026-10-05T00:00:00+09:00",
};

beforeEach(async () => {
  db = new AppDatabase(`test-${crypto.randomUUID()}`);
  await db.habits.add(testHabit);
});

afterEach(async () => {
  await db.delete();
});

describe("recordDone", () => {
  it("新規ログを作成する", async () => {
    const today = todayStr();
    await recordDone("h1", today, undefined, db);
    const log = await db.logs
      .where("[habitId+date]")
      .equals(["h1", today])
      .first();
    expect(log).toBeDefined();
    expect(log!.done).toBe(true);
    expect(log!.amount).toBe(10);
  });

  it("追加実行で amount が加算される", async () => {
    const today = todayStr();
    await recordDone("h1", today, 10, db);
    await recordDone("h1", today, 5, db);
    const log = await db.logs
      .where("[habitId+date]")
      .equals(["h1", today])
      .first();
    expect(log!.amount).toBe(15);
  });

  it("日付範囲外は拒否する", async () => {
    await expect(recordDone("h1", "2020-01-01", undefined, db)).rejects.toThrow(
      "記録可能範囲外",
    );
  });
});

describe("undoLog", () => {
  it("ログを削除する", async () => {
    const today = todayStr();
    await recordDone("h1", today, undefined, db);
    await undoLog("h1", today, db);
    const log = await db.logs
      .where("[habitId+date]")
      .equals(["h1", today])
      .first();
    expect(log).toBeUndefined();
  });
});

describe("recordMissed", () => {
  it("未達成ログを作成する", async () => {
    const today = todayStr();
    await recordMissed("h1", today, ["r1"], "疲れた", db);
    const log = await db.logs
      .where("[habitId+date]")
      .equals(["h1", today])
      .first();
    expect(log!.done).toBe(false);
    expect(log!.amount).toBe(0);
    expect(log!.reasonTagIds).toEqual(["r1"]);
  });
});

describe("saveHabit", () => {
  it("amount 変更時に amountChangedOn を更新する", async () => {
    const updated = { ...testHabit, amount: 20 };
    await saveHabit(updated, db);
    const habit = await db.habits.get("h1");
    expect(habit!.amountChangedOn).toBe(todayStr());
  });

  it("amount 変更なしなら amountChangedOn は変わらない", async () => {
    const updated = { ...testHabit, name: "変更後" };
    await saveHabit(updated, db);
    const habit = await db.habits.get("h1");
    expect(habit!.amountChangedOn).toBe("2026-10-05");
  });
});

describe("saveWeeklyCheck", () => {
  it("decision=end で習慣を ended にする", async () => {
    const check: WeeklyCheck = {
      id: "wc1",
      habitId: "h1",
      weekStart: "2026-10-12",
      automaticity: [3, 3, 3, 3],
      review: {
        stillUseful: 2,
        wouldChooseAgain: false,
        decision: "end",
      },
      answeredAt: new Date().toISOString(),
    };
    await saveWeeklyCheck(check, db);
    const habit = await db.habits.get("h1");
    expect(habit!.status).toBe("ended");
  });
});

describe("exportAll / importAll", () => {
  it("エクスポート→インポートでデータが復元される", async () => {
    const today = todayStr();
    await recordDone("h1", today, undefined, db);
    const json = await exportAll(db);

    const db2 = new AppDatabase(`test-import-${crypto.randomUUID()}`);
    try {
      const result = await importAll(json, db2);
      expect(result.success).toBe(true);

      const habits = await db2.habits.toArray();
      expect(habits).toHaveLength(1);
      expect(habits[0].name).toBe("テスト習慣");

      const logs = await db2.logs.toArray();
      expect(logs).toHaveLength(1);
      expect(logs[0].done).toBe(true);
    } finally {
      await db2.delete();
    }
  });

  it("不正データでは何も変更しない", async () => {
    await recordDone("h1", todayStr(), undefined, db);
    const result = await importAll('{"invalid": true}', db);
    expect(result.success).toBe(false);

    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(1);
  });
});
