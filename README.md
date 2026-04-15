# 🚀 AutoEmail AI | Command Center

Automate your student management and professional communications with an **AI-first recruitment engine**. Powered by the Universal Logic Core, this system handles everything from bulk additions to generative offer letters using natural language alone.

## 🌟 Core Features

### 🧠 AI Command Center (Universal Logic)
Control your entire database through a high-precision chat interface.
- **Natural Language Execution**: "Add Sarah sarah@test.com", "Remove everyone", or "Send certificate to Bharath for Python course".
- **Deduction Filter**: Intelligently isolates student names from company branding and course parameters.
- **Multi-Action Pipelines**: Processes complex lists and sequential commands in one go.

### ✈️ AI Autopilot Mode
Never send a blank placeholder again. The AI proactively generates context-aware content:
- **Generative Feedback**: supportive 2-line performance summaries.
- **Dynamic Scheduling**: Automatically calculates review dates (2 days out) and joining dates (14 days out).
- **Curriculum Generation**: Full 5-day academic schedules created on the fly.
- **Recruitment logic**: Generates professional job titles when omitted.

### 💼 Professional Branding
- **Dynamic Logos**: Every email and PDF is branded with your custom `companyName`.
- **Global Fallbacks**: Defaults to "AutoEmail AI" if no specific brand is provided.
- **PDF Blueprints**: Elegant, automated document generation for offer letters and certificates.

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **AI Engine**: Hugging Face Inference API (Qwen 2.5)
- **Automation**: Node-cron, Nodemailer
- **Documents**: Puppeteer (PDF Generation)

---

## 🚀 Quick Start

### 1. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URI=your_mongodb_uri
HUGGINGFACE_API_KEY=your_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 2. Installation
```bash
npm install
```

### 3. Initialize Templates
Run the seed script to populate the AI's email and PDF library:
```bash
node utils/seedTemplates.js
```

### 4. Run the Engine
```bash
npm run dev
```

---

## 🤖 Developer Notes
- **Templates**: All blueprints are stored in MongoDB and can be managed via the `🎨 Templates` tab.
- **Safety**: The `aiController.js` includes a Fail-Safe layer to ensure bulk deletions and updates are confirmed and handled robustly.
- **Autopilot**: Logic for content generation is defined in the `Master Universal Prompt` within `services/aiService.js`.

---
*Built for modern recruiters and educators by AutoEmail AI Team.*
