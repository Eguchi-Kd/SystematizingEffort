import { parseLocalDate } from "./dates";
import type { LocalDate } from "./types";

const DAY_NAMES_SHORT = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDateShort(date: LocalDate): string {
  const d = parseLocalDate(date);
  return `${d.getMonth() + 1}/${d.getDate()}(${DAY_NAMES_SHORT[d.getDay()]})`;
}
