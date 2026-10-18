import { useState } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { toLocalDate } from "../../domain/dates";
import { formatIntention } from "../../domain/formatIntention";
import { smallStartSuggestion } from "../../domain/guards";
import type { Habit, HabitKind } from "../../domain/types";
import { saveHabit } from "../../db/repo";
import { db } from "../../db/db";
import Button from "../components/Button";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

interface FormData {
  kind: HabitKind;
  name: string;
  replacesText: string;
  purpose: string;
  unit: string;
  amount: string;
  minAmount: string;
  days: number[];
  time: string;
  cue: string;
  place: string;
  how: string;
  commitmentNote: string;
  funNote: string;
}

const initial: FormData = {
  kind: "build",
  name: "",
  replacesText: "",
  purpose: "",
  unit: "",
  amount: "",
  minAmount: "",
  days: [],
  time: "",
  cue: "",
  place: "",
  how: "",
  commitmentNote: "",
  funNote: "",
};

export default function HabitNewPage() {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => db.settings.get("singleton"));
  const persona = settings?.persona;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initial);
  const [smallStartApplied, setSmallStartApplied] = useState(false);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (day: number) =>
    set(
      "days",
      form.days.includes(day)
        ? form.days.filter((d) => d !== day)
        : [...form.days, day].sort((a, b) => a - b),
    );

  const amt = Number(form.amount) || 0;
  const minAmt = Number(form.minAmount) || 0;
  const suggestion = smallStartSuggestion(amt, minAmt, persona);

  const canNext = (): boolean => {
    switch (step) {
      case 1:
        return form.kind === "replace" ? form.replacesText.trim().length > 0 : true;
      case 2: {
        const base =
          form.name.trim().length > 0 &&
          form.name.trim().length <= 40 &&
          form.unit.trim().length > 0 &&
          form.unit.trim().length <= 10 &&
          amt > 0 &&
          minAmt >= 1 &&
          minAmt <= amt;
        if (persona === "meaning" && form.purpose.trim().length === 0)
          return false;
        return base;
      }
      case 3: {
        const base =
          form.days.length > 0 &&
          (form.time.trim().length > 0 || form.cue.trim().length > 0) &&
          form.place.trim().length > 0 &&
          form.place.trim().length <= 40;
        if (persona === "regret" && form.commitmentNote.trim().length === 0)
          return false;
        return base;
      }
      default:
        return true;
    }
  };

  const buildHabit = (): Habit => {
    const today = toLocalDate(new Date());
    return {
      id: crypto.randomUUID(),
      kind: form.kind,
      name: form.name.trim(),
      ...(form.kind === "replace" ? { replacesText: form.replacesText.trim() } : {}),
      purpose: form.purpose.trim(),
      unit: form.unit.trim(),
      amount: amt,
      minAmount: minAmt,
      amountChangedOn: today,
      schedule: {
        days: form.days,
        ...(form.time.trim() ? { time: form.time.trim() } : {}),
        ...(form.cue.trim() ? { cue: form.cue.trim() } : {}),
      },
      place: form.place.trim(),
      how: form.how.trim(),
      ...(form.commitmentNote.trim() ? { commitmentNote: form.commitmentNote.trim() } : {}),
      ...(form.funNote.trim() ? { funNote: form.funNote.trim() } : {}),
      status: "active",
      startedOn: today,
      createdAt: new Date().toISOString(),
    };
  };

  const handleSave = async () => {
    const habit = buildHabit();
    await saveHabit(habit, db);
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col p-4 pb-20">
      <div className="mb-4 flex items-center justify-between">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="text-blue-600 dark:text-blue-400"
            aria-label="前のステップに戻る"
          >
            戻る
          </button>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 dark:text-gray-400"
          >
            キャンセル
          </button>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {step}/4
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">どんな習慣をつくりますか?</h1>
          <div className="flex gap-3">
            <Button
              variant={form.kind === "build" ? "primary" : "secondary"}
              size="lg"
              className="flex-1"
              onClick={() => set("kind", "build")}
            >
              始めたい
            </Button>
            <Button
              variant={form.kind === "replace" ? "primary" : "secondary"}
              size="lg"
              className="flex-1"
              onClick={() => set("kind", "replace")}
            >
              やめたい
            </Button>
          </div>
          {form.kind === "replace" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                やめたいこと
              </label>
              <input
                type="text"
                value={form.replacesText}
                onChange={(e) => set("replacesText", e.target.value)}
                placeholder="例: 寝る直前の夕食"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              {form.replacesText.trim() && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  代わりに何をしますか?
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">行動と量</h1>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              行動名
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="例: ランニング"
              maxLength={40}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              目的{persona === "meaning" ? "" : "（任意）"}
            </label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              placeholder="例: 健康維持のため"
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
                placeholder="例: 分"
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
                onChange={(e) => set("amount", e.target.value)}
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
              onChange={(e) => set("minAmount", e.target.value)}
              min="1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          {suggestion !== null && !smallStartApplied && (
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                まず {suggestion}
                {form.unit.trim()} から始めませんか?
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1"
                onClick={() => {
                  set("amount", String(suggestion));
                  setSmallStartApplied(true);
                }}
              >
                そうする
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">実行意図</h1>
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
                    form.days.includes(i)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                  aria-pressed={form.days.includes(i)}
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
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              きっかけ行動
            </label>
            <input
              type="text"
              value={form.cue}
              onChange={(e) => set("cue", e.target.value)}
              placeholder="例: 夕食の後"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              時刻ときっかけ行動の少なくとも一方を入力してください
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              場所
            </label>
            <input
              type="text"
              value={form.place}
              onChange={(e) => set("place", e.target.value)}
              placeholder="例: ジム"
              maxLength={40}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              やり方（任意）
            </label>
            <input
              type="text"
              value={form.how}
              onChange={(e) => set("how", e.target.value)}
              placeholder="例: ゆっくり"
              maxLength={80}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              環境設計メモ{persona === "regret" ? "" : "（任意）"}
            </label>
            <input
              type="text"
              value={form.commitmentNote}
              onChange={(e) => set("commitmentNote", e.target.value)}
              placeholder="例: スマホを別室に置く"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          {persona === "notfun" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                楽しくする工夫
              </label>
              <input
                type="text"
                value={form.funNote}
                onChange={(e) => set("funNote", e.target.value)}
                placeholder="例: 好きな音楽を聴きながらやる"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <h1 className="text-xl font-bold">確認</h1>
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {formatIntention(buildHabit())}
          </p>
          <Button size="lg" className="w-full" onClick={handleSave}>
            この内容で始める
          </Button>
        </div>
      )}

      {step < 4 && (
        <div className="mt-auto pt-6">
          <Button
            size="lg"
            className="w-full"
            disabled={!canNext()}
            onClick={() => setStep(step + 1)}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
