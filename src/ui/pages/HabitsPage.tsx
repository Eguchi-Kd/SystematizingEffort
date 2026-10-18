import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { toLocalDate, addDays } from "../../domain/dates";
import { achievementRate } from "../../domain/stats";
import type { Habit, Log } from "../../domain/types";
import Button from "../components/Button";

function HabitRow({ habit, logs }: { habit: Habit; logs: Log[] }) {
  const today = toLocalDate(new Date());
  const from = addDays(today, -27);
  const habitLogs = logs.filter((l) => l.habitId === habit.id);
  const { done, scheduled } = achievementRate(habit, habitLogs, from, today, today);

  return (
    <Link
      to={`/habits/${habit.id}`}
      className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {habit.name}
      </span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        28日間 {done}/{scheduled}回
      </span>
    </Link>
  );
}

export default function HabitsPage() {
  const habits = useLiveQuery(() => db.habits.toArray()) ?? [];
  const logs = useLiveQuery(() => db.logs.toArray()) ?? [];

  const active = habits.filter((h) => h.status === "active");
  const graduated = habits.filter((h) => h.status === "graduated");
  const ended = habits.filter((h) => h.status === "ended");

  return (
    <div className="flex-1 p-4 pb-20">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">習慣</h1>
        <Link to="/habits/new">
          <Button size="sm">+ 新しい習慣</Button>
        </Link>
      </div>

      {habits.length === 0 && (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">
          習慣がまだありません
        </p>
      )}

      {active.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            実行中
          </h2>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {active.map((h) => (
              <HabitRow key={h.id} habit={h} logs={logs} />
            ))}
          </div>
        </section>
      )}

      {graduated.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            定着済み
          </h2>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {graduated.map((h) => (
              <HabitRow key={h.id} habit={h} logs={logs} />
            ))}
          </div>
        </section>
      )}

      {ended.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            終了
          </h2>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {ended.map((h) => (
              <HabitRow key={h.id} habit={h} logs={logs} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
