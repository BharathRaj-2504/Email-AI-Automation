const User = require("../models/User");
const ScheduledEmail = require("../models/ScheduledEmail");
const transporter = require("../config/nodemailer");
const fs = require("fs");
const path = require("path");

// Helper function to create a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extracted for reuse by worker and immediate send
const executeSingleEmail = async (name, email) => {
    // ✅ SAVE to database if not exists or just keep it as a record
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
        const newUser = new User({ name, email });
        await newUser.save();
    }

    // ✅ Generate PDF
    const pdfPath = await generatePDF(name);

    // ✅ SEND email
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome 🚀",
        text: `Hello ${name}, your email automation is working 😎`,
        attachments: [{
            filename: `Welcome_${name.replace(/\s+/g, "_")}.pdf`,
            path: pdfPath
        }]
    });

    // ✅ Cleanup
    if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
    }
};

const sendEmail = async (req, res) => {
    try {
        const { email, name, scheduledAt } = req.body;
        if (!email || !name) return res.status(400).send("Name and Email are required!");

        if (scheduledAt) {
            const newTask = new ScheduledEmail({
                recipientType: "single",
                recipientEmail: email,
                name,
                subject: "Welcome 🚀",
                message: `Hello ${name}, your email automation is working 😎`,
                scheduledAt: new Date(scheduledAt)
            });
            await newTask.save();
            return res.status(200).json({ success: true, message: "Email scheduled successfully! 📅" });
        }

        await executeSingleEmail(name, email);
        res.send("Saved + Email sent ✅");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error ❌");
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
const executeBulkEmail = async (subject = "Important Update 🚀", message = "This is a message to all our members! 😎") => {
    try {
        const users = await User.find();

        if (!users || users.length === 0) {
            console.log("No users found in database ⚠️");
            return { success: false, count: 0 };
        }

        for (let user of users) {
            const personalizedMessage = `Hello ${user.name},\n\n${message}`;
            let pdfPath = null;

            try {
                // 1. Generate PDF dynamically for this user
                const genTimestamp = new Date().toLocaleString();
                console.log(`[${genTimestamp}] 📑 Generating PDF for ${user.name}...`);
                pdfPath = await generatePDF(user.name);

                if (!fs.existsSync(pdfPath)) {
                    throw new Error(`PDF was not generated at expected path: ${pdfPath}`);
                }

                console.log(`[${genTimestamp}] ✅ PDF verified at: ${pdfPath}`);

                // 2. Attach and Send Email
                console.log(`[${genTimestamp}] 📧 Sending email to ${user.email} with attachment...`);
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: subject,
                    text: personalizedMessage,
                    attachments: [
                        {
                            filename: `Certificate_${user.name.replace(/\s+/g, "_")}.pdf`,
                            path: pdfPath
                        }
                    ]
                });

                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] 📧 Email + PDF sent successfully to: ${user.email}`);

                // 3. Clean up the PDF file properly from disk
                if (pdfPath && fs.existsSync(pdfPath)) {
                    console.log(`[Cleanup] Deleting temporary file: ${pdfPath}`);
                    fs.unlinkSync(pdfPath);
                }

            } catch (err) {
                const timestamp = new Date().toLocaleString();
                console.error(`[${timestamp}] ❌ Failed to send email to: ${user.email} -`, err.message || err);

                // Cleanup even on failure
                if (pdfPath && fs.existsSync(pdfPath)) {
                    console.log(`[Cleanup] Deleting temporary file after error: ${pdfPath}`);
                    fs.unlinkSync(pdfPath);
                }
            }

            // Delay prevents spam-blocking
            await delay(1000);
        }

        return { success: true, count: users.length };

    } catch (error) {
        console.error("Bulk Email Error:", error);
        throw error; // Re-throw to be caught by the caller (route or cron)
    }
};

// Express Controller Wrapper
const sendBulkEmail = async (req, res) => {
    try {
        const { subject, message, scheduledAt } = req.body || {};

        if (scheduledAt) {
            const newTask = new ScheduledEmail({
                recipientType: "bulk",
                subject: subject || "Important Update 🚀",
                message: message || "This is a message to all our members! 😎",
                scheduledAt: new Date(scheduledAt)
            });
            await newTask.save();
            return res.status(200).json({ success: true, message: "Bulk campaign scheduled successfully! 📅" });
        }

        const result = await executeBulkEmail(subject, message);
        if (!result.success) return res.status(404).json({ success: false, message: "No users found ⚠️" });

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

module.exports = { 
    sendEmail, 
    saveMultipleUsers, 
    sendBulkEmail, 
    executeBulkEmail, 
    executeSingleEmail,
    getUsers,
    getScheduledEmails
};
const puppeteer = require("puppeteer");

const generatePDF = async (name) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #4A90E2;">Certificate of Completion</h1>
            <p style="font-size: 18px;">
                Hi <b>${name}</b>,
            </p>
            <p style="font-size: 16px;">
                Puppeteer is working ✅
            </p>
            <div style="margin-top: 50px; font-size: 12px; color: #888;">
                Generated on ${new Date().toLocaleString()}
            </div>
        </div>
    `;

    // Sanitize name for filename
    const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const fileName = `${safeName}_${Date.now()}.pdf`;
    const tempDir = path.resolve(__dirname, "../temp_pdfs");
    
    // Ensure directory exists (extra safety)
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, fileName);

    console.log(`[PDF] Setting content for ${name}...`);
    await page.setContent(html);
    
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