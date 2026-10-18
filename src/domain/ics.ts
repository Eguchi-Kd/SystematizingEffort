import type { Habit } from "./types";

const RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function exportIcs(habit: Habit): string | null {
  if (!habit.schedule.time) return null;

  const [hours, minutes] = habit.schedule.time.split(":").map(Number);
  const byDay = habit.schedule.days.map((d) => RRULE_DAYS[d]).join(",");

  const dtstart = new Date();
  dtstart.setHours(hours, minutes, 0, 0);

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const dtEnd = new Date(dtstart);
  dtEnd.setMinutes(dtEnd.getMinutes() + habit.amount);

  const uid = `${habit.id}@effort-system`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EffortSystem//JP",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${formatDate(dtstart)}`,
    `DTEND:${formatDate(dtEnd)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
    `SUMMARY:${habit.name}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
