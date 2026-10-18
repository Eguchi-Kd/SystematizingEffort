import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router";
import { toLocalDate } from "../../domain/dates";
import { db } from "../../db/db";
import type { Habit } from "../../domain/types";
import HomePage from "../pages/HomePage";

function todayStr(): string {
  return toLocalDate(new Date());
}

const DAY_INDEX = new Date().getDay();

function makeHabitScheduledToday(): Habit {
  return {
    id: "h-test",
    kind: "build",
    name: "テスト習慣",
    purpose: "",
    unit: "分",
    amount: 10,
    minAmount: 5,
    amountChangedOn: todayStr(),
    schedule: { days: [DAY_INDEX], time: "20:00" },
    place: "自宅",
    how: "",
    status: "active",
    startedOn: "2026-01-01",
    createdAt: "2026-01-01T00:00:00+09:00",
  };
}

beforeEach(async () => {
  await db.settings.put({
    id: "singleton",
    showStreak: true,
    onboarded: false,
  });
});

afterEach(async () => {
  await db.habits.clear();
  await db.logs.clear();
  await db.settings.clear();
  await db.reasonTags.clear();
});

describe("HomePage", () => {
  it("「やった」をクリックすると「記録済み」に変わる", async () => {
    const habit = makeHabitScheduledToday();
    await db.habits.add(habit);

    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("テスト習慣")).toBeInTheDocument();
    });

    const doneButton = screen.getByRole("button", { name: /やった/ });
    expect(doneButton).toBeInTheDocument();

    await user.click(doneButton);

    await waitFor(() => {
      expect(screen.getByText(/記録済み/)).toBeInTheDocument();
    });

    expect(screen.getByText(/取り消す/)).toBeInTheDocument();
  });

  it("習慣がないときは「最初の習慣をつくる」が表示される", async () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("最初の習慣をつくる")).toBeInTheDocument();
    });
  });
});
