import { describe, expect, it } from "vitest";
import { formatIntention } from "../formatIntention";
import type { Habit } from "../types";

function mkHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    kind: "build",
    name: "ランニング",
    purpose: "",
    unit: "分",
    amount: 10,
    minAmount: 5,
    amountChangedOn: "2026-10-05",
    schedule: { days: [1, 3, 5], time: "20:00" },
    place: "ジム",
    how: "",
    status: "active",
    startedOn: "2026-10-05",
    createdAt: "2026-10-05T00:00:00+09:00",
    ...overrides,
  };
}

describe("formatIntention", () => {
  it("time のみ、how なし", () => {
    const h = mkHabit();
    expect(formatIntention(h)).toBe(
      "月・水・金曜の20:00に、ジムで、ランニングを10分",
    );
  });

  it("cue のみ", () => {
    const h = mkHabit({
      name: "英単語",
      unit: "個",
      amount: 10,
      schedule: { days: [0, 1, 2, 3, 4, 5, 6], cue: "夕食の後" },
      place: "リビング",
    });
    expect(formatIntention(h)).toBe(
      "毎日の夕食の後に、リビングで、英単語を10個",
    );
  });

  it("全曜日は「毎日」", () => {
    const h = mkHabit({
      schedule: { days: [0, 1, 2, 3, 4, 5, 6], time: "07:00" },
    });
    expect(formatIntention(h)).toMatch(/^毎日の/);
  });

  it("平日は「平日」", () => {
    const h = mkHabit({
      schedule: { days: [1, 2, 3, 4, 5], time: "07:00" },
    });
    expect(formatIntention(h)).toMatch(/^平日の/);
  });

  it("土日は「土日」", () => {
    const h = mkHabit({
      schedule: { days: [0, 6], time: "10:00" },
    });
    expect(formatIntention(h)).toMatch(/^土日の/);
  });

  it("how があるとき", () => {
    const h = mkHabit({ how: "ゆっくり" });
    expect(formatIntention(h)).toBe(
      "月・水・金曜の20:00に、ジムで、ゆっくりランニングを10分",
    );
  });

  it("kind=replace のとき先頭に置き換え元", () => {
    const h = mkHabit({
      kind: "replace",
      replacesText: "寝る直前の夕食",
    });
    expect(formatIntention(h)).toMatch(/^寝る直前の夕食の代わりに、/);
  });
});
