const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
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
        feedback: String,
        nextReviewDate: String,
        reviewDate: String,
        timeSlot: String,
        courseName: String,
        completionDate: String,
        jobTitle: String,
        joiningDate: String,
        taskTitle: String,
        taskDescription: String,
        deadline: String,
        schedule: String
    },
    reviewCompleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);