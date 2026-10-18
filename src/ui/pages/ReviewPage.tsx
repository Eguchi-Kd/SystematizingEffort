import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { saveCountermeasure } from "../../db/repo";
import { toLocalDate, addDays, weekStartOf } from "../../domain/dates";
import { scheduledDates } from "../../domain/schedule";
import { detectPatterns, reasonBreakdown } from "../../domain/patterns";
import type { Countermeasure } from "../../domain/types";
import Button from "../components/Button";
import Card from "../components/Card";

export default function ReviewPage() {
  const habits = useLiveQuery(() => db.habits.toArray()) ?? [];
  const logs = useLiveQuery(() => db.logs.toArray()) ?? [];
  const reasonTags = useLiveQuery(() => db.reasonTags.toArray()) ?? [];
  const countermeasures =
    useLiveQuery(() => db.countermeasures.toArray()) ?? [];

  const activeHabits = habits.filter((h) => h.status === "active");
  const today = toLocalDate(new Date());
  const thisWeekStart = weekStartOf(today);
  const thisWeekEnd = addDays(thisWeekStart, 6);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);

  const logByDate = new Map(logs.map((l) => [`${l.habitId}:${l.date}`, l]));
  const tagMap = new Map(reasonTags.map((t) => [t.id, t.label]));

  return (
    <div className="flex-1 space-y-4 p-4 pb-20">
      <h1 className="text-xl font-bold">振り返り</h1>

      {activeHabits.length === 0 && (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">
          実行中の習慣がありません
        </p>
      )}

      {activeHabits.map((habit) => {
        const habitLogs = logs.filter((l) => l.habitId === habit.id);

        const thisWeekScheduled = scheduledDates(
          habit,
          thisWeekStart,
          thisWeekEnd,
        );
        const thisWeekDone = thisWeekScheduled.filter(
          (d) => logByDate.get(`${habit.id}:${d}`)?.done === true,
        ).length;

        const lastWeekScheduled = scheduledDates(
          habit,
          lastWeekStart,
          lastWeekEnd,
        );
        const lastWeekDone = lastWeekScheduled.filter(
          (d) => logByDate.get(`${habit.id}:${d}`)?.done === true,
        ).length;

        const patterns = detectPatterns(habit, habitLogs, today);
        const reasons = reasonBreakdown(habit, habitLogs, today);
        const habitCMs = countermeasures.filter(
          (c) => c.habitId === habit.id,
        );

        return (
          <Card key={habit.id}>
            <h2 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
              {habit.name}
            </h2>
            <div className="mb-3 flex gap-6 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  今週
                </span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {thisWeekDone}/{thisWeekScheduled.length}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  先週
                </span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {lastWeekDone}/{lastWeekScheduled.length}
                </span>
              </div>
            </div>

            {patterns.length > 0 && (
              <div className="mb-3">
                <h3 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  傾向
                </h3>
                {patterns.map((p) => (
                  <PatternRow
                    key={p.key}
                    pattern={p}
                    habitId={habit.id}
                    existingCMs={habitCMs}
                  />
                ))}
              </div>
            )}

            {patterns.length === 0 && (
              <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                まだ傾向を出せるだけのデータがありません
              </p>
            )}

            {reasons.length > 0 && (
              <div className="mb-3">
                <h3 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  理由の内訳
                </h3>
                <div className="space-y-1">
                  {reasons.map((r) => (
                    <div
                      key={r.tagId}
                      className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span>{tagMap.get(r.tagId) ?? r.tagId}</span>
                      <span>{r.count}回</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {habitCMs.length > 0 && (
              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  登録した対策
                </h3>
                {habitCMs.map((cm) => (
                  <div
                    key={cm.id}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    {cm.conditionLabel}: {cm.action}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function PatternRow({
  pattern,
  habitId,
  existingCMs,
}: {
  pattern: {
    key: string;
    label: string;
    rate: number;
    n: number;
    overallRate: number;
  };
  habitId: string;
  existingCMs: Countermeasure[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [action, setAction] = useState("");

  const hasCM = existingCMs.some((c) => c.conditionKey === pattern.key);

  const handleSave = async () => {
    if (!action.trim()) return;
    const cm: Countermeasure = {
      id: crypto.randomUUID(),
      habitId,
      conditionKey: pattern.key,
      conditionLabel: pattern.label,
      action: action.trim().slice(0, 80),
      createdOn: toLocalDate(new Date()),
    };
    await saveCountermeasure(cm, db);
    setShowForm(false);
    setAction("");
  };

  return (
    <div className="mb-2">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {pattern.label}は {pattern.n}回中
        {Math.round(pattern.rate * pattern.n)}回 (全体{" "}
        {Math.round(pattern.overallRate * 100)}%)
      </p>
      {!hasCM && !showForm && (
        <button
          className="mt-1 text-xs text-blue-600 dark:text-blue-400"
          onClick={() => setShowForm(true)}
        >
          この条件への対策を登録
        </button>
      )}
      {showForm && (
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            maxLength={80}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="対策を入力（80文字以内）"
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <Button size="sm" onClick={handleSave}>
            保存
          </Button>
        </div>
      )}
    </div>
  );
}
