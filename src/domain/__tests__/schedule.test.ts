import { describe, expect, it } from "vitest";
import { isScheduled, scheduledDates } from "../schedule";
import type { Habit } from "../types";

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

describe("schedule", () => {
  it("scheduledDates は期間内の予定日を返す", () => {
    expect(scheduledDates(H, "2026-10-05", "2026-10-18")).toEqual([
      "2026-10-05",
      "2026-10-07",
      "2026-10-09",
      "2026-10-12",
      "2026-10-14",
      "2026-10-16",
    ]);
  });

  it("開始前の日は予定日でない", () => {
    expect(isScheduled(H, "2026-10-04")).toBe(false);
  });

  it("予定曜日でない日は予定日でない", () => {
    expect(isScheduled(H, "2026-10-06")).toBe(false);
  });

  it("予定曜日の日は予定日", () => {
    expect(isScheduled(H, "2026-10-05")).toBe(true);
  });

  it("endedOn 以降は予定日でない", () => {
    const ended = { ...H, endedOn: "2026-10-09" };
    expect(isScheduled(ended, "2026-10-09")).toBe(true);
    expect(isScheduled(ended, "2026-10-12")).toBe(false);
  });
});
