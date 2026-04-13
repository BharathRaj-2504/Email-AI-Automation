const mongoose = require("mongoose");

const cronConfigSchema = new mongoose.Schema({
    key: { 
        type: String, 
        unique: true, 
        required: true 
    },
    name: {
        type: String,
        required: true
    },
    schedule: { 
        type: String, 
        default: "* * * * *",
        required: true 
    },
    enabled: { 
        type: Boolean, 
        default: true 
    },
    description: String
}, { timestamps: true });

module.exports = mongoose.model("CronConfig", cronConfigSchema);
