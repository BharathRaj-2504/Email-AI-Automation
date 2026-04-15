const express = require("express");
const router = express.Router();

const { 
    sendEmail, 
    saveMultipleUsers, 
    sendBulkEmail, 
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
    triggerHoldMail,
    updateUserStatus,
    addStudent,
    deleteStudent
} = require("../controllers/testController");
const { login } = require("../controllers/authController");
const { chat } = require("../controllers/aiController");
const authMiddleware = require("../utils/authMiddleware");

// Admin Login Route
router.post("/login", login);

// Protected Routes
router.post("/send-email", authMiddleware, sendEmail);
router.post("/save-multiple-users", authMiddleware, saveMultipleUsers);
router.post("/send-bulk-email", authMiddleware, sendBulkEmail);
router.get("/users", authMiddleware, getUsers);
router.post("/students", authMiddleware, addStudent);
router.delete("/students/:id", authMiddleware, deleteStudent);
router.get("/scheduled-emails", authMiddleware, getScheduledEmails);


// Dashboard & Metrics
router.get("/stats", authMiddleware, getDashboardStats);
router.get("/logs", authMiddleware, getEmailLogs);

// Template Management
router.get("/templates", authMiddleware, getTemplates);
router.post("/templates", authMiddleware, upsertTemplate);

// Scheduler Configuration
router.get("/cron-configs", authMiddleware, getCronConfigs);
router.post("/update-cron", authMiddleware, updateCronJob);

// specialized Workflows
router.post("/mark-review-complete", authMiddleware, markReviewComplete);
router.post("/trigger-offer-letter", authMiddleware, triggerOfferLetter);
router.post("/trigger-certificate", authMiddleware, triggerCertificate);
router.post("/trigger-first-review", authMiddleware, triggerFirstReview);
router.post("/trigger-hold-mail", authMiddleware, triggerHoldMail);
router.patch("/users/:id/status", authMiddleware, updateUserStatus);

// AI Chat Integration
router.post("/ai/chat", authMiddleware, chat);

module.exports = router;