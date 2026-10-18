import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "./db/db";
import App from "./App";

beforeEach(async () => {
  await db.settings.put({
    id: "singleton",
    showStreak: true,
    onboarded: true,
  });
});

afterEach(async () => {
  await db.habits.clear();
  await db.logs.clear();
  await db.settings.clear();
  await db.reasonTags.clear();
  await db.weeklyChecks.clear();
  await db.countermeasures.clear();
});

describe("App", () => {
  it("4つのタブが表示される", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "ホーム" })).toBeInTheDocument();
    });
    const nav = screen.getByRole("navigation", {
      name: "メインナビゲーション",
    });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ホーム" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "振り返り" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "習慣" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "設定" })).toBeInTheDocument();
  });

  it("タブをクリックすると画面が切り替わる", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "習慣" }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "習慣" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("link", { name: "設定" }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "設定" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("link", { name: "振り返り" }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "振り返り" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("link", { name: "ホーム" }));
    await waitFor(() => {
      expect(screen.getByText("最初の習慣をつくる")).toBeInTheDocument();
    });
  });
});
