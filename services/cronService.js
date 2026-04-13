const cron = require("node-cron");
const CronConfig = require("../models/CronConfig");

// Map to store running cron tasks in memory
const activeJobs = new Map();

/**
 * Initialize all enabled cron jobs from the database
 * @param {Object} workerMap - Map of strings to functions { [jobKey]: () => void }
 */
const initCronJobs = async (workerMap) => {
    try {
        const configs = await CronConfig.find();
        
        // Seed default workers if collection is empty
        if (configs.length === 0) {
            const defaults = [
                {
                    key: 'main_worker',
                    name: 'Main Email Worker',
                    schedule: '* * * * *',
                    enabled: true,
                    description: 'Processes the ScheduledEmail collection every minute'
                },
                {
                    key: 'weekly_schedule',
                    name: 'Weekly Schedule Distributor',
                    schedule: '0 21 * * 0', // Sunday 9 PM
                    enabled: true,
                    description: 'Automatically sends weekly schedules to users'
                },
                {
                    key: 'review_reminder',
                    name: 'Review Reminder Distributor',
                    schedule: '0 9 * * *', // Daily 9 AM
                    enabled: true,
                    description: 'Sends reminders to students 24h before their review'
                }
            ];
            await CronConfig.insertMany(defaults);
            configs.push(...(await CronConfig.find()));
        }

        for (const config of configs) {
            if (config.enabled) {
                const worker = workerMap[config.key];
                if (worker) {
                    startJob(config.key, config.schedule, worker);
                } else {
                    console.warn(`[CronService] No worker implementation found for key: ${config.key}`);
                }
            }
        }
        console.log(`[CronService] Initialized ${activeJobs.size} active jobs.`);
    } catch (error) {
        console.error("[CronService] Initialization Error:", error);
    }
};

/**
 * Start or Restart a job
 */
const startJob = (key, schedule, callback) => {
    if (activeJobs.has(key)) {
        console.log(`[CronService] Restarting job [${key}] with schedule [${schedule}]...`);
        activeJobs.get(key).stop();
        activeJobs.delete(key);
    } else {
        console.log(`[CronService] Starting job [${key}] with schedule [${schedule}]...`);
    }

    try {
        const task = cron.schedule(schedule, callback);
        activeJobs.set(key, task);
    } catch (err) {
        console.error(`[CronService] Failed to start job ${key}:`, err.message);
    }
};

/**
 * Stop a job
 */
const stopJob = (key) => {
    if (activeJobs.has(key)) {
        activeJobs.get(key).stop();
        activeJobs.delete(key);
        console.log(`[CronService] Job [${key}] stopped.`);
        return true;
    }
    return false;
};

/**
 * Toggle a job's status and update DB
 */
const toggleJob = async (key, enabled, workerMap) => {
    const config = await CronConfig.findOne({ key });
    if (!config) throw new Error("Job config not found");

    config.enabled = enabled;
    await config.save();

    if (enabled) {
        const worker = workerMap[key];
        if (worker) startJob(key, config.schedule, worker);
    } else {
        stopJob(key);
    }
};

/**
 * Update schedule in DB and restart job
 */
const updateSchedule = async (key, schedule, workerMap) => {
    const config = await CronConfig.findOne({ key });
    if (!config) throw new Error("Job config not found");

    config.schedule = schedule;
    await config.save();

    if (config.enabled) {
        const worker = workerMap[key];
        if (worker) startJob(key, schedule, worker);
    }
};

module.exports = {
    initCronJobs,
    startJob,
    stopJob,
    toggleJob,
    updateSchedule
};
