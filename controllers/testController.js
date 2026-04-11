const User = require("../models/User");
const transporter = require("../config/nodemailer");

// Helper function to create a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sendEmail = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).send("No data provided in request body!");
        }

        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).send("Please provide both name and email!");
        }

        // ✅ SAVE to database
        const newUser = new User({ name, email });
        await newUser.save();

        // ✅ SEND email using reusable transporter
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Welcome 🚀",
            text: `Hello ${name}, your email automation is working 😎`
        });

        res.send("Saved + Email sent ✅");

    } catch (error) {
        console.log(error);
        res.send("Error ❌");
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

                // 2. Attach and Send Email
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: subject,
                    text: personalizedMessage,
                    attachments: [
                        {
                            filename: `Certificate_${user.name}.pdf`,
                            path: pdfPath
                        }
                    ]
                });

                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] 📧 Email + PDF sent successfully to: ${user.email}`);

                // 3. Clean up the PDF file properly from disk
                if (pdfPath && fs.existsSync(pdfPath)) {
                    fs.unlinkSync(pdfPath);
                }

            } catch (err) {
                const timestamp = new Date().toLocaleString();
                console.error(`[${timestamp}] ❌ Failed to send email to: ${user.email} -`, err.message || err);

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
        throw error; // Re-throw to be caught by the caller (route or cron)
    }
};

// Express Controller Wrapper
const sendBulkEmail = async (req, res) => {
    try {
        const { subject, message } = req.body || {};

        const result = await executeBulkEmail(subject, message);

        if (!result.success) {
            return res.status(404).json({ success: false, message: "No users found in database ⚠️" });
        }

        res.status(200).json({
            success: true,
            message: `Bulk emails successfully sent to ${result.count} members ✅`
        });

    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ success: false, message: "Error sending bulk emails ❌" });
    }
};

module.exports = { sendEmail, saveMultipleUsers, sendBulkEmail, executeBulkEmail };
const puppeteer = require("puppeteer");

const generatePDF = async (name) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const html = `
        <h1 style="text-align:center;">Certificate</h1>
        <p style="text-align:center;">
            This is to certify that <b>${name}</b> has completed the program.
        </p>
    `;

    const filePath = `${name}.pdf`;

    await page.setContent(html);
    await page.pdf({ path: filePath, format: "A4" });

    await browser.close();

    return filePath;
};