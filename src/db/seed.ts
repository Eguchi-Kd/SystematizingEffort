import type { AppDatabase } from "./db";

const DEFAULT_REASON_TAGS = [
  "予定外の用事",
  "疲れ",
  "忘れた",
  "気分が乗らない",
  "体調",
  "前日の予定の影響",
  "その他",
];

export async function seedReasonTags(db: AppDatabase): Promise<void> {
  const count = await db.reasonTags.count();
  if (count > 0) return;

  await db.reasonTags.bulkAdd(
    DEFAULT_REASON_TAGS.map((label) => ({
      id: crypto.randomUUID(),
      label,
      builtIn: true,
      archived: false,
    })),
  );
}
