import { z } from "zod";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const habitSchema = z.object({
  id: z.string(),
  kind: z.enum(["build", "replace"]),
  name: z.string().min(1).max(40),
  replacesText: z.string().optional(),
  purpose: z.string().max(200),
  unit: z.string().min(1).max(10),
  amount: z.number().int().positive(),
  minAmount: z.number().int().min(1),
  amountChangedOn: localDateSchema,
  schedule: z.object({
    days: z.array(z.number().int().min(0).max(6)).min(1),
    time: z.string().optional(),
    cue: z.string().optional(),
  }),
  place: z.string().min(1).max(40),
  how: z.string().max(80),
  commitmentNote: z.string().optional(),
  funNote: z.string().optional(),
  status: z.enum(["active", "graduated", "ended"]),
  startedOn: localDateSchema,
  endedOn: localDateSchema.optional(),
  endNote: z.string().optional(),
  createdAt: z.string(),
});

const logSchema = z.object({
  id: z.string(),
  habitId: z.string(),
  date: localDateSchema,
  done: z.boolean(),
  amount: z.number().int().min(0),
  reasonTagIds: z.array(z.string()),
  memo: z.string().optional(),
  recordedAt: z.string(),
});

const reasonTagSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(12),
  builtIn: z.boolean(),
  archived: z.boolean(),
});

const weeklyCheckSchema = z.object({
  id: z.string(),
  habitId: z.string(),
  weekStart: localDateSchema,
  automaticity: z.tuple([
    z.number().min(1).max(5),
    z.number().min(1).max(5),
    z.number().min(1).max(5),
    z.number().min(1).max(5),
  ]),
  review: z
    .object({
      stillUseful: z.number().min(1).max(5),
      wouldChooseAgain: z.boolean(),
      decision: z.enum(["continue", "reduce", "end"]),
    })
    .optional(),
  answeredAt: z.string(),
});

const countermeasureSchema = z.object({
  id: z.string(),
  habitId: z.string(),
  conditionKey: z.string(),
  conditionLabel: z.string(),
  action: z.string().min(1).max(80),
  createdOn: localDateSchema,
});

const settingsSchema = z.object({
  id: z.literal("singleton"),
  persona: z
    .enum(["regret", "optimist", "meaning", "selfblame", "notfun"])
    .optional(),
  showStreak: z.boolean(),
  lastExportAt: z.string().optional(),
  onboarded: z.boolean(),
});

export const exportDataSchema = z.object({
  app: z.literal("effort-system"),
  version: z.literal(1),
  exportedAt: z.string(),
  habits: z.array(habitSchema),
  logs: z.array(logSchema),
  reasonTags: z.array(reasonTagSchema),
  weeklyChecks: z.array(weeklyCheckSchema),
  countermeasures: z.array(countermeasureSchema),
  settings: settingsSchema,
});

export type ExportData = z.infer<typeof exportDataSchema>;
