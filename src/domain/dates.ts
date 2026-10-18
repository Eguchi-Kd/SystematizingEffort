import { addDays as fnsAddDays, differenceInCalendarDays, getDay, startOfWeek, format, parse } from "date-fns";
import type { LocalDate } from "./types";

export function toLocalDate(d: Date): LocalDate {
  return format(d, "yyyy-MM-dd");
}

export function parseLocalDate(s: LocalDate): Date {
  return parse(s, "yyyy-MM-dd", new Date());
}

export function addDays(s: LocalDate, n: number): LocalDate {
  return toLocalDate(fnsAddDays(parseLocalDate(s), n));
}

export function diffDays(a: LocalDate, b: LocalDate): number {
  return differenceInCalendarDays(parseLocalDate(a), parseLocalDate(b));
}

export function weekStartOf(s: LocalDate): LocalDate {
  return toLocalDate(startOfWeek(parseLocalDate(s), { weekStartsOn: 1 }));
}

export function weekdayOf(s: LocalDate): number {
  return getDay(parseLocalDate(s));
}
