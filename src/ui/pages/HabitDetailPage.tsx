import { Link, useParams } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../../db/db";
import { saveHabit, setHabitStatus } from "../../db/repo";
import { toLocalDate, addDays } from "../../domain/dates";
import { automaticityScore, graduationEligible } from "../../domain/automaticity";
import { formatIntention } from "../../domain/formatIntention";
import { exportIcs } from "../../domain/ics";
import { levelUpSuggestion } from "../../domain/guards";
import { reasonBreakdown } from "../../domain/patterns";
import {
  achievementRate,
  cumulativeAmount,
  streak,
  weeklySeries,
} from "../../domain/stats";
import Button from "../components/Button";
import Card from "../components/Card";
import MonthCalendar from "../components/MonthCalendar";

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const habit = useLiveQuery(() => (id ? db.habits.get(id) : undefined), [id]);
  const logs =
    useLiveQuery(
      () => (id ? db.logs.where("habitId").equals(id).toArray() : []),
      [id],
    ) ?? [];
  const settings = useLiveQuery(() => db.settings.get("singleton"));
  const weeklyChecks =
    useLiveQuery(
      () => (id ? db.weeklyChecks.where("habitId").equals(id).toArray() : []),
      [id],
    ) ?? [];
  const countermeasures =
    useLiveQuery(
      () => (id ? db.countermeasures.where("habitId").equals(id).toArray() : []),
      [id],
    ) ?? [];
  const reasonTags = useLiveQuery(() => db.reasonTags.toArray()) ?? [];

  if (!habit) {
    return (
      <div className="p-4 pb-20">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const today = toLocalDate(new Date());
  const from28 = addDays(today, -27);

  const cumulative = cumulativeAmount(habit, logs);
  const rate28 = achievementRate(habit, logs, from28, today, today);
  const currentStreak = streak(habit, logs, today);
  const series = weeklySeries(habit, logs, today, 12);
  const levelUp = levelUpSuggestion(habit, logs, today);

  const chartData = series.map((w) => ({
    week: w.weekStart.slice(5),
    done: w.doneCount,
    scheduled: w.scheduledCount,
  }));

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const sortedChecks = [...weeklyChecks].sort((a, b) =>
    a.weekStart > b.weekStart ? 1 : -1,
  );
  const autoChartData = sortedChecks.map((c) => ({
    week: c.weekStart.slice(5),
    score: parseFloat(automaticityScore(c).toFixed(1)),
  }));
  const reasons = reasonBreakdown(habit, logs, today);
  const tagMap = new Map(reasonTags.map((t) => [t.id, t.label]));
  const canGraduate = graduationEligible(habit, logs, weeklyChecks, today);

  const handleLevelUp = async () => {
    if (levelUp) {
      await saveHabit({ ...habit, amount: levelUp }, db);
    }
  };

  const handleStatus = async (status: "graduated" | "ended" | "active") => {
    await setHabitStatus(habit.id, status, undefined, db);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <Link
          to="/habits"
          className="text-blue-600 dark:text-blue-400"
        >
          戻る
        </Link>
        <Link
          to={`/habits/${habit.id}/edit`}
          className="text-blue-600 dark:text-blue-400"
        >
          編集
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold">{habit.name}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {formatIntention(habit)}
        </p>
        {habit.purpose && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            目的: {habit.purpose}
          </p>
        )}
        {habit.funNote && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            楽しくする工夫: {habit.funNote}
          </p>
        )}
      </div>

      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          これまで合計
        </p>
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {cumulative}
          <span className="text-lg font-normal">{habit.unit}</span>
        </p>
      </Card>

      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          28日間の達成
        </p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {rate28.done}/{rate28.scheduled} 回
        </p>
        {rate28.rate !== null && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ({Math.round(rate28.rate * 100)}%)
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          週次推移（12週）
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar
              dataKey="done"
              name="実行回数"
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
            />
            <Line
              dataKey="scheduled"
              name="予定回数"
              stroke="#9ca3af"
              strokeDasharray="4 4"
              dot={false}
              type="stepAfter"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <MonthCalendar
          habit={habit}
          logs={logs}
          year={currentYear}
          month={currentMonth}
        />
      </Card>

      {settings?.showStreak && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          連続 {currentStreak} 日
        </p>
      )}

      {levelUp !== null && (
        <Card>
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            量を {levelUp}
            {habit.unit} に上げてみませんか?
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleLevelUp}>
              上げる
            </Button>
            <Button size="sm" variant="ghost">
              今はしない
            </Button>
          </div>
        </Card>
      )}

      {autoChartData.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            自動化スコア推移
          </h2>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={autoChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                dataKey="score"
                name="自動化スコア"
                stroke="#10b981"
                dot={{ r: 3 }}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {reasons.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            理由の内訳
          </h2>
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
        </Card>
      )}

      {countermeasures.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            登録した対策
          </h2>
          {countermeasures.map((cm) => (
            <div
              key={cm.id}
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {cm.conditionLabel}: {cm.action}
            </div>
          ))}
        </Card>
      )}

      {canGraduate && habit.status === "active" && (
        <Card>
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            定着したようです。「定着済み」に移しますか?
          </p>
          <Button size="sm" onClick={() => handleStatus("graduated")}>
            定着済みにする
          </Button>
        </Card>
      )}

      {habit.schedule.time && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const ics = exportIcs(habit);
            if (!ics) return;
            const blob = new Blob([ics], { type: "text/calendar" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${habit.name}.ics`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          カレンダーに書き出し (.ics)
        </Button>
      )}

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        {habit.status === "active" ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => handleStatus("graduated")}
            >
              定着済みにする
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => handleStatus("ended")}
            >
              終了する
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => handleStatus("active")}
          >
            再開する
          </Button>
        )}
      </div>
    </div>
  );
}
