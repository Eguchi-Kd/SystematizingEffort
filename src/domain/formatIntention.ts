import type { Habit } from "./types";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function formatDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);

  if (sorted.length === 7) return "毎日";

  const weekdays = [1, 2, 3, 4, 5];
  if (
    sorted.length === 5 &&
    sorted.every((d, i) => d === weekdays[i])
  ) {
    return "平日";
  }

  const weekend = [0, 6];
  if (
    sorted.length === 2 &&
    sorted.every((d, i) => d === weekend[i])
  ) {
    return "土日";
  }

  return sorted.map((d) => DAY_NAMES[d]).join("・") + "曜";
}

export function formatIntention(habit: Habit): string {
  const parts: string[] = [];

  if (habit.kind === "replace" && habit.replacesText) {
    parts.push(`${habit.replacesText}の代わりに、`);
  }

  const dayStr = formatDays(habit.schedule.days);
  const trigger = habit.schedule.time ?? habit.schedule.cue ?? "";
  parts.push(`${dayStr}の${trigger}に、`);

  parts.push(`${habit.place}で、`);

  if (habit.how) {
    parts.push(`${habit.how}`);
  }

  parts.push(`${habit.name}を${habit.amount}${habit.unit}`);

  return parts.join("");
}
