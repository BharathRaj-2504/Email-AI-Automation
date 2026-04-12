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
    subject: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
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
