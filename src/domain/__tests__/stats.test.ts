import { describe, expect, it } from "vitest";
import {
  achievementRate,
  cumulativeAmount,
  streak,
  weeklySeries,
} from "../stats";
import type { Habit, Log } from "../types";

const H: Habit = {
  id: "h1",
  kind: "build",
  name: "ランニング",
  purpose: "",
  unit: "分",
  amount: 10,
  minAmount: 5,
  amountChangedOn: "2026-10-05",
  schedule: { days: [1, 3, 5] },
  place: "ジム",
  how: "",
  status: "active",
  startedOn: "2026-10-05",
  createdAt: "2026-10-05T00:00:00+09:00",
};

function mkLog(
  date: string,
  done: boolean,
  amount: number,
  reasonTagIds: string[] = [],
): Log {
  return {
    id: `log-${date}`,
    habitId: "h1",
    date,
    done,
    amount,
    reasonTagIds,
    recordedAt: `${date}T12:00:00+09:00`,
  };
}

const logs: Log[] = [
  mkLog("2026-10-05", true, 10),
  mkLog("2026-10-07", true, 10),
  mkLog("2026-10-09", false, 0, ["r1"]),
  mkLog("2026-10-12", true, 10),
  mkLog("2026-10-14", true, 15),
  // 10-16: ログなし
  mkLog("2026-10-17", true, 10), // 土曜・予定外
];

describe("stats", () => {
  describe("achievementRate", () => {
    it("期間内の達成率を返す", () => {
      const result = achievementRate(
        H,
        logs,
        "2026-10-05",
        "2026-10-18",
        "2026-10-18",
      );
      expect(result).toEqual({ rate: 4 / 6, done: 4, scheduled: 6 });
    });

    it("今日が予定日で Log がなければ分母に入れない", () => {
      const result = achievementRate(
        H,
        logs,
        "2026-10-05",
        "2026-10-16",
        "2026-10-16",
      );
      expect(result.done).toBe(4);
      expect(result.scheduled).toBe(5);
    });

    it("予定日が0なら rate は null", () => {
      const result = achievementRate(
        H,
        logs,
        "2026-10-17",
        "2026-10-17",
        "2026-10-18",
      );
      expect(result).toEqual({ rate: null, done: 0, scheduled: 0 });
    });
  });

  describe("cumulativeAmount", () => {
    it("done=true の amount 合計を返す（予定外の日も含む）", () => {
      expect(cumulativeAmount(H, logs)).toBe(55);
    });
  });

  describe("streak", () => {
    it("10-16 が未記録なら 0", () => {
      expect(streak(H, logs, "2026-10-18")).toBe(0);
    });

    it("10-16 を done にしたら 3", () => {
      const logsWithFri = [...logs, mkLog("2026-10-16", true, 10)];
      expect(streak(H, logsWithFri, "2026-10-18")).toBe(3);
    });
  });

  describe("weeklySeries", () => {
    it("週次系列を古い順に返す", () => {
      const result = weeklySeries(H, logs, "2026-10-18", 2);
      expect(result).toEqual([
        {
          weekStart: "2026-10-05",
          doneCount: 2,
          scheduledCount: 3,
          amount: 20,
        },
        {
          weekStart: "2026-10-12",
          doneCount: 2,
          scheduledCount: 3,
          amount: 35,
        },
      ]);
    });
  });
});
