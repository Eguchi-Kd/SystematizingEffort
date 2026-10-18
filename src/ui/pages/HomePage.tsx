import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { recordDone, recordMissed, undoLog } from "../../db/repo";
import { toLocalDate, addDays, diffDays, weekdayOf, weekStartOf } from "../../domain/dates";
import { formatDateShort } from "../../domain/display";
import { formatIntention } from "../../domain/formatIntention";
import { pendingReasonPrompts } from "../../domain/reasons";
import { isScheduled, scheduledDates } from "../../domain/schedule";
import type { Habit, Log, ReasonTag } from "../../domain/types";
import Button from "../components/Button";
import Card from "../components/Card";
import BottomSheet from "../components/BottomSheet";

function ReasonCard({
  habitName,
  date,
  tags,
  onSelect,
  onSkip,
  onDefer,
}: {
  habitName: string;
  date: string;
  tags: ReasonTag[];
  onSelect: (tagId: string) => void;
  onSkip: () => void;
  onDefer: () => void;
}) {
  return (
    <Card className="mb-3">
      <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
        {formatDateShort(date)} {habitName} は記録なし。何があった?
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onSelect(tag.id)}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            aria-label={tag.label}
          >
            {tag.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          理由なし
        </Button>
        <Button variant="ghost" size="sm" onClick={onDefer}>
          あとで
        </Button>
      </div>
    </Card>
  );
}

function HabitCard({
  habit,
  log,
  today,
  weeklyDone,
  weeklyScheduled,
}: {
  habit: Habit;
  log?: Log;
  today: string;
  weeklyDone?: number;
  weeklyScheduled?: number;
}) {
  const [amountSheetOpen, setAmountSheetOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDone = useCallback(async () => {
    await recordDone(habit.id, today, undefined, db);
  }, [habit.id, today]);

  const handleUndo = useCallback(async () => {
    await undoLog(habit.id, today, db);
  }, [habit.id, today]);

  const handleLongPressStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setCustomAmount(String(habit.amount));
      setAmountSheetOpen(true);
    }, 500);
  }, [habit.amount]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleCustomRecord = useCallback(async () => {
    const amt = Number(customAmount);
    if (amt > 0) {
      await recordDone(habit.id, today, amt, db);
      setAmountSheetOpen(false);
    }
  }, [habit.id, today, customAmount]);

  const handleAddMore = useCallback(() => {
    setCustomAmount(String(habit.amount));
    setAmountSheetOpen(true);
  }, [habit.amount]);

  const isDone = log?.done === true;

  return (
    <Card className="mb-3">
      <p className="mb-1 font-medium text-gray-900 dark:text-gray-100">
        {habit.name}
      </p>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        {formatIntention(habit)}
      </p>

      {weeklyDone !== undefined && weeklyScheduled !== undefined && (
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          今週 {weeklyDone}/{weeklyScheduled} 回
        </p>
      )}

      {isDone ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            記録済み {log.amount}
            {habit.unit}
          </span>
          <button
            onClick={handleUndo}
            className="text-sm text-blue-600 dark:text-blue-400"
            aria-label="取り消す"
          >
            取り消す
          </button>
          <button
            onClick={handleAddMore}
            className="text-sm text-blue-600 dark:text-blue-400"
            aria-label="追加で記録"
          >
            追加で記録
          </button>
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full"
          onClick={handleDone}
          onPointerDown={handleLongPressStart}
          onPointerUp={handleLongPressEnd}
          onPointerLeave={handleLongPressEnd}
          aria-label={`${habit.name} やった`}
        >
          やった
        </Button>
      )}

      <BottomSheet
        open={amountSheetOpen}
        onClose={() => setAmountSheetOpen(false)}
        title="量を入力"
      >
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            min="1"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            autoFocus
          />
          <span className="text-gray-700 dark:text-gray-300">
            {habit.unit}
          </span>
        </div>
        <Button
          size="lg"
          className="mt-3 w-full"
          onClick={handleCustomRecord}
          disabled={Number(customAmount) <= 0}
        >
          記録する
        </Button>
      </BottomSheet>
    </Card>
  );
}

