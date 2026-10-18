import { describe, expect, it } from "vitest";
import { pendingReasonPrompts } from "../reasons";
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

describe("reasons", () => {
  it("今日-3〜今日-1 の予定日で Log がない日を返す", () => {
    const logs: Log[] = [
      mkLog("2026-10-05", true, 10),
      mkLog("2026-10-07", true, 10),
      mkLog("2026-10-09", false, 0),
      mkLog("2026-10-12", true, 10),
      mkLog("2026-10-14", true, 15),
      mkLog("2026-10-17", true, 10),
    ];
    const result = pendingReasonPrompts([H], logs, "2026-10-18");
    // 10-15(水)は予定日でない。10-16(金)は予定日でログなし
    expect(result).toEqual([{ habitId: "h1", date: "2026-10-16" }]);
  });

  it("ended 習慣は対象外", () => {
    const endedH = { ...H, status: "ended" as const };
    const result = pendingReasonPrompts([endedH], [], "2026-10-18");
    expect(result).toEqual([]);
  });
});
