import { useState } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { saveWeeklyCheck, setHabitStatus } from "../../db/repo";
import { toLocalDate, weekStartOf } from "../../domain/dates";
import { graduationEligible } from "../../domain/automaticity";
import { reviewDue } from "../../domain/review";
import type { WeeklyCheck } from "../../domain/types";
import Button from "../components/Button";
import Card from "../components/Card";

const AUTO_QUESTIONS = [
  "考えなくても始めている",
  "やらないと落ち着かない",
  "始めるのに意志の力がいらない",
  "気づいたらやっている",
];

export default function WeeklyCheckPage() {
  const navigate = useNavigate();
  const habits = useLiveQuery(() => db.habits.toArray()) ?? [];
  const logs = useLiveQuery(() => db.logs.toArray()) ?? [];
  const allChecks = useLiveQuery(() => db.weeklyChecks.toArray()) ?? [];
  const settings = useLiveQuery(() => db.settings.get("singleton"));

  const today = toLocalDate(new Date());
  const thisWeekStart = weekStartOf(today);

  const activeHabits = habits.filter((h) => h.status === "active");
  const unchecked = activeHabits.filter(
    (h) =>
      !allChecks.some(
        (c) => c.habitId === h.id && c.weekStart === thisWeekStart,
      ),
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScores, setAutoScores] = useState<(number | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [phase, setPhase] = useState<
    "auto" | "review" | "decision" | "graduation" | "done"
  >("auto");
  const [stillUseful, setStillUseful] = useState<number | null>(null);
  const [wouldChoose, setWouldChoose] = useState<boolean | null>(null);
  const [decision, setDecision] = useState<"continue" | "reduce" | "end" | null>(
    null,
  );

  if (unchecked.length === 0 || currentIndex >= unchecked.length) {
    return (
      <div className="flex-1 space-y-4 p-4 pb-20">
        <h1 className="text-xl font-bold">週次チェック</h1>
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">
          今週のチェックは完了しています
        </p>
        <Button className="w-full" onClick={() => navigate("/")}>
          ホームに戻る
        </Button>
      </div>
    );
  }

  const habit = unchecked[currentIndex];
  const habitLogs = logs.filter((l) => l.habitId === habit.id);
  const habitChecks = allChecks.filter((c) => c.habitId === habit.id);
  const needsReview = reviewDue(habit, habitChecks, today, settings?.persona);
  const canGraduate = graduationEligible(habit, habitLogs, habitChecks, today);

  const allAutoAnswered = autoScores.every((s) => s !== null);

  const handleAutoScore = (qi: number, score: number) => {
    setAutoScores((prev) => {
      const next = [...prev];
      next[qi] = score;
      return next;
    });
  };

  const handleAutoNext = () => {
    if (needsReview) {
      setPhase("review");
    } else {
      submitCheck();
    }
  };


  const submitCheck = async (
    reviewData?: WeeklyCheck["review"],
    skipGraduation = false,
  ) => {
    const check: WeeklyCheck = {
      id: crypto.randomUUID(),
      habitId: habit.id,
      weekStart: thisWeekStart,
      automaticity: autoScores as [number, number, number, number],
      review: reviewData,
      answeredAt: new Date().toISOString(),
    };

    await saveWeeklyCheck(check, db);

    if (reviewData?.decision === "end") {
      moveToNext();
      return;
    }

    if (reviewData?.decision === "reduce") {
      navigate(`/habits/${habit.id}/edit`);
      return;
    }

    if (!skipGraduation && canGraduate) {
      setPhase("graduation");
      return;
    }

    moveToNext();
  };

  const handleDecision = async () => {
    if (decision === null || stillUseful === null || wouldChoose === null) return;
    await submitCheck({
      stillUseful,
      wouldChooseAgain: wouldChoose,
      decision,
    });
  };

  const handleGraduate = async (yes: boolean) => {
    if (yes) {
      await setHabitStatus(habit.id, "graduated", undefined, db);
    }
    moveToNext();
  };

  const moveToNext = () => {
    setAutoScores([null, null, null, null]);
    setStillUseful(null);
    setWouldChoose(null);
    setDecision(null);
    setPhase("auto");
    setCurrentIndex((i) => i + 1);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pb-20">
      <h1 className="text-xl font-bold">週次チェック</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {currentIndex + 1}/{unchecked.length} 件目
      </p>

      <h2 className="text-lg font-medium">{habit.name}</h2>

      {phase === "auto" && (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            この1週間について答えてください
          </p>
          {AUTO_QUESTIONS.map((q, qi) => (
            <Card key={qi}>
              <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                {q}
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    className={`h-10 w-10 rounded-full text-sm font-medium ${
                      autoScores[qi] === score
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                    onClick={() => handleAutoScore(qi, score)}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </Card>
          ))}

          <Button
            className="w-full"
            disabled={!allAutoAnswered}
            onClick={handleAutoNext}
          >
            {needsReview ? "次へ" : "記録する"}
          </Button>
        </>
      )}

      {phase === "review" && (
        <>
          <Card>
            <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              目的: {habit.purpose}
            </p>
            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
              この習慣は、始めた目的にまだ役立っていますか?
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  className={`h-10 w-10 rounded-full text-sm font-medium ${
                    stillUseful === score
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                  onClick={() => setStillUseful(score)}
                >
                  {score}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
              今ゼロから始めるとしても、この習慣を選びますか?
            </p>
            <div className="flex gap-2">
              <Button
                variant={wouldChoose === true ? "primary" : "secondary"}
                size="sm"
                onClick={() => setWouldChoose(true)}
              >
                はい
              </Button>
              <Button
                variant={wouldChoose === false ? "primary" : "secondary"}
                size="sm"
                onClick={() => setWouldChoose(false)}
              >
                いいえ
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-2">
              <Button
                variant={decision === "continue" ? "primary" : "secondary"}
                onClick={() => setDecision("continue")}
              >
                続ける
              </Button>
              <Button
                variant={decision === "reduce" ? "primary" : "secondary"}
                onClick={() => setDecision("reduce")}
              >
                量を減らす
              </Button>
              <Button
                variant={decision === "end" ? "primary" : "secondary"}
                onClick={() => setDecision("end")}
              >
                やめる
              </Button>
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                やめるのも判断です
              </p>
            </div>
          </Card>

          <Button
            className="w-full"
            disabled={
              stillUseful === null || wouldChoose === null || decision === null
            }
            onClick={handleDecision}
          >
            記録する
          </Button>
        </>
      )}

      {phase === "graduation" && (
        <Card>
          <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
            定着したようです。「定着済み」に移しますか?
          </p>
          <div className="flex gap-2">
            <Button onClick={() => handleGraduate(true)}>
              定着済みにする
            </Button>
            <Button variant="secondary" onClick={() => handleGraduate(false)}>
              まだ続ける
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
