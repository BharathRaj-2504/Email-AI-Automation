const User = require("../models/User");
const ScheduledEmail = require("../models/ScheduledEmail");
const EmailTemplate = require("../models/EmailTemplate");
const EmailLog = require("../models/EmailLog");
const CronConfig = require("../models/CronConfig");
const transporter = require("../config/nodemailer");
const { render } = require("../utils/templateService");
const cronService = require("../services/cronService");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// Add Student
const addStudent = async (req, res) => {
    try {
        const { name, email, metadata } = req.body;
        const student = new User({ name, email, metadata });
        await student.save();
        res.status(201).json({ success: true, student });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Student
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Student deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Helper function to create a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extracted for reuse by worker and immediate send
// Extracted for reuse by worker and immediate send
const executeSingleEmail = async (name, email, templateType = "notification", customVariables = {}) => {
    // ✅ SAVE to database if not exists or just keep it as a record
    let user = await User.findOne({ email });
    if (!user) {
        user = new User({ name, email });
    }

    // Fetch the latest template
    const template = await EmailTemplate.findOne({ type: templateType });
    if (!template) {
        console.error(`[Error] Template type "${templateType}" not found.`);
        throw new Error(`Template ${templateType} not found`);
    }

    // Prepare variables (Merge User name/email + Metadata + Custom Variables)
    const variables = {
        name: user.name,
        email: user.email,
        ...user.metadata,
        ...customVariables
    };

    // Render subject and message
    const renderedSubject = render(template.subject, variables);
    const renderedMessage = render(template.body, variables);

    // Update status to pending
    user.status = "pending";
    await user.save();

    let pdfPath = null;
    try {
        // ✅ Generate PDF if template requires it
        if (template.hasAttachment && template.htmlContent) {
            const renderedHtml = render(template.htmlContent, variables);
            pdfPath = await generatePDF(user.name, renderedHtml);
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: renderedSubject,
            text: renderedMessage
        };

        if (pdfPath) {
            const safeName = user.name.replace(/[^a-z0-9]/gi, "_");
            mailOptions.attachments = [{
                filename: `${safeName}.pdf`,
                path: pdfPath
            }];
        }

        // ✅ SEND email
        await transporter.sendMail(mailOptions);

        // ✅ LOG Success
        await EmailLog.create({
            userId: user._id,
            recipientEmail: email,
            templateType,
            status: "success"
        });

        // Update status to sent
        user.status = "sent";
        user.lastSentAt = new Date();
        await user.save();
        console.log(`[Success] ${templateType} Email sent to ${email} ✅`);

        // ✅ Cleanup
        if (pdfPath && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
    } catch (error) {
        // ✅ LOG Failure
        await EmailLog.create({
            recipientEmail: email,
            templateType,
            status: "failure",
            error: error.message
        });

        // Update status to failed
        user.status = "failed";
        await user.save();
        console.error(`[Failure] ${templateType} Email failed for ${email} ❌:`, error.message);

        // Cleanup on failure
        if (pdfPath && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
        throw error;
    }
};

const sendEmail = async (req, res) => {
    try {
        const { email, name, templateType, customVariables, scheduledAt } = req.body;
        if (!email || !name || !templateType) return res.status(400).send("Name, Email, and Template Type are required!");

        if (scheduledAt) {
            const newTask = new ScheduledEmail({
                recipientType: "single",
                recipientEmail: email,
                name,
                templateType,
                customVariables: customVariables || {},
                scheduledAt: new Date(scheduledAt)
            });
            await newTask.save();
            return res.status(200).json({ success: true, message: "Email scheduled successfully! 📅" });
        }

        await executeSingleEmail(name, email, templateType, customVariables);
        res.send("Saved + Email sent ✅");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error ❌: " + error.message);
    }
};

const saveMultipleUsers = async (req, res) => {
    try {
        const users = req.body;

        // insert many users
        await User.insertMany(users);

        res.send("Multiple users saved ✅");
    } catch (error) {
        console.log(error);
        res.status(500).send("Error saving users ❌");
    }
};

// Extracted core logic so it can be used by BOTH Express routes and Cron jobs
// Extracted core logic so it can be used by BOTH Express routes and Cron jobs
const executeBulkEmail = async (templateType = "notification", customVariables = {}) => {
    try {
        const users = await User.find();
        const template = await EmailTemplate.findOne({ type: templateType });

        if (!users || users.length === 0) {
            console.log("No users found in database ⚠️");
            return { success: false, count: 0 };
        }

        if (!template) {
            console.error(`[Error] Template type "${templateType}" not found for bulk send.`);
            return { success: false, message: "Template not found" };
        }

        for (let user of users) {
             // Prepare variables (Merge User name/email + Metadata + Custom Variables)
            const variables = {
                name: user.name,
                email: user.email,
                ...user.metadata,
                ...customVariables
            };

            const renderedSubject = render(template.subject, variables);
            const renderedMessage = render(template.body, variables);
            let pdfPath = null;

            // Before sending → set status = "pending"
            user.status = "pending";
            await user.save();

            try {
                // 1. Generate PDF if required
                if (template.hasAttachment && template.htmlContent) {
                    const genTimestamp = new Date().toLocaleString();
                    console.log(`[${genTimestamp}] 📑 Generating PDF for ${user.name}...`);
                    const renderedHtml = render(template.htmlContent, variables);
                    pdfPath = await generatePDF(user.name, renderedHtml);

                    if (!fs.existsSync(pdfPath)) {
                        throw new Error(`PDF was not generated at expected path: ${pdfPath}`);
                    }
                    console.log(`[${genTimestamp}] ✅ PDF verified at: ${pdfPath}`);
                }

                // 2. Attach and Send Email
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: renderedSubject,
                    text: renderedMessage
                };

                if (pdfPath) {
                    const safeName = user.name.replace(/[^a-z0-9]/gi, "_");
                    mailOptions.attachments = [
                        {
                            filename: `${safeName}.pdf`,
                            path: pdfPath
                        }
                    ];
                }

                await transporter.sendMail(mailOptions);

                // If email sent successfully → update status = "sent" and store timestamp
                user.status = "sent";
                user.lastSentAt = new Date();
                await user.save();

                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] ✅ Success: ${templateType} Email sent to ${user.email}`);

                // 3. Clean up the PDF file properly from disk
                if (pdfPath && fs.existsSync(pdfPath)) {
                    fs.unlinkSync(pdfPath);
                }

            } catch (err) {
                // If error occurs → update status = "failed"
                user.status = "failed";
                await user.save();

                const timestamp = new Date().toLocaleString();
                console.error(`[${timestamp}] ❌ Failure: Failed to send ${templateType} email to ${user.email} -`, err.message || err);

                // Cleanup even on failure
                if (pdfPath && fs.existsSync(pdfPath)) {
                    fs.unlinkSync(pdfPath);
                }
            }

            // Delay prevents spam-blocking
            await delay(1000);
        }

        return { success: true, count: users.length };

    } catch (error) {
        console.error("Bulk Email Error:", error);
        throw error;
    }
};

// Express Controller Wrapper
const sendBulkEmail = async (req, res) => {
    try {
        const { templateType, customVariables, scheduledAt } = req.body || {};
        const type = templateType || "notification";

        if (scheduledAt) {
            const newTask = new ScheduledEmail({
                recipientType: "bulk",
                templateType: type,
                customVariables: customVariables || {},
                scheduledAt: new Date(scheduledAt)
            });
            await newTask.save();
            return res.status(200).json({ success: true, message: "Bulk campaign scheduled successfully! 📅" });
        }

        const result = await executeBulkEmail(type, customVariables);
        if (!result.success) return res.status(404).json({ success: false, message: result.message || "No users found ⚠️" });

        res.status(200).json({ success: true, message: `Bulk emails sent to ${result.count} members ✅` });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ success: false, message: "Error sending bulk emails ❌" });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ success: false, message: "Error fetching users" });
    }
};

const getScheduledEmails = async (req, res) => {
    try {
        const tasks = await ScheduledEmail.find({ status: "pending" }).sort({ scheduledAt: 1 });
        res.status(200).json(tasks);
    } catch (error) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ success: false, message: "Error fetching schedules" });
    }
};

// --- Dashboard & Management Endpoints ---

const generatePDF = async (name, html) => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // If no HTML provided, use a fallback layout
    const content = html || `
        <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #4A90E2;">Document</h1>
            <p style="font-size: 18px;">Hi <b>${name}</b>, this is a generated document.</p>
        </div>
    `;

    // Sanitize name for filename
    const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const fileName = `${safeName}_${Date.now()}.pdf`;
    const tempDir = path.resolve(__dirname, "../temp_pdfs");
    
    // Ensure directory exists
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, fileName);

    console.log(`[PDF] Setting content for ${name}...`);
    await page.setContent(content);
    
    console.log(`[PDF] Generating file at: ${filePath}`);
    await page.pdf({ 
        path: filePath, 
        format: "A4",
        printBackground: true 
    });

    await browser.close();
    console.log(`[PDF] Browser closed for ${name}.`);

    return filePath;
};

// --- Template Management Endpoints ---

const upsertTemplate = async (req, res) => {
    try {
        const { type, name, subject, body, htmlContent, hasAttachment } = req.body;
        if (!type || !name) return res.status(400).json({ error: "Type and Name are required" });

        const template = await EmailTemplate.findOneAndUpdate(
            { type },
            { name, subject, body, htmlContent, hasAttachment: (hasAttachment === true || hasAttachment === 'true') },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, template });
    } catch (error) {
        console.error("Template Error:", error);
        res.status(500).json({ error: "Failed to save template" });
    }
};

const getTemplates = async (req, res) => {
    try {
        const templates = await EmailTemplate.find();
        res.status(200).json(templates);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch templates" });
    }
};

// --- Dashboard & Management Endpoints ---

const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const successCount = await EmailLog.countDocuments({ status: "success" });
        const failureCount = await EmailLog.countDocuments({ status: "failure" });
        const pendingTasks = await ScheduledEmail.countDocuments({ status: "pending" });

        res.json({
            totalUsers,
            successCount,
            failureCount,
            pendingTasks
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

const getEmailLogs = async (req, res) => {
    try {
        const logs = await EmailLog.find().sort({ sentAt: -1 }).limit(100);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
};

const getCronConfigs = async (req, res) => {
    try {
        const configs = await CronConfig.find();
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch cron configs" });
    }
};

const updateCronJob = async (req, res) => {
    try {
        const { key, schedule, enabled } = req.body;
        
        // This logic is simple: we pass the worker logic into the service calls.
        // The worker logic is what we defined in app.js, so we need a way to reference it.
        // For simplicity in this demo, we'll assume the 'main_worker' key is the one from app.js.
        // A more robust way would be to pass the callback map to the controller.
        
        const mainWorkerLogic = async () => {
            const now = new Date();
            const pendingTasks = await ScheduledEmail.find({ status: "pending", scheduledAt: { $lte: now } });
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
                    console.error("Cron worker error", err);
                    task.status = "failed";
                    task.error = err.message;
                    await task.save();
                }
            }
        };

        if (schedule !== undefined) {
            await cronService.updateSchedule(key, schedule, mainWorkerLogic);
        }
        
        if (enabled !== undefined) {
            await cronService.toggleJob(key, enabled, mainWorkerLogic);
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update cron job: " + error.message });
    }
};

const markReviewComplete = async (req, res) => {
    try {
        const { userId, feedback, nextReviewDate, forceResend } = req.body;

        // 1. Strict Validation
        if (!feedback || !feedback.trim()) {
            return res.status(400).json({ error: "Review feedback content is required." });
        }
        if (!nextReviewDate) {
            return res.status(400).json({ error: "Next review date is required for automation." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found in system." });

        // Logic: Send if not already completed OR if forceResend is true
        if (user.reviewCompleted && !forceResend) {
            return res.status(400).json({ error: "This user has already received their review completion email." });
        }

        // 2. Database Template Safety Check
        const template = await EmailTemplate.findOne({ type: "review_feedback" });
        if (!template) {
            console.error("[Automation Error] Missing required template: review_feedback");
            return res.status(500).json({ error: "System configuration error: 'review_feedback' template is missing from database." });
        }

        // 3. Update User State
        user.reviewCompleted = true;
        user.metadata = { 
            ...user.metadata, 
            feedback: feedback.trim(), 
            nextReviewDate 
        };
        await user.save();

        // 4. Trigger Dynamic Email (Will use user.metadata for placeholders)
        // Note: we pass feedback/date explicitly as customVariables just in case metadata isn't yet synced in memory
        await executeSingleEmail(user.name, user.email, "review_feedback", { 
            feedback: feedback.trim(), 
            nextReviewDate 
        });

        res.json({ 
            success: true, 
            message: `Review feedback successfully automated for ${user.name} 📧` 
        });
    } catch (error) {
        console.error("[Review Trigger Error]", error);
        res.status(500).json({ error: "Critical failure in review automation: " + error.message });
    }
};

const triggerOfferLetter = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID is required" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const { jobTitle, joiningDate } = user.metadata || {};
        if (!jobTitle || !joiningDate) {
            return res.status(400).json({ 
                error: "Incomplete candidate metadata. Offer letter requires 'jobTitle' and 'joiningDate' in the user profile." 
            });
        }

        await executeSingleEmail(user.name, user.email, "offer_letter");
        res.json({ success: true, message: `Offer letter successfully generated and sent to ${user.name} 📄` });
    } catch (error) {
        console.error("❌ Offer Letter Error:", error.message);
        res.status(500).json({ error: "Offer distribution failed: " + error.message });
    }
};

const triggerCertificate = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID is required" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const { courseName, completionDate } = user.metadata || {};
        if (!courseName || !completionDate) {
            return res.status(400).json({ 
                error: "Incomplete academic metadata. Certificate requires 'courseName' and 'completionDate' in the student profile." 
            });
        }

        await executeSingleEmail(user.name, user.email, "certificate");
        res.json({ success: true, message: `Academic certificate successfully generated and sent to ${user.name} 🎓` });
    } catch (error) {
        console.error("❌ Certificate Error:", error.message);
        res.status(500).json({ error: "Certificate distribution failed: " + error.message });
    }
};

const triggerFirstReview = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID is required" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const { reviewDate, timeSlot } = user.metadata || {};
        if (!reviewDate || !timeSlot) {
            return res.status(400).json({ 
                error: "Incomplete scheduling metadata. First review requires 'reviewDate' and 'timeSlot' in the student profile." 
            });
        }

        await executeSingleEmail(user.name, user.email, "first_review");
        res.json({ success: true, message: `First review scheduled and notification sent to ${user.name} 📅` });
    } catch (error) {
        console.error("❌ First Review Error:", error.message);
        res.status(500).json({ error: "Scheduling notification failed: " + error.message });
    }
};

const triggerTaskAllocation = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID is required" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const { taskTitle, taskDescription, deadline } = user.metadata || {};
        if (!taskTitle || !taskDescription || !deadline) {
            return res.status(400).json({ 
                error: "Incomplete task metadata. Task allocation requires 'taskTitle', 'taskDescription', and 'deadline' in the student profile." 
            });
        }

        await executeSingleEmail(user.name, user.email, "task_allocation");
        res.json({ success: true, message: `Task briefed and assigned successfully to ${user.name} 🚀` });
    } catch (error) {
        console.error("❌ Task Allocation Error:", error.message);
        res.status(500).json({ error: "Task briefing failed: " + error.message });
    }
};

const triggerHoldMail = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID is required" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        await executeSingleEmail(user.name, user.email, "hold_mail");

        // Automatically transition status to hold
        user.applicationStatus = "hold";
        await user.save();

        res.json({ success: true, message: `Application for ${user.name} put on hold and notification sent ✅` });
    } catch (error) {
        console.error("❌ Hold Mail Error:", error.message);
        res.status(500).json({ error: "Hold notification failed: " + error.message });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["active", "hold", "selected"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.applicationStatus = status;
        await user.save();

        res.json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const sendBulkHoldMail = async (req, res) => {
    try {
        const usersOnHold = await User.find({ applicationStatus: "hold" });
        if (usersOnHold.length === 0) {
            return res.status(404).json({ success: false, message: "No students on hold status found." });
        }

        const template = await EmailTemplate.findOne({ type: "hold_mail" });
        if (!template) return res.status(404).json({ success: false, message: "Hold mail template not found." });

        for (const user of usersOnHold) {
            await executeSingleEmail(user.name, user.email, "hold_mail");
        }

        res.json({ success: true, message: `Bulk hold mail sent to ${usersOnHold.length} candidates.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Daily Crawler Core Logic (Shared for Cron & Manual) ---
const executeDailyCrawler = async () => {
    const now = new Date();
    const day = now.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
    
    if (day === 0 || day === 6) {
        return { message: "🗓️ [Daily Crawler] Weekend - Skipping automated distribution." };
    }

    const subjects = {
        1: "Monday Momentum: Setting Your Weekly Goals",
        2: "Technical Tuesday: Deep Dive into Your Progress",
        3: "Mid-Week Sync: Stay Focused, Stay Ahead",
        4: "Progress Thursday: Preparing for Review",
        5: "Friday Finale: Reflect and Celebrate Accomplishments"
    };

    const subject = subjects[day];
    console.log(`\n🗓️ [Daily Crawler] Triggering for: ${subject}`);

    const activeUsers = await User.find({ applicationStatus: "active" });
    if (activeUsers.length === 0) {
        return { message: "No active students found. Skipping." };
    }

    for (const user of activeUsers) {
        try {
            await executeSingleEmail(user.name, user.email, "notification", { 
                subject: subject,
                currentDay: now.toLocaleDateString('en-US', { weekday: 'long' })
            });
        } catch (err) {
            console.error(`[Daily Crawler] Failed for ${user.email}:`, err.message);
        }
    }
    return { success: true, count: activeUsers.length };
};

// Express Wrapper for Manual Trigger
const triggerDailyCrawler = async (req, res) => {
    try {
        const result = await executeDailyCrawler();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    sendEmail, 
    saveMultipleUsers, 
    sendBulkEmail, 
    executeBulkEmail, 
    executeSingleEmail,
    executeDailyCrawler,
    triggerDailyCrawler,
    getUsers,
    getScheduledEmails,
    upsertTemplate,
    getTemplates,
    getDashboardStats,
    getEmailLogs,
    getCronConfigs,
    updateCronJob,
    markReviewComplete,
    triggerOfferLetter,
    triggerCertificate,
    triggerFirstReview,
    triggerTaskAllocation,
    triggerHoldMail,
    updateUserStatus,
    addStudent,
    deleteStudent,
    sendBulkHoldMail
};