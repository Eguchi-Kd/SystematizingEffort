import Dexie, { type EntityTable } from "dexie";
import type {
  Countermeasure,
  Habit,
  Log,
  ReasonTag,
  Settings,
  WeeklyCheck,
} from "../domain/types";

export class AppDatabase extends Dexie {
  habits!: EntityTable<Habit, "id">;
  logs!: EntityTable<Log, "id">;
  reasonTags!: EntityTable<ReasonTag, "id">;
  weeklyChecks!: EntityTable<WeeklyCheck, "id">;
  countermeasures!: EntityTable<Countermeasure, "id">;
  settings!: EntityTable<Settings, "id">;

  constructor(name = "effort-system") {
    super(name);
    this.version(1).stores({
      habits: "id, status, startedOn",
      logs: "id, habitId, date, &[habitId+date]",
      reasonTags: "id",
      weeklyChecks: "id, habitId, weekStart, &[habitId+weekStart]",
      countermeasures: "id, habitId",
      settings: "id",
    });
  }
}

export const db = new AppDatabase();
