const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    recipientEmail: {
        type: String,
        required: true
    },
    templateType: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["success", "failure"],
        required: true
    },
    error: {
        type: String
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("EmailLog", emailLogSchema);
