import { describe, expect, it } from "vitest";
import {
  toLocalDate,
  parseLocalDate,
  addDays,
  diffDays,
  weekStartOf,
  weekdayOf,
} from "../dates";

describe("dates", () => {
  describe("toLocalDate", () => {
    it("Date オブジェクトからローカル日付文字列を返す", () => {
      const d = new Date(2026, 9, 18); // 2026-10-18
      expect(toLocalDate(d)).toBe("2026-10-18");
    });

    it("月・日が1桁のときゼロ埋めする", () => {
      const d = new Date(2026, 0, 5); // 2026-01-05
      expect(toLocalDate(d)).toBe("2026-01-05");
    });
  });

  describe("parseLocalDate", () => {
    it("YYYY-MM-DD 文字列を Date に変換する", () => {
      const d = parseLocalDate("2026-10-18");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(9);
      expect(d.getDate()).toBe(18);
    });
  });

  describe("addDays", () => {
    it("日付に日数を加算する", () => {
      expect(addDays("2026-10-18", 1)).toBe("2026-10-19");
      expect(addDays("2026-10-18", -3)).toBe("2026-10-15");
    });

    it("月またぎも正しく計算する", () => {
      expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    });
  });

  describe("diffDays", () => {
    it("2つの日付の差を日数で返す", () => {
      expect(diffDays("2026-10-18", "2026-10-05")).toBe(13);
      expect(diffDays("2026-10-05", "2026-10-18")).toBe(-13);
    });

    it("同じ日付なら0", () => {
      expect(diffDays("2026-10-18", "2026-10-18")).toBe(0);
    });
  });

  describe("weekStartOf", () => {
    it("月曜始まりの週の開始日を返す", () => {
      // 2026-10-18 は日曜日 → 週の始まりは 2026-10-12(月曜)
      expect(weekStartOf("2026-10-18")).toBe("2026-10-12");
    });

    it("月曜日自身なら同じ日を返す", () => {
      expect(weekStartOf("2026-10-12")).toBe("2026-10-12");
    });

    it("土曜日の週の始まりを返す", () => {
      // 2026-10-17 は土曜日 → 2026-10-12
      expect(weekStartOf("2026-10-17")).toBe("2026-10-12");
    });
  });

  describe("weekdayOf", () => {
    it("0=日〜6=土の曜日を返す", () => {
      expect(weekdayOf("2026-10-18")).toBe(0); // 日曜
      expect(weekdayOf("2026-10-12")).toBe(1); // 月曜
      expect(weekdayOf("2026-10-17")).toBe(6); // 土曜
    });
  });
});
