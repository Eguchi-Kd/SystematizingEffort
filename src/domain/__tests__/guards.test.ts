import { describe, expect, it } from "vitest";
import { smallStartSuggestion, levelUpSuggestion } from "../guards";
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

function mkLog(date: string, done: boolean, amount: number): Log {
  return {
    id: `log-${date}`,
    habitId: "h1",
    date,
    done,
    amount,
    reasonTagIds: [],
    recordedAt: `${date}T12:00:00+09:00`,
  };
}

describe("guards", () => {
  describe("smallStartSuggestion", () => {
    it("amount > minAmount * 2 なら minAmount を返す", () => {
      expect(smallStartSuggestion(60, 10)).toBe(10);
    });

    it("amount <= minAmount * 2 なら null", () => {
      expect(smallStartSuggestion(20, 10)).toBe(null);
    });

    it("selfblame は倍率 1.5", () => {
      expect(smallStartSuggestion(16, 10, "selfblame")).toBe(10);
    });

    it("selfblame でも倍率以下なら null", () => {
      expect(smallStartSuggestion(15, 10, "selfblame")).toBe(null);
    });
  });

  describe("levelUpSuggestion", () => {
    it("条件をすべて満たすとき提案を返す", () => {
      const today = "2026-10-18";
      const habit = { ...H, amountChangedOn: "2026-10-03" }; // 15日前
      // 直近14日: 10-05〜10-18 の予定日は 10-05,07,09,12,14,16 の6日
      const logs: Log[] = [
        mkLog("2026-10-05", true, 10),
        mkLog("2026-10-07", true, 10),
        mkLog("2026-10-09", true, 10),
        mkLog("2026-10-12", true, 10),
        mkLog("2026-10-14", true, 10),
        mkLog("2026-10-16", true, 10),
      ];
      expect(levelUpSuggestion(habit, logs, today)).toBe(13);
    });

    it("amountChangedOn が14日未満なら null", () => {
      const today = "2026-10-18";
      const habit = { ...H, amountChangedOn: "2026-10-08" }; // 10日前
      const logs: Log[] = [
        mkLog("2026-10-05", true, 10),
        mkLog("2026-10-07", true, 10),
        mkLog("2026-10-09", true, 10),
        mkLog("2026-10-12", true, 10),
        mkLog("2026-10-14", true, 10),
        mkLog("2026-10-16", true, 10),
      ];
      expect(levelUpSuggestion(habit, logs, today)).toBe(null);
    });
  });
});
