const mongoose = require("mongoose");
require("dotenv").config();
const EmailTemplate = require("../models/EmailTemplate");
const connectDB = require("../config/db");

const templates = [
    {
        type: "hold_mail",
        name: "Application Hold Notification",
        subject: "Update regarding your application - MailFlow Pro",
        body: "Dear {{name}},\n\nThank you for your interest and participation.\n\nWe would like to inform you that your application is currently on hold. We will update you with further information as soon as it becomes available.\n\nWe appreciate your patience.\n\nBest regards,\nTeam",
        htmlContent: `<div style="background:#f8fafc; padding:50px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#334155;">
            <div style="max-width:550px; margin:0 auto; background:white; padding:40px; border-radius:20px; box-shadow:0 15px 30px -5px rgba(0,0,0,0.05); border-top: 8px solid #94a3b8;">
                <h2 style="color:#475569; margin-top:0;">Update on your Application</h2>
                <p>Dear <strong>{{name}}</strong>,</p>
                <p>Thank you for the time and effort you have invested in our application process. We are writing to provide you with an update on your current status.</p>
                
                <div style="background:#f1f5f9; padding:25px; border-radius:12px; margin:25px 0; border:1px solid #e2e8f0;">
                    <p style="margin:0; font-weight:600; color:#475569;">Current Status: <span style="color:#f59e0b;">Application on Hold</span></p>
                    <p style="margin:10px 0 0 0; font-size:14px; color:#64748b;">This means your profile is still under consideration, but we are pausing further steps for a short duration while we finalize our next evaluation phase.</p>
                </div>
                
                <p style="font-size:15px; line-height:1.7;">We genuinely appreciate your patience and continued interest. You do not need to take any action at this time; we will reach out to you directly with any further updates.</p>
                
                <div style="margin-top:40px; padding-top:20px; border-top:1px solid #f1f5f9; text-align:center; font-size:12px; color:#94a3b8;">
                    MailFlow Pro Talent Acquisition • Automated Notification
                </div>
            </div>
        </div>`,
        hasAttachment: false
    },
    {
        type: "review_reminder",
        name: "Review Preparation Reminder",
        subject: "Reminder: Upcoming Review on {{reviewDate}}",
        body: "Hello {{name}},\n\nThis is a reminder that your review is scheduled on {{reviewDate}}.\n\nPlease be prepared.\n\nBest regards,\nTeam",
        htmlContent: `<div style="background:#f1f5f9; padding:40px; font-family:sans-serif; color:#334155;">
            <div style="max-width:500px; margin:0 auto; background:white; padding:30px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.05); border-left: 6px solid #f59e0b;">
                <h2 style="color:#b45309; margin-top:0;">⚠️ Review Reminder</h2>
                <p>Hello <strong>{{name}}</strong>,</p>
                <p>This is a quick courtesy reminder that your performance review session is scheduled for tomorrow.</p>
                
                <div style="background:#fffbeb; padding:20px; border-radius:8px; border:1px solid #fef3c7; margin:20px 0;">
                    <span style="font-size:12px; color:#92400e; text-transform:uppercase;">Scheduled Date</span><br>
                    <span style="font-weight:bold; font-size:18px; color:#b45309;">{{reviewDate}}</span>
                </div>
                
                <p style="font-size:14px; line-height:1.6;">Please ensure you have all your deliverables ready and your progress tracker updated before the session begins.</p>
                
                <div style="margin-top:30px; padding-top:20px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center;">
                    Automated Reminder System • MailFlow Pro
                </div>
            </div>
        </div>`,
        hasAttachment: false
    },
    {
        type: "task_allocation",
        name: "Technical Task Briefing",
        subject: "New Task Assigned – {{name}}",
        body: "Hello {{name}},\n\nA new task has been assigned to you.\n\nPlease find the task details in the attached document.\n\nComplete it within the given timeline.\n\nBest regards,\nTeam",
        htmlContent: `<div style="padding:40px; color:#334155; font-family: 'Segoe UI', sans-serif; line-height:1.6;">
            <div style="background:#6366f1; color:white; padding:30px; border-radius:12px 12px 0 0;">
                <h1 style="margin:0; font-size:24px;">Project Task Assignment</h1>
                <p style="margin:5px 0 0 0; opacity:0.8; font-size:14px;">Reference ID: TASK-${Math.floor(Math.random()*10000)}</p>
            </div>
            
            <div style="padding:30px; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 12px 12px;">
                <p>Hello <strong>{{name}}</strong>,</p>
                <p>You have been assigned a new technical objective. Please review the details below carefully and adhere to the stipulated deadline.</p>
                
                <div style="margin:25px 0; border-left:4px solid #6366f1; padding-left:20px;">
                    <h3 style="color:#6366f1; margin:0 0 10px 0;">{{taskTitle}}</h3>
                    <div style="font-size:15px; color:#475569; background:#f8fafc; padding:15px; border-radius:8px;">
                        {{taskDescription}}
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:30px; padding-top:20px; border-top:1px solid #f1f5f9;">
                    <div>
                        <span style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Submission Deadline</span><br>
                        <span style="font-weight:bold; color:#ef4444;">{{deadline}}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Priority Level</span><br>
                        <span style="font-weight:bold; color:#f59e0b;">Standard</span>
                    </div>
                </div>
                
                <p style="margin-top:40px; font-size:14px;"><strong>Guidelines:</strong></p>
                <ul style="font-size:13px; color:#64748b;">
                    <li>Ensure all code follows the project's style guide.</li>
                    <li>Submit your work via the PR process before the deadline.</li>
                    <li>Reach out to your mentor if you have any blockers.</li>
                </ul>
            </div>
            
            <div style="margin-top:30px; text-align:center; font-size:12px; color:#94a3b8;">
                Generated by MailFlow Pro Tasking System
            </div>
        </div>`,
        hasAttachment: true
    },
    {
        type: "first_review",
        name: "First Review Schedule",
        subject: "Your First Review Schedule, {{name}}",
        body: "Hello {{name}},\n\nYour first review has been scheduled.\n\nDate: {{reviewDate}}\nTime: {{timeSlot}}\n\nPlease be prepared.\n\nBest regards,\nTeam",
        htmlContent: `<div style="background:#f8fafc; padding:40px; font-family:sans-serif; color:#1e293b;">
            <div style="max-width:550px; margin:0 auto; background:white; padding:35px; border-radius:16px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); border-top: 8px solid #6366f1;">
                <h2 style="color:#6366f1; margin-top:0;">Evaluation Milestone</h2>
                <p>Hello <strong>{{name}}</strong>,</p>
                <p>We've successfully mapped out your initial progress assessment. Your first formal review is now scheduled.</p>
                
                <div style="background:#f1f5f9; padding:20px; border-radius:12px; margin:25px 0;">
                    <div style="margin-bottom:10px;">
                        <span style="font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Date</span><br>
                        <span style="font-weight:bold; font-size:18px;">{{reviewDate}}</span>
                    </div>
                    <div>
                        <span style="font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Time Slot</span><br>
                        <span style="font-weight:bold; font-size:18px;">{{timeSlot}}</span>
                    </div>
                </div>
                
                <p style="font-size:14px; line-height:1.6; color:#475569;">Please ensure you are ready with your progress reports and any queries you might have. Our mentors are looking forward to discussing your journey.</p>
                
                <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; text-align:center;">
                    Automated Scheduling via MailFlow Pro
                </div>
            </div>
        </div>`,
        hasAttachment: false
    },
    {
        type: "certificate",
        name: "Achievement Certificate",
        subject: "Congratulations {{name}} – Your Certificate",
        body: "Dear {{name}},\n\nCongratulations on successfully completing the program!\n\nPlease find your certificate attached.\n\nWe wish you all the best for your future.\n\nBest regards,\nTeam",
        htmlContent: `<div style="padding:40px; border: 15px solid #6366f1; background:#ffffff; color:#1e293b; font-family: 'Segoe UI', serif; text-align:center; position:relative; min-height:800px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <div style="border: 2px solid #6366f1; padding: 20px; width: 90%; height: 90%;">
                <h1 style="font-size:54px; margin-bottom:5px; color:#6366f1;">CERTIFICATE</h1>
                <p style="font-size:18px; text-transform:uppercase; letter-spacing:4px; margin-top:0;">OF COMPLETION</p>
                
                <div style="margin:50px 0;">
                    <p style="font-size:24px; font-style:italic; color:#64748b;">This is to certify that</p>
                    <h2 style="font-size:42px; color:#1e293b; margin:10px 0; border-bottom: 2px solid #e2e8f0; display:inline-block; padding:0 30px;">{{name}}</h2>
                </div>
                
                <p style="font-size:20px; max-width:600px; margin:0 auto; line-height:1.5;">Has successfully mastered all requirements for the professional certification program in</p>
                <h3 style="font-size:28px; color:#4f46e5; margin:15px 0;">{{courseName}}</h3>
                
                <div style="margin-top:60px; display:grid; grid-template-columns: 1fr 1fr; gap:100px; width: 80%;">
                    <div style="border-top: 1px solid #94a3b8; padding-top:10px;">
                        <span style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Date of Completion</span><br>
                        <span style="font-weight:bold;">{{completionDate}}</span>
                    </div>
                    <div style="border-top: 1px solid #94a3b8; padding-top:10px;">
                        <span style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Program Director</span><br>
                        <span style="font-weight:bold;">MailFlow Pro Academy</span>
                    </div>
                </div>
                
                <div style="position:absolute; bottom:60px; right:60px; width:80px; height:80px; background:rgba(99, 102, 241, 0.1); border-radius:50%; border: 4px double #6366f1; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; color:#6366f1; transform:rotate(-15deg);">
                    OFFICIAL<br>STAMP
                </div>
            </div>
        </div>`,
        hasAttachment: true
    },
    {
        type: "offer_letter",
        name: "Official Offer Letter",
        subject: "Offer Letter for {{name}}",
        body: "Dear {{name}},\n\nCongratulations! We are pleased to offer you a position with our organization.\n\nPlease find your offer letter attached.\n\nBest regards,\nTeam",
        htmlContent: `<div style="padding:50px; color:#1e293b; font-family: 'Times New Roman', serif; line-height:1.6;">
            <div style="text-align:right; font-size:14px; color:#64748b; margin-bottom:40px;">
                Date: ${new Date().toLocaleDateString()}
            </div>
            
            <h1 style="text-align:center; color:#0f172a; text-transform:uppercase; letter-spacing:2px; margin-bottom:50px; border-bottom:2px solid #0f172a; padding-bottom:10px;">Letter of Appointment</h1>
            
            <p>Dear <strong>{{name}}</strong>,</p>
            
            <p>We are delighted to formally offer you the position of <strong>{{jobTitle}}</strong> at our organization. We were extremely impressed by your credentials and believe your background will be a significant asset to our team.</p>
            
            <div style="background:#f8fafc; padding:30px; border-radius:12px; margin:30px 0; border:1px solid #e2e8f0;">
                <h3 style="margin-top:0; color:#4f46e5;">Employment Details</h3>
                <p><strong>Designation:</strong> {{jobTitle}}</p>
                <p><strong>Date of Joining:</strong> {{joiningDate}}</p>
                <p><strong>Work Location:</strong> Remote / Office</p>
            </div>
            
            <p>Please review the attached terms and conditions. We look forward to having you join us on <strong>{{joiningDate}}</strong> for your official onboarding.</p>
            
            <div style="margin-top:80px;">
                <p>Sincerely,</p>
                <p style="font-weight:bold; margin-top:40px;">Director of Human Resources</p>
                <p style="color:#64748b; font-size:12px;">MailFlow Pro Automation Systems</p>
            </div>
        </div>`,
        hasAttachment: true
    },
    {
        type: "review_feedback",
        name: "Performance Feedback",
        subject: "Review Feedback for {{name}}",
        body: "Hello {{name}},\n\nYour recent review has been completed.\n\nFeedback:\n{{feedback}}\n\nYour next review is scheduled on {{nextReviewDate}}.\n\nKeep improving and all the best!",
        htmlContent: `<div style="background:#f8fafc; padding:30px; border: 1px solid #e2e8f0; font-family: sans-serif;">
            <h2 style="color:#1e293b; margin-top:0;">Evaluation Summary</h2>
            <p>Hello <strong>{{name}}</strong>,</p>
            <p>Your recent periodic review has been successfully completed by the administrative team.</p>
            <div style="background:#ffffff; padding:20px; border-radius:12px; border: 1px solid #6366f1; margin: 20px 0;">
                <p style="margin-top:0; font-weight:600; color:#6366f1;">Feedback Report:</p>
                <p style="color:#475569; font-style: italic; line-height: 1.6;">"{{feedback}}"</p>
            </div>
            <p style="margin-bottom:20px;">Your next evaluation is scheduled for: <strong>{{nextReviewDate}}</strong></p>
            <p style="border-top: 1px solid #e2e8f0; pt: 20px; color:#94a3b8; font-size: 0.85rem;">Keep improving and all the best!</p>
        </div>`,
        hasAttachment: false
    },
    {
        type: "weekly_schedule",
        name: "Weekly Routine Mail",
        subject: "Your Weekly Schedule, {{name}}",
        body: "Hello {{name}},\n\nHere is your schedule for this week:\n\n{{schedule}}\n\nPlease follow the schedule accordingly.\n\nBest regards,\nTeam",
        htmlContent: `<div style="background:#f1f5f9; padding:40px; font-family:sans-serif; color:#334155;">
            <div style="max-width:600px; margin:0 auto; background:white; padding:30px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                <h2 style="color:#6366f1; border-bottom:2px solid #6366f1; padding-bottom:10px;">Weekly Schedule Update</h2>
                <p>Hello <strong>{{name}}</strong>,</p>
                <p>Please find your personalized roadmap for the upcoming week below:</p>
                <div style="background:#f8fafc; padding:20px; border-radius:8px; border-left:4px solid #6366f1; white-space: pre-wrap; margin:20px 0;">
{{schedule}}
                </div>
                <p style="font-size:14px; color:#64748b;">If you have any questions regarding these tasks, please contact your mentor.</p>
                <div style="margin-top:30px; padding-top:20px; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8;">
                    Automated via MailFlow Pro System
                </div>
            </div>
        </div>`,
        hasAttachment: false
    }
];

const seed = async () => {
    try {
        await connectDB();
        // Clear all existing templates to ensure a clean slate
        await EmailTemplate.deleteMany({});
        await EmailTemplate.insertMany(templates);
        console.log("✅ Cleaned system: Retained only essential automation templates.");
        process.exit();
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
};

seed();
