export type LocalDate = string; // 'YYYY-MM-DD'

export type HabitKind = "build" | "replace";
export type HabitStatus = "active" | "graduated" | "ended";

export interface Habit {
  id: string;
  kind: HabitKind;
  name: string;
  replacesText?: string;
  purpose: string;
  unit: string;
  amount: number;
  minAmount: number;
  amountChangedOn: LocalDate;
  schedule: {
    days: number[];
    time?: string;
    cue?: string;
  };
  place: string;
  how: string;
  commitmentNote?: string;
  funNote?: string;
  status: HabitStatus;
  startedOn: LocalDate;
  endedOn?: LocalDate;
  endNote?: string;
  createdAt: string;
}

export interface Log {
  id: string;
  habitId: string;
  date: LocalDate;
  done: boolean;
  amount: number;
  reasonTagIds: string[];
  memo?: string;
  recordedAt: string;
}

export interface ReasonTag {
  id: string;
  label: string;
  builtIn: boolean;
  archived: boolean;
}

export interface WeeklyCheck {
  id: string;
  habitId: string;
  weekStart: LocalDate;
  automaticity: [number, number, number, number];
  review?: {
    stillUseful: number;
    wouldChooseAgain: boolean;
    decision: "continue" | "reduce" | "end";
  };
  answeredAt: string;
}

export interface Countermeasure {
  id: string;
  habitId: string;
  conditionKey: string;
  conditionLabel: string;
  action: string;
  createdOn: LocalDate;
}

export type Persona =
  | "regret"
  | "optimist"
  | "meaning"
  | "selfblame"
  | "notfun";

export interface Settings {
  id: "singleton";
  persona?: Persona;
  showStreak: boolean;
  lastExportAt?: string;
  onboarded: boolean;
}
