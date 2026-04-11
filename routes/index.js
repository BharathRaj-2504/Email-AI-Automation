const express = require("express");
const router = express.Router();

const { sendEmail, saveMultipleUsers, sendBulkEmail } = require("../controllers/testController");

router.post("/send-email", sendEmail);
router.post("/save-multiple-users", saveMultipleUsers);
router.post("/send-bulk-email", sendBulkEmail);

module.exports = router;