require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const routes = require("./routes/index"); // ✅ import

app.use("/", routes); // ✅ connect routes

const cron = require("node-cron");
const { executeBulkEmail, executeSingleEmail } = require("./controllers/testController");
const ScheduledEmail = require("./models/ScheduledEmail");

// 🚀 Task Worker: Runs every minute to process scheduled emails
cron.schedule('* * * * *', async () => {
    const now = new Date();
    // console.log(`\n⏰ [Worker | ${now.toLocaleString()}] Checking for scheduled tasks...`);

    try {
        // Find pending tasks that are due
        const pendingTasks = await ScheduledEmail.find({
            status: "pending",
            scheduledAt: { $lte: now }
        });

        if (pendingTasks.length > 0) {
            console.log(`\n📬 [Worker] Found ${pendingTasks.length} tasks to process.`);
        }

        for (const task of pendingTasks) {
            try {
                console.log(`[Worker] Processing ${task.recipientType} task for ${task.recipientEmail || 'All'}...`);
                
                if (task.recipientType === "single") {
                    await executeSingleEmail(task.name, task.recipientEmail);
                } else if (task.recipientType === "bulk") {
                    await executeBulkEmail(task.subject, task.message);
                }

                task.status = "completed";
                await task.save();
                console.log(`[Worker] ✅ Task ${task._id} completed successfully.`);
            } catch (err) {
                console.error(`[Worker] ❌ Task ${task._id} failed:`, err.message);
                task.status = "failed";
                task.error = err.message;
                await task.save();
            }
        }
    } catch (error) {
        console.error(`❌ [Worker Error]:`, error.message);
    }
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});
const connectDB = require("./config/db");

connectDB();