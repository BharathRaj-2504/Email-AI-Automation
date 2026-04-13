const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema({
    type: { 
        type: String, 
        unique: true, 
        required: true,
        enum: ["certificate", "offer_letter", "notification", "review", "custom", "welcome_mail", "task_assignment", "hold_mail", "rejection", "scholarship", "review_feedback", "weekly_schedule", "first_review", "task_allocation", "review_reminder", "hold_mail"]
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
