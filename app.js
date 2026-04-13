require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const routes = require("./routes/index"); // ✅ import

app.use("/", routes); // ✅ connect routes

const cronService = require("./services/cronService");
const { executeBulkEmail, executeSingleEmail } = require("./controllers/testController");
const ScheduledEmail = require("./models/ScheduledEmail");
const User = require("./models/User");

// --- WORKER LOGIC ---

// 1. Main Queue Worker (Processes ScheduledEmail collection)
const mainWorkerLogic = async () => {
    const now = new Date();
    try {
        const pendingTasks = await ScheduledEmail.find({
            status: "pending",
            scheduledAt: { $lte: now }
        });

        if (pendingTasks.length > 0) {
            console.log(`\n📬 [Main Worker] Found ${pendingTasks.length} tasks to process.`);
        }

        for (const task of pendingTasks) {
            try {
                if (task.recipientType === "single") {
                    await executeSingleEmail(task.name, task.recipientEmail, task.templateType, task.customVariables);
                } else if (task.recipientType === "bulk") {
                    await executeBulkEmail(task.templateType, task.customVariables);
                }

                task.status = "completed";
                await task.save();
            } catch (err) {
                console.error(`[Main Worker] Task ${task._id} failed:`, err.message);
                task.status = "failed";
                task.error = err.message;
                await task.save();
            }
        }
    } catch (error) {
        console.error(`❌ [Main Worker Error]:`, error.message);
    }
};

// 2. Weekly Schedule Worker (Automatically fires every weekend)
const weeklyScheduleLogic = async () => {
    try {
        console.log("\n🗓️ [Weekly Worker] Starting global schedule distribution...");
        const users = await User.find({ "metadata.schedule": { $exists: true, $ne: "" } });
        
        if (users.length === 0) {
            return console.log("[Weekly Worker] No users found with schedule metadata. Skipping.");
        }

        console.log(`[Weekly Worker] Processing ${users.length} users...`);

        for (const user of users) {
            try {
                // We pass the schedule from metadata as a custom variable to ensure it's available for rendering
                await executeSingleEmail(user.name, user.email, "weekly_schedule", { 
                    schedule: user.metadata.schedule 
                });
            } catch (err) {
                console.error(`[Weekly Worker] Failed for ${user.email}:`, err.message);
            }
        }
        console.log("[Weekly Worker] Distribution complete! ✅");
    } catch (error) {
        console.error("❌ [Weekly Worker Critical Error]:", error.message);
    }
};

// 3. Review Reminder Worker (Schedules reminders 24h before reviewDate)
const reviewReminderLogic = async () => {
    try {
        console.log("\n⏰ [Reminder Worker] Checking for upcoming reviews...");
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0,0,0,0);

        const users = await User.find({ "metadata.reviewDate": { $exists: true, $ne: "" } });
        let sentCount = 0;

        for (const user of users) {
            try {
                if (!user.metadata.reviewDate) continue;
                
                const userDate = new Date(user.metadata.reviewDate);
                userDate.setHours(0,0,0,0);

                if (userDate.getTime() === tomorrow.getTime()) {
                    await executeSingleEmail(user.name, user.email, "review_reminder", {
                        reviewDate: user.metadata.reviewDate
                    });
                    sentCount++;
                }
            } catch (err) {
                console.error(`[Reminder Worker] Skip ${user.email} due to date error: ${err.message}`);
            }
        }
        console.log(`[Reminder Worker] Sent ${sentCount} reminders. ✅`);
    } catch (error) {
        console.error("❌ [Reminder Worker Error]:", error.message);
    }
};

// 🚀 Start Registered Jobs
const workerMap = {
    'main_worker': mainWorkerLogic,
    'weekly_schedule': weeklyScheduleLogic,
    'review_reminder': reviewReminderLogic
};

cronService.initCronJobs(workerMap);

app.listen(3000, () => {
    console.log("Server started on port 3000");
});
const connectDB = require("./config/db");

connectDB();