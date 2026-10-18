import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { saveHabit, setHabitStatus } from "../../db/repo";
import type { Habit } from "../../domain/types";
import Button from "../components/Button";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function HabitEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const habit = useLiveQuery(() => (id ? db.habits.get(id) : undefined), [id]);
  const [form, setForm] = useState<Habit | null>(null);

  useEffect(() => {
    if (habit && !form) setForm({ ...habit });
  }, [habit, form]);

  if (!form) {
    return (
      <div className="p-4 pb-20">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const set = <K extends keyof Habit>(key: K, val: Habit[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: val } : prev));

  const toggleDay = (day: number) => {
    const days = form.schedule.days.includes(day)
      ? form.schedule.days.filter((d) => d !== day)
      : [...form.schedule.days, day].sort((a, b) => a - b);
    setForm((prev) =>
      prev ? { ...prev, schedule: { ...prev.schedule, days } } : prev,
    );
  };

  const valid =
    form.name.trim().length > 0 &&
    form.unit.trim().length > 0 &&
    form.amount > 0 &&
    form.minAmount >= 1 &&
    form.minAmount <= form.amount &&
    form.schedule.days.length > 0 &&
    (form.schedule.time?.trim() || form.schedule.cue?.trim()) &&
    form.place.trim().length > 0;

  const handleSave = async () => {
    await saveHabit(form, db);
    navigate(-1);
  };

  const handleStatus = async (status: "graduated" | "ended" | "active") => {
    await setHabitStatus(form.id, status, undefined, db);
    navigate("/habits");
  };

  return (
    <div className="flex min-h-screen flex-col p-4 pb-20">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 dark:text-blue-400"
        >
          戻る
        </button>
        <h1 className="text-lg font-bold">習慣を編集</h1>
        <div className="w-10" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            行動名
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={40}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {form.kind === "replace" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              やめたいこと
            </label>
            <input
              type="text"
              value={form.replacesText ?? ""}
              onChange={(e) => set("replacesText", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            目的
          </label>
          <input
            type="text"
            value={form.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              単位
            </label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              maxLength={10}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              1回の量
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => set("amount", Number(e.target.value) || 0)}
              min="1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            絶対にできる量
          </label>
          <input
            type="number"
            value={form.minAmount}
            onChange={(e) => set("minAmount", Number(e.target.value) || 0)}
            min="1"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            曜日
          </label>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                  form.schedule.days.includes(i)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                }`}
                aria-pressed={form.schedule.days.includes(i)}
                aria-label={`${label}曜日`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            時刻
          </label>
          <input
            type="time"
            value={form.schedule.time ?? ""}
            onChange={(e) =>
              setForm((prev) =>
                prev
                  ? {
                      ...prev,
                      schedule: { ...prev.schedule, time: e.target.value || undefined },
                    }
                  : prev,
              )
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            きっかけ行動
          </label>
          <input
            type="text"
            value={form.schedule.cue ?? ""}
            onChange={(e) =>
              setForm((prev) =>
                prev
                  ? {
                      ...prev,
                      schedule: { ...prev.schedule, cue: e.target.value || undefined },
                    }
                  : prev,
              )
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            場所
          </label>
          <input
            type="text"
            value={form.place}
            onChange={(e) => set("place", e.target.value)}
            maxLength={40}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            やり方
          </label>
          <input
            type="text"
            value={form.how}
            onChange={(e) => set("how", e.target.value)}
            maxLength={80}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            環境設計メモ
          </label>
          <input
            type="text"
            value={form.commitmentNote ?? ""}
            onChange={(e) => set("commitmentNote", e.target.value || undefined)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            楽しくする工夫
          </label>
          <input
            type="text"
            value={form.funNote ?? ""}
            onChange={(e) => set("funNote", e.target.value || undefined)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <Button
          size="lg"
          className="w-full"
          disabled={!valid}
          onClick={handleSave}
        >
          保存する
        </Button>

        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          {form.status === "active" ? (
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => handleStatus("graduated")}
              >
                定着済みにする
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => handleStatus("ended")}
              >
                終了する
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => handleStatus("active")}
            >
              再開する
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
