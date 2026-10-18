import { useState } from "react";
import { useNavigate } from "react-router";
import { db } from "../../db/db";
import type { Persona } from "../../domain/types";
import Button from "../components/Button";
import Card from "../components/Card";

const QUESTIONS: { text: string; persona: Persona }[] = [
  {
    text: "やるべきことはわかっているのに、できずに後悔することが多い",
    persona: "regret",
  },
  {
    text: "努力しなくても、たいていは何とかなると思う",
    persona: "optimist",
  },
  {
    text: "続けている途中で「これに意味があるのか」と止まってしまう",
    persona: "meaning",
  },
  {
    text: "続かないのは自分の意志が弱いからだと思う",
    persona: "selfblame",
  },
  {
    text: "努力はそもそも楽しくない",
    persona: "notfun",
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [scores, setScores] = useState<(number | null)[]>(
    Array(5).fill(null) as (number | null)[],
  );

  const handleScore = (qi: number, score: number) => {
    setScores((prev) => {
      const next = [...prev];
      next[qi] = score;
      return next;
    });
  };

  const handleSubmit = async () => {
    const personaScores = QUESTIONS.map((q, i) => ({
      persona: q.persona,
      score: scores[i] ?? 0,
    }));

    personaScores.sort((a, b) => b.score - a.score);
    const topPersona = personaScores[0].persona;

    const settings = await db.settings.get("singleton");
    await db.settings.put({
      ...(settings ?? {
        id: "singleton" as const,
        showStreak: true,
        onboarded: false,
      }),
      persona: topPersona,
      onboarded: true,
    });

    navigate("/");
  };

  const handleSkip = async () => {
    const settings = await db.settings.get("singleton");
    await db.settings.put({
      ...(settings ?? {
        id: "singleton" as const,
        showStreak: true,
        onboarded: false,
      }),
      onboarded: true,
    });

    navigate("/");
  };

  const allAnswered = scores.every((s) => s !== null);

  return (
    <div className="flex-1 space-y-4 p-4 pb-20">
      <h1 className="text-xl font-bold">タイプ診断</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        以下の文にどのくらい当てはまりますか?（1=当てはまらない〜5=とても当てはまる）
      </p>

      {QUESTIONS.map((q, qi) => (
        <Card key={qi}>
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            {q.text}
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                className={`h-10 w-10 rounded-full text-sm font-medium ${
                  scores[qi] === score
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                }`}
                onClick={() => handleScore(qi, score)}
              >
                {score}
              </button>
            ))}
          </div>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button className="flex-1" disabled={!allAnswered} onClick={handleSubmit}>
          診断する
        </Button>
        <Button variant="ghost" onClick={handleSkip}>
          スキップ
        </Button>
      </div>
    </div>
  );
}
