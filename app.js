require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());

const routes = require("./routes/index"); // ✅ import

app.use("/", routes); // ✅ connect routes

const cron = require("node-cron");
const { executeBulkEmail } = require("./controllers/testController");

// Schedule to run every day at 10:00 AM (Commented out for easy testing)
// cron.schedule('0 10 * * *', async () => { ... });

// 🚀 For easy testing: This runs every minute
cron.schedule('* * * * *', async () => {
    const timestamp = new Date().toLocaleString();
    console.log(`\n⏰ [CRON | ${timestamp}] Scheduler running...`);
    try {
        await executeBulkEmail("Daily Scheduled Update 📅", "This is your automatically scheduled report!");
        const endTimestamp = new Date().toLocaleString();
        console.log(`✅ [CRON | ${endTimestamp}] Scheduled task completed successfully.\n`);
    } catch (error) {
        const errorTimestamp = new Date().toLocaleString();
        console.error(`❌ [CRON | ${errorTimestamp}] Scheduled task failed:`, error.message || error);
    }
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});
const connectDB = require("./config/db");

connectDB();