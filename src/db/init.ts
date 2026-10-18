import { db } from "./db";
import { seedReasonTags } from "./seed";

export async function initializeApp(): Promise<void> {
  await seedReasonTags(db);

  const settings = await db.settings.get("singleton");
  if (!settings) {
    await db.settings.put({
      id: "singleton",
      showStreak: true,
      onboarded: false,
    });
  }

  if (navigator.storage?.persist) {
    await navigator.storage.persist();
  }
}
