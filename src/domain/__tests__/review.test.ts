import { describe, it, expect } from "vitest";
import { reviewDue } from "../review";
import type { Habit, WeeklyCheck } from "../types";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    kind: "build",
    name: "テスト",
    purpose: "",
    unit: "回",
    amount: 1,
    minAmount: 1,
    amountChangedOn: "2026-08-01",
    schedule: { days: [1, 3, 5] },
    place: "",
    how: "",
    status: "active",
    startedOn: "2026-09-01",
    createdAt: "2026-09-01T00:00:00",
    ...overrides,
  };
}

function makeCheck(
  weekStart: string,
  review?: WeeklyCheck["review"],
): WeeklyCheck {
  return {
    id: `wc-${weekStart}`,
    habitId: "h1",
    weekStart,
    automaticity: [3, 3, 3, 3],
    review,
    answeredAt: `${weekStart}T12:00:00`,
  };
}

describe("reviewDue", () => {
  it("28日以上経過しレビュー付きチェックがなければ true", () => {
    const habit = makeHabit({ startedOn: "2026-09-01" });
    const checks: WeeklyCheck[] = [
      makeCheck("2026-09-21"),
    ];
    expect(reviewDue(habit, checks, "2026-10-01")).toBe(true);
  });

  it("28日未満なら false", () => {
    const habit = makeHabit({ startedOn: "2026-09-10" });
    expect(reviewDue(habit, [], "2026-10-01")).toBe(false);
  });

  it("直近28日以内にレビュー付きチェックがあれば false", () => {
    const habit = makeHabit({ startedOn: "2026-09-01" });
    const checks = [
      makeCheck("2026-09-14", {
        stillUseful: 4,
        wouldChooseAgain: true,
        decision: "continue",
      }),
    ];
    expect(reviewDue(habit, checks, "2026-10-01")).toBe(false);
  });

  it("persona=meaning なら間隔が14日になる", () => {
    const habit = makeHabit({ startedOn: "2026-09-15" });
    expect(reviewDue(habit, [], "2026-10-01", "meaning")).toBe(true);
  });

  it("persona=meaning で14日未満なら false", () => {
    const habit = makeHabit({ startedOn: "2026-09-20" });
    expect(reviewDue(habit, [], "2026-10-01", "meaning")).toBe(false);
  });
});
