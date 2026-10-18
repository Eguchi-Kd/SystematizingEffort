import { describe, it, expect } from "vitest";
import { automaticityScore, graduationEligible } from "../automaticity";
import type { Habit, Log, WeeklyCheck } from "../types";

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
    startedOn: "2026-08-01",
    createdAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

function makeCheck(
  weekStart: string,
  auto: [number, number, number, number],
  review?: WeeklyCheck["review"],
): WeeklyCheck {
  return {
    id: `wc-${weekStart}`,
    habitId: "h1",
    weekStart,
    automaticity: auto,
    review,
    answeredAt: `${weekStart}T12:00:00`,
  };
}

describe("automaticityScore", () => {
  it("4問の平均を返す", () => {
    const check = makeCheck("2026-10-05", [4, 5, 3, 4]);
    expect(automaticityScore(check)).toBe(4);
  });

  it("小数結果を丸めない", () => {
    const check = makeCheck("2026-10-05", [5, 4, 5, 3]);
    expect(automaticityScore(check)).toBe(4.25);
  });
});

describe("graduationEligible", () => {
  it("条件をすべて満たすとき true", () => {
    // 57日経過、直近3回が4.0以上、達成率0.85以上
    const habit = makeHabit({ startedOn: "2026-08-18" });
    const today = "2026-10-14";

    const checks = [
      makeCheck("2026-10-05", [4, 5, 4, 4]),
      makeCheck("2026-09-28", [4, 4, 4, 4]),
      makeCheck("2026-09-21", [5, 4, 5, 4]),
    ];

    // Create enough done logs for 85% rate in 28 days
    // Mon/Wed/Fri from 09-16 to 10-13 = 12 scheduled days
    // 85% = ~10 done
    const doneDates = [
      "2026-09-16",
      "2026-09-18",
      "2026-09-21",
      "2026-09-23",
      "2026-09-25",
      "2026-09-28",
      "2026-09-30",
      "2026-10-02",
      "2026-10-05",
      "2026-10-07",
      "2026-10-09",
      "2026-10-12",
    ];
    const logs: Log[] = doneDates.map((d) => ({
      id: `log-${d}`,
      habitId: "h1",
      date: d,
      done: true,
      amount: 1,
      reasonTagIds: [],
      recordedAt: `${d}T12:00:00`,
    }));

    expect(graduationEligible(habit, logs, checks, today)).toBe(true);
  });

  it("直近3回のうち1回が3.75なら false", () => {
    const habit = makeHabit({ startedOn: "2026-08-18" });
    const today = "2026-10-14";

    const checks = [
      makeCheck("2026-10-05", [4, 5, 4, 4]),
      makeCheck("2026-09-28", [4, 3, 4, 4]),
      makeCheck("2026-09-21", [5, 4, 5, 4]),
    ];

    const doneDates = [
      "2026-09-16",
      "2026-09-18",
      "2026-09-21",
      "2026-09-23",
      "2026-09-25",
      "2026-09-28",
      "2026-09-30",
      "2026-10-02",
      "2026-10-05",
      "2026-10-07",
      "2026-10-09",
      "2026-10-12",
    ];
    const logs: Log[] = doneDates.map((d) => ({
      id: `log-${d}`,
      habitId: "h1",
      date: d,
      done: true,
      amount: 1,
      reasonTagIds: [],
      recordedAt: `${d}T12:00:00`,
    }));

    expect(graduationEligible(habit, logs, checks, today)).toBe(false);
  });

  it("50日経過なら false", () => {
    const habit = makeHabit({ startedOn: "2026-08-25" });
    const today = "2026-10-14";

    const checks = [
      makeCheck("2026-10-05", [5, 5, 5, 5]),
      makeCheck("2026-09-28", [5, 5, 5, 5]),
      makeCheck("2026-09-21", [5, 5, 5, 5]),
    ];

    const doneDates = [
      "2026-09-16",
      "2026-09-18",
      "2026-09-21",
      "2026-09-23",
      "2026-09-25",
      "2026-09-28",
      "2026-09-30",
      "2026-10-02",
      "2026-10-05",
      "2026-10-07",
      "2026-10-09",
      "2026-10-12",
    ];
    const logs: Log[] = doneDates.map((d) => ({
      id: `log-${d}`,
      habitId: "h1",
      date: d,
      done: true,
      amount: 1,
      reasonTagIds: [],
      recordedAt: `${d}T12:00:00`,
    }));

    expect(graduationEligible(habit, logs, checks, today)).toBe(false);
  });
});
