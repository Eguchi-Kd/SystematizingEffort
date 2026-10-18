import { parseLocalDate, toLocalDate, weekdayOf } from "../../domain/dates";
import { isScheduled } from "../../domain/schedule";
import type { Habit, LocalDate, Log } from "../../domain/types";

const DAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"];

interface MonthCalendarProps {
  habit: Habit;
  logs: Log[];
  year: number;
  month: number; // 0-indexed
}

export default function MonthCalendar({
  habit,
  logs,
  year,
  month,
}: MonthCalendarProps) {
  const logByDate = new Map(logs.map((l) => [l.date, l]));

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayStr = toLocalDate(firstDay);
  const wd = weekdayOf(firstDayStr);
  // Monday=0 offset
  const offset = wd === 0 ? 6 : wd - 1;

  const cells: (LocalDate | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toLocalDate(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {year}年{monthNames[month]}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {DAY_HEADERS.map((dh) => (
          <div
            key={dh}
            className="py-1 font-medium text-gray-400 dark:text-gray-500"
          >
            {dh}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="py-1" />;
          }

          const d = parseLocalDate(date);
          const scheduled = isScheduled(habit, date);
          const log = logByDate.get(date);
          const done = log?.done === true;

          let cellClass =
            "relative flex h-8 w-8 items-center justify-center rounded-full mx-auto text-gray-900 dark:text-gray-100";

          if (scheduled && done) {
            cellClass += " bg-blue-500 text-white dark:bg-blue-400";
          } else if (scheduled) {
            cellClass +=
              " ring-1 ring-gray-300 dark:ring-gray-600";
          }

          return (
            <div key={date} className="py-0.5">
              <div className={cellClass}>
                {d.getDate()}
                {!scheduled && done && (
                  <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