function PastRecordsSheet({
  habits,
  logs,
  today,
  open,
  onClose,
}: {
  habits: Habit[];
  logs: Log[];
  today: string;
  open: boolean;
  onClose: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const past3 = [addDays(today, -1), addDays(today, -2), addDays(today, -3)];

  const logMap = new Map(logs.map((l) => [`${l.habitId}:${l.date}`, l]));

  return (
    <BottomSheet open={open} onClose={onClose} title="過去の記録を直す">
      <div className="mb-4 flex gap-2">
        {past3.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            className={`flex-1 rounded-lg py-2 text-sm ${
              selectedDate === d
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {formatDateShort(d)}
          </button>
        ))}
      </div>

      {selectedDate && (
        <div className="space-y-2">
          {habits
            .filter((h) => h.status === "active")
            .map((h) => {
              const log = logMap.get(`${h.id}:${selectedDate}`);
              const isDone = log?.done === true;
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700"
                >
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {h.name}
                  </span>
                  {isDone ? (
                    <button
                      onClick={async () => {
                        await undoLog(h.id, selectedDate, db);
                      }}
                      className="text-sm text-red-600 dark:text-red-400"
                    >
                      取り消す
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await recordDone(h.id, selectedDate, undefined, db);
                      }}
                    >
                      やった
                    </Button>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </BottomSheet>
  );
}

export default function HomePage() {
  const today = toLocalDate(new Date());
  const habits = useLiveQuery(() => db.habits.toArray()) ?? [];
  const logs = useLiveQuery(() => db.logs.toArray()) ?? [];
  const allTags = useLiveQuery(() => db.reasonTags.toArray()) ?? [];
  const tags = allTags.filter((t) => !t.archived);
  const settings = useLiveQuery(() => db.settings.get("singleton"));
  const weeklyChecks = useLiveQuery(() => db.weeklyChecks.toArray()) ?? [];

  const [deferredReasons, setDeferredReasons] = useState<Set<string>>(
    new Set(),
  );
  const [pastSheetOpen, setPastSheetOpen] = useState(false);
  const [offExpanded, setOffExpanded] = useState(false);

  const activeHabits = habits.filter((h) => h.status === "active");

  if (activeHabits.length === 0 && habits.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 pb-20">
        <Link to="/habits/new">
          <Button size="lg">最初の習慣をつくる</Button>
        </Link>
      </div>
    );
  }

  const prompts = pendingReasonPrompts(activeHabits, logs, today).filter(
    (p) => !deferredReasons.has(`${p.habitId}:${p.date}`),
  );

  const logMap = new Map(logs.map((l) => [`${l.habitId}:${l.date}`, l]));
  const scheduledToday = activeHabits.filter((h) => isScheduled(h, today));
  const offSchedule = activeHabits.filter((h) => !isScheduled(h, today));

  const isOptimist = settings?.persona === "optimist";
  const thisWeekStartHome = weekStartOf(today);
  const thisWeekEndHome = addDays(thisWeekStartHome, 6);
  const weeklyStats = isOptimist
    ? new Map(
        activeHabits.map((h) => {
          const sched = scheduledDates(h, thisWeekStartHome, thisWeekEndHome);
          const done = sched.filter(
            (d) => logMap.get(`${h.id}:${d}`)?.done === true,
          ).length;
          return [h.id, { done, scheduled: sched.length }];
        }),
      )
    : null;

  const showBackup =
    activeHabits.length > 0 &&
    (!settings?.lastExportAt ||
      diffDays(today, settings.lastExportAt.slice(0, 10)) >= 7);

  return (
    <div className="flex-1 p-4 pb-20">
      <h1 className="mb-4 text-xl font-bold">ホーム</h1>

      {prompts.map((p) => {
        const habit = habits.find((h) => h.id === p.habitId);
        if (!habit) return null;
        return (
          <ReasonCard
            key={`${p.habitId}:${p.date}`}
            habitName={habit.name}
            date={p.date}
            tags={tags}
            onSelect={async (tagId) => {
              await recordMissed(p.habitId, p.date, [tagId], undefined, db);
            }}
            onSkip={async () => {
              await recordMissed(p.habitId, p.date, [], undefined, db);
            }}
            onDefer={() => {
              setDeferredReasons((prev) => {
                const next = new Set(prev);
                next.add(`${p.habitId}:${p.date}`);
                return next;
              });
            }}
          />
        );
      })}

      {(() => {
        const wd = weekdayOf(today);
        const isFriSunday = wd === 5 || wd === 6 || wd === 0;
        if (!isFriSunday) return null;
        const thisWeekStart = weekStartOf(today);
        const uncheckedCount = activeHabits.filter(
          (h) =>
            !weeklyChecks.some(
              (c) => c.habitId === h.id && c.weekStart === thisWeekStart,
            ),
        ).length;
        if (uncheckedCount === 0) return null;
        return (
          <Card className="mb-4">
            <Link to="/weekly" className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                今週のチェック（1分）
              </span>
              <span className="text-blue-600 dark:text-blue-400">→</span>
            </Link>
          </Card>
        );
      })()}

      {scheduledToday.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            今日の習慣
          </h2>
          {scheduledToday.map((h) => {
            const ws = weeklyStats?.get(h.id);
            return (
              <HabitCard
                key={h.id}
                habit={h}
                log={logMap.get(`${h.id}:${today}`)}
                today={today}
                weeklyDone={ws?.done}
                weeklyScheduled={ws?.scheduled}
              />
            );
          })}
        </section>
      )}

      {offSchedule.length > 0 && (
        <section className="mb-4">
          <button
            onClick={() => setOffExpanded(!offExpanded)}
            className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            今日は予定のない習慣 {offExpanded ? "▲" : "▼"}
          </button>
          {offExpanded &&
            offSchedule.map((h) => {
              const ws = weeklyStats?.get(h.id);
              return (
                <HabitCard
                  key={h.id}
                  habit={h}
                  log={logMap.get(`${h.id}:${today}`)}
                  today={today}
                  weeklyDone={ws?.done}
                  weeklyScheduled={ws?.scheduled}
                />
              );
            })}
        </section>
      )}

      <button
        onClick={() => setPastSheetOpen(true)}
        className="mb-4 block text-sm text-blue-600 dark:text-blue-400"
      >
        過去の記録を直す
      </button>

      <PastRecordsSheet
        habits={habits}
        logs={logs}
        today={today}
        open={pastSheetOpen}
        onClose={() => setPastSheetOpen(false)}
      />

      {showBackup && (
        <Card className="mt-4">
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            バックアップを取りましょう
          </p>
          <Link to="/settings">
            <Button variant="secondary" size="sm">
              設定画面でエクスポート
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
