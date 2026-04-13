require('dotenv').config();
const mongoose = require('mongoose');
const EmailTemplate = require('../models/EmailTemplate');

const templates = [
    {
        type: "review_feedback",
        name: "Review Feedback",
        subject: "Your Performance Review Feedback - {{name}}",
        body: "Hi {{name}},\n\nThank you for attending the review session. Here is your feedback: {{feedback}}\n\nYour next review is scheduled for {{nextReviewDate}}.\n\nBest regards,\nAutoEmail AI Team",
        hasAttachment: false
    },
    {
        type: "weekly_schedule",
        name: "Weekly Schedule",
        subject: "Your Training Schedule for Next Week",
        body: "Hi {{name}},\n\nPlease find your personalized schedule for the upcoming week below:\n\n{{schedule}}\n\nMake sure to stay updated and follow the timeline.\n\nBest,\nAutoEmail AI Bot",
        hasAttachment: false
    },
    {
        type: "offer_letter",
        name: "Offer Letter",
        subject: "Congratulations! Offer Letter from AutoEmail AI",
        body: "Dear {{name}},\n\nWe are thrilled to offer you the position of {{jobTitle}} at AutoEmail AI. Your journey with us starts on {{joiningDate}}.\n\nPlease find your official offer letter attached to this email.\n\nWelcome aboard!",
        hasAttachment: true,
        htmlContent: `
            <div style="font-family: 'Outfit', sans-serif; padding: 50px; border: 10px solid #eee;">
                <h1 style="color: #6366f1; text-align: center;">OFFER LETTER</h1>
                <p>Date: ${new Date().toLocaleDateString()}</p>
                <p>Name: <b>{{name}}</b></p>
                <p>Position: <b>{{jobTitle}}</b></p>
                <p>Joining Date: <b>{{joiningDate}}</b></p>
                <hr>
                <p>We are excited to have you join our team. This letter confirms our offer for the position stated above.</p>
                <p>Regards,<br>HR Department | AutoEmail AI</p>
            </div>
        `
    },
    {
        type: "certificate",
        name: "Course Completion Certificate",
        subject: "Completion Certificate - {{courseName}}",
        body: "Hi {{name}},\n\nCongratulations on successfully completing the course '{{courseName}}' on {{completionDate}}!\n\nYour certificate is attached below. Keep learning!",
        hasAttachment: true,
        htmlContent: `
            <div style="text-align: center; font-family: 'Outfit', sans-serif; padding: 80px; border: 15px solid #6366f1; background: #fff;">
                <h2 style="color: #6366f1; font-size: 40px;">CERTIFICATE OF COMPLETION</h2>
                <p style="font-size: 20px;">This is to certify that</p>
                <h1 style="font-size: 50px; margin: 20px 0;">{{name}}</h1>
                <p style="font-size: 20px;">has successfully completed the program</p>
                <h2 style="font-size: 30px; color: #333;">{{courseName}}</h2>
                <p style="font-size: 18px;">Awarded on {{completionDate}}</p>
                <p style="margin-top: 40px;">Verified by <b>AutoEmail AI Systems</b></p>
            </div>
        `
    },
    {
        type: "first_review",
        name: "First Review Schedule",
        subject: "Schedule for Your First Review - AutoEmail AI",
        body: "Hi {{name}},\n\nYour first review is scheduled for {{reviewDate}} at {{timeSlot}}. Please be prepared with your progress report.\n\nSettings: Online Meeting link will be shared 1 hour before.",
        hasAttachment: false
    },
    {
        type: "task_allocation",
        name: "Task Assignment",
        subject: "New Task Assigned: {{taskTitle}} - AutoEmail AI",
        body: "Hi {{name}},\n\nYou have been assigned a new task: {{taskTitle}}.\n\nDescription: {{taskDescription}}\nDeadline: {{deadline}}\n\nCheck the attached PDF for more details.",
        hasAttachment: true,
        htmlContent: `
            <div style="font-family: 'Arial', sans-serif; padding: 40px; background: #f9fafb;">
                <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <h2 style="color: #6366f1;">TASK BRIEF: {{taskTitle}}</h2>
                    <p><b>Assignee:</b> {{name}}</p>
                    <p><b>Deadline:</b> {{deadline}}</p>
                    <hr>
                    <h3>Details</h3>
                    <p>{{taskDescription}}</p>
                    <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Project Managed by AutoEmail AI</p>
                </div>
            </div>
        `
    },
    {
        type: "review_reminder",
        name: "Review Reminder",
        subject: "Reminder: Upcoming Review Tomorrow - AutoEmail AI",
        body: "Hi {{name}},\n\nThis is a reminder that your review session is scheduled for tomorrow ({{reviewDate}}).\n\nSee you there!",
        hasAttachment: false
    },
    {
        type: "hold_mail",
        name: "On Hold Status Update",
        subject: "Update Regarding Your Application Status",
        body: "Hi {{name}},\n\nThank you for your interest in AutoEmail AI. We wanted to inform you that your application is currently on hold.\n\nWe will get back to you if there are further updates.\n\nRegards,\nRecruitment Team | AutoEmail AI",
        hasAttachment: false
    },
    {
        type: "notification",
        name: "Daily Momentum Update",
        subject: "{{subject}}",
        body: "Hi {{name}},\n\nThis is your automated momentum update for {{currentDay}}.\n\nStay productive and keep pushing boundaries!\n\nBest,\nAutoEmail AI Bot",
        hasAttachment: false
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/email-automation');
        console.log('Connected to MongoDB for seeding...');

        await EmailTemplate.deleteMany({});
        await EmailTemplate.insertMany(templates);

        console.log('Successfully seeded 8 default templates! 🚀');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seed();
