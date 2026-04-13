const mongoose = require("mongoose");

const scheduledEmailSchema = new mongoose.Schema({
    recipientType: {
        type: String,
        enum: ["single", "bulk"],
        required: true
    },
    recipientEmail: {
        type: String,
        required: function() { return this.recipientType === "single"; }
    },
    name: {
        type: String,
        required: function() { return this.recipientType === "single"; }
    },
    templateType: {
        type: String,
        required: true
    },
    subject: {
        type: String
    },
    message: {
        type: String
    },
    customVariables: {
        type: Object,
        default: {}
    },
    scheduledAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending"
    },
    error: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model("ScheduledEmail", scheduledEmailSchema);
