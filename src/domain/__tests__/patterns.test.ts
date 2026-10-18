import { describe, it, expect } from "vitest";
import { detectPatterns, reasonBreakdown } from "../patterns";
import type { Habit, Log } from "../types";

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
    startedOn: "2026-08-17",
    createdAt: "2026-08-17T00:00:00",
    ...overrides,
  };
}

function makeLogs(
  habitId: string,
  dates: string[],
  done: boolean,
  reasonTagIds: string[] = [],
): Log[] {
  return dates.map((date) => ({
    id: `log-${date}`,
    habitId,
    date,
    done,
    amount: done ? 1 : 0,
    reasonTagIds,
    recordedAt: `${date}T12:00:00`,
  }));
}

describe("detectPatterns", () => {
  it("金曜だけ達成率が低い場合に weekday:5 を返す", () => {
    // 月水金の習慣、8週間分
    // 金曜だけ8回中2回done、月水はすべてdone
    const habit = makeHabit({
      startedOn: "2026-08-17",
      schedule: { days: [1, 3, 5] },
    });

    const doneDates: string[] = [];
    const today = "2026-10-12";

    // 8 weeks: 2026-08-17 ~ 2026-10-11
    // Mondays: 08-17, 08-24, 08-31, 09-07, 09-14, 09-21, 09-28, 10-05
    // Wednesdays: 08-19, 08-26, 09-02, 09-09, 09-16, 09-23, 09-30, 10-07
    // Fridays: 08-21, 08-28, 09-04, 09-11, 09-18, 09-25, 10-02, 10-09
    const mondays = [
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
      "2026-10-05",
    ];
    const wednesdays = [
      "2026-08-19",
      "2026-08-26",
      "2026-09-02",
      "2026-09-09",
      "2026-09-16",
      "2026-09-23",
      "2026-09-30",
      "2026-10-07",
    ];
    const fridays = [
      "2026-08-21",
      "2026-08-28",
      "2026-09-04",
      "2026-09-11",
      "2026-09-18",
      "2026-09-25",
      "2026-10-02",
      "2026-10-09",
    ];

    doneDates.push(...mondays, ...wednesdays);
    // Only 2 of 8 Fridays done
    doneDates.push(fridays[0], fridays[3]);

    const logs = makeLogs("h1", doneDates, true);

    const result = detectPatterns(habit, logs, today);

    expect(result.length).toBe(1);
    expect(result[0].key).toBe("weekday:5");
    expect(result[0].label).toBe("金曜日");
    expect(result[0].rate).toBe(0.25);
    expect(result[0].n).toBe(8);
    expect(result[0].overallRate).toBeCloseTo(18 / 24);
  });

  it("金曜の予定日が7日しかない場合は空配列", () => {
    const habit = makeHabit({
      startedOn: "2026-08-24",
      schedule: { days: [1, 3, 5] },
    });

    const mondays = [
      "2026-08-24",
      "2026-08-31",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
      "2026-10-05",
    ];
    const wednesdays = [
      "2026-08-26",
      "2026-09-02",
      "2026-09-09",
      "2026-09-16",
      "2026-09-23",
      "2026-09-30",
      "2026-10-07",
    ];
    // 7 Fridays only
    const fridays = [
      "2026-08-28",
      "2026-09-04",
      "2026-09-11",
      "2026-09-18",
      "2026-09-25",
      "2026-10-02",
      "2026-10-09",
    ];

    const doneDates = [...mondays, ...wednesdays, fridays[0]];
    const logs = makeLogs("h1", doneDates, true);
    const today = "2026-10-12";

    const result = detectPatterns(habit, logs, today);
    expect(result).toEqual([]);
  });
});

describe("reasonBreakdown", () => {
  it("未達成ログの理由タグを集計する", () => {
    const habit = makeHabit({ startedOn: "2026-10-01" });
    const logs: Log[] = [
      ...makeLogs("h1", ["2026-10-01"], false, ["tag-tired"]),
      ...makeLogs("h1", ["2026-10-03"], false, ["tag-tired"]),
      ...makeLogs("h1", ["2026-10-05"], false, ["tag-forgot"]),
      ...makeLogs("h1", ["2026-10-07"], true),
    ];

    const result = reasonBreakdown(habit, logs, "2026-10-12");
    expect(result).toContainEqual({ tagId: "tag-tired", count: 2 });
    expect(result).toContainEqual({ tagId: "tag-forgot", count: 1 });
    expect(result.length).toBe(2);
  });
});
