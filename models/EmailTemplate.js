const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema({
    type: { 
        type: String, 
        unique: true, 
        required: true,
        enum: ["certificate", "offer_letter", "custom", "task_assignment", "hold_mail", "review_feedback", "weekly_schedule", "first_review", "review_reminder"]
    },
    name: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    htmlContent: {
        type: String,
        description: "HTML template for PDF generation if applicable"
    },
    hasAttachment: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
