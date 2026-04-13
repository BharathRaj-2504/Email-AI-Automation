const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const scheduleText = `Monday: Project Planning & Setup
Tuesday: Core Backend Development
Wednesday: API Integration & Testing
Thursday: Frontend UI/UX Refinement
Friday: Final Deployment & Review`;

async function updateAll() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({});
        console.log(`Updating ${users.length} users...`);
        
        for (const user of users) {
            user.metadata = { 
                ...user.metadata, 
                schedule: scheduleText 
            };
            await user.save();
        }
        
        console.log('✅ Successfully updated all user schedules.');
        process.exit();
    } catch (err) {
        console.error('❌ Error updating users:', err);
        process.exit(1);
    }
}

updateAll();
