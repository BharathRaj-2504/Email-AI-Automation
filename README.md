# MailFlow Pro: Enterprise Email Automation 🚀

MailFlow Pro is an advanced, recruiter-centric email automation suite designed for high-volume student and candidate management. It features a modern dark-mode dashboard, dynamic PDF generation, and a persistent background automation engine.

## 🌟 Primary Capabilities

### 1. Unified Automation Engine ⚙️
A resilient background worker system powered by `node-cron` that manages persistent automation tasks without requiring server restarts.
- **Weekly Schedule Distributor**: Automatically synchronizes and sends personalized weekly agendas every Sunday at 9:00 PM.
- **24-Hour Review Reminders**: Daily morning scan (9:00 AM) that notifies students exactly 24 hours before their scheduled evaluations.
- **Live Configuration**: Toggle, pause, or reschedule automation frequencies directly from the dashboard.

### 2. High-Performance Dashboard 🖥️
A premium, dark-mode administrative interface built with Glassmorphism aesthetics and real-time telemetry.
- **Student Action Center**: A high-density operation hub for 1-click distributions (Offers, Certificates, Tasks).
- **Recruitment Lifecycle**: Color-coded application status management (Active, Hold, Selected) with live toggling.
- **Strategy Management**: In-browser HTML/Email template editor with dynamic variable badges.

### 3. Dynamic Document Generation 📄
Integrated Puppeteer-based PDF engine for on-the-fly professional document distribution.
- **Academic Certificates**: Premium milestone certificates with automatic course/date binding.
- **Official Offer Letters**: Professional recruitment documents with company-standard layouts.
- **Project Briefings**: Individualized task allocation documents with unique deadlines and descriptions.

### 4. Template Strategy
Universal placeholder support (`{{name}}`, `{{taskTitle}}`, `{{reviewDate}}`, etc.) across 15+ pre-seeded templates, including:
- Onboarding & Hold Notifications
- First Review Scheduling
- Technical Task Allocations
- Achievement Certification

## 🛠️ Technical Stack
- **Core**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Scheduling**: Node-Cron (Persistent config in DB)
- **PDF Engine**: Puppeteer
- **UI**: Vanilla HTML5/CSS3 (Glassmorphism & Dark Modern)
- **Security**: JWT-based Authentication

## 🚥 Setup & Deployment

### 1. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_app_password
JWT_SECRET=your_secure_secret
```

### 2. Installation
```bash
npm install
npx puppeteer browsers install chrome
```

### 3. Initialize Templates
```bash
node scripts/seedTemplates.js
```

### 4. Start Application
```bash
npm start
```

## 🤖 Development Note
This system uses a **Worker-Queue pattern**. All scheduled logic is centralized in `models/ScheduledEmail.js`. The `CronService` synchronizes memory-resident jobs with the `CronConfig` collection in MongoDB for persistence across reloads.
