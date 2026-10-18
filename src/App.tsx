import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/db";
import { initializeApp } from "./db/init";
import BottomNav from "./ui/components/BottomNav";
import HabitDetailPage from "./ui/pages/HabitDetailPage";
import HabitEditPage from "./ui/pages/HabitEditPage";
import HabitNewPage from "./ui/pages/HabitNewPage";
import HabitsPage from "./ui/pages/HabitsPage";
import HomePage from "./ui/pages/HomePage";
import OnboardingPage from "./ui/pages/OnboardingPage";
import ReviewPage from "./ui/pages/ReviewPage";
import SettingsPage from "./ui/pages/SettingsPage";
import WeeklyCheckPage from "./ui/pages/WeeklyCheckPage";

export default function App() {
  useEffect(() => {
    initializeApp();
    if (window.location.search.includes("seed=demo")) {
      import("./db/seedDemo").then((m) => m.seedDemo());
    }
  }, []);

  const settings = useLiveQuery(() => db.settings.get("singleton"));
  const needsOnboarding = settings !== undefined && !settings?.onboarded;

  return (
    <BrowserRouter>
      <div className="mx-auto min-h-screen max-w-lg pb-16">
        <Routes>
          {needsOnboarding ? (
            <>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="*" element={<Navigate to="/onboarding" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/habits/new" element={<HabitNewPage />} />
              <Route path="/habits/:id" element={<HabitDetailPage />} />
              <Route path="/habits/:id/edit" element={<HabitEditPage />} />
              <Route path="/weekly" element={<WeeklyCheckPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
            </>
          )}
        </Routes>
        {!needsOnboarding && <BottomNav />}
      </div>
    </BrowserRouter>
  );
}
