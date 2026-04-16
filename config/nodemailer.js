const nodemailer = require("nodemailer");

// Reusable email transporter setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    pool: true, // Maintain open connections
    maxConnections: 3, // Gmail recommended limits
    maxMessages: 100,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

module.exports = transporter;
