const express = require("express");
const router = express.Router();

const { sendEmail, saveMultipleUsers, sendBulkEmail, getUsers, getScheduledEmails } = require("../controllers/testController");

router.post("/send-email", sendEmail);
router.post("/save-multiple-users", saveMultipleUsers);
router.post("/send-bulk-email", sendBulkEmail);
router.get("/users", getUsers);
router.get("/scheduled-emails", getScheduledEmails);

module.exports = router;