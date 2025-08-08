import cron from "node-cron";
import { createAutomaticWeeklyPolls } from "./pollUtils.js";

// Schedule weekly poll creation every Monday at 9:00 AM
export const scheduleWeeklyPolls = () => {
  // Run every Monday at 9:00 AM (0 9 * * 1)
  cron.schedule("0 9 * * 1", async () => {
    try {
      console.log("🗳️  Creating weekly polls...");
      await createAutomaticWeeklyPolls();
      console.log("✅ Weekly polls created successfully");
    } catch (error) {
      console.error("❌ Failed to create weekly polls:", error);
    }
  });

  console.log(
    "📅 Weekly poll scheduler initialized - runs every Monday at 9:00 AM"
  );
};

// Manual trigger for testing
export const triggerWeeklyPollCreation = async () => {
  try {
    console.log("🗳️  Manually creating weekly polls...");
    await createAutomaticWeeklyPolls();
    console.log("✅ Weekly polls created successfully");
    return { success: true, message: "Weekly polls created successfully" };
  } catch (error) {
    console.error("❌ Failed to create weekly polls:", error);
    return { success: false, message: error.message };
  }
};

export default {
  scheduleWeeklyPolls,
  triggerWeeklyPollCreation,
};
