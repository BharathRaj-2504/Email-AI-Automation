const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    status: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: null
    },
    applicationStatus: {
        type: String,
        enum: ["active", "hold", "selected"],
        default: "active"
    },
    lastSentAt: Date,
    metadata: {
        type: Object,
        default: {}
    },
    reviewCompleted: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model("User", userSchema);