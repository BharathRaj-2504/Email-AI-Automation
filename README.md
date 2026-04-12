# Email AI Automation System

A robust Node.js backend designed for automated, personalized bulk email campaigns with dynamically generated PDF attachments.

## 🚀 Overview
This system automates the process of generating custom certificates or reports for users and sending them via email. It handles everything from database management and PDF rendering to secure email delivery and temporary file cleanup.

## 🛠 Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **PDF Engine**: Puppeteer (Chromium)
- **Email Service**: Nodemailer
- **Scheduler**: Node-Cron

## 📁 Project Structure
- `app.js`: Application entry point, server configuration, and cron job scheduling.
- `controllers/`: Contains the core business logic (`testController.js`) for PDF generation and bulk mailing.
- `routes/`: Express API endpoints.
- `models/`: MongoDB schemas (e.g., `User` model).
- `config/`: External service configurations (Database, Nodemailer).
- `utils/`: Helper scripts and testing utilities.
- `temp_pdfs/`: A temporary directory used to store PDFs during the generation-sending cycle (automatically managed).

## ✨ Key Features
- **Dynamic PDF Generation**: Uses Puppeteer to convert HTML templates into high-quality PDFs.
- **Personalization**: Automatically injects user data (like names) into the PDF content and filenames.
- **Bulk Email Processing**: Loops through database users and sends emails with unique attachments.
- **Anti-Spam Delay**: Implements a 1-second throttle between emails to comply with mail provider limits.
- **Absolute Pathing**: Uses `path.resolve` to ensure reliable file handling across different environments.
- **Self-Cleaning**: Automatically deletes temporary PDFs immediately after they are sent to maintain server health.
- **Automated Scheduling**: Includes a pre-configured CRON job for periodic updates.

## ⚙️ Setup & Installation

### 1. Environment Variables
Create a `.env` file in the root with:
```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Puppeteer Browser Install
Since Puppeteer requires a browser binary, run:
```bash
npx puppeteer browsers install chrome
```

## 🚥 Usage

### API Endpoints
- `POST /save-multiple-users`: Seed the database with a JSON list of users.
- `POST /send-bulk-email`: Manually trigger a bulk email blast.
- `POST /send-email`: Send a single test email.

### Automated Cron
By default, the system runs a bulk update **every minute** (defined in `app.js`). You can modify the cron syntax to match your desired frequency (e.g., daily or weekly).

## 🤖 AI Assistance Notes
This project emphasizes **asynchronous reliability**. When modifying the PDF or Email logic, ensure that:
1. `generatePDF` completely finishes before `sendMail` is called.
2. The `temp_pdfs` directory is used for all intermediate files.
3. Errors are caught per-user in loops to prevent a single failure from stopping the entire batch.
