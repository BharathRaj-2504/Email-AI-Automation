# AutoEmail AI | Premium Command Center 🚀

AutoEmail AI is a next-generation, recruiter-centric automation suite that leverages **Artificial Intelligence** to manage student lifecycles and high-volume email workflows. It features a stunning glassmorphic dashboard and a natural-language **AI Command Center** powered by Qwen-2.5.

## 🌟 Intelligent Features

### 1. AI Command Center 🤖
A centralized conversational hub that understands your intent. No more hunting for buttons—just talk to your dashboard.
- **Smart Extraction**: Extract names and emails from casual sentences (e.g., *"Add Raj raj@dev.com"*).
- **Workflow Automation**: Trigger specific email campaigns via chat (e.g., *"Send an offer letter to Raj for the Python course"*).
- **Entity Resolution**: If multiple candidates share a name, the AI intelligently asks for clarification.
- **Field Validation**: Automatically detects missing data (like emails) and prompts you for details.

### 2. High-End Glassmorphic Dashboard 🖥️
A premium administrative interface designed for modern efficiency.
- **Live Pulse Monitoring**: Real-time stats ribbon showing delivery successes and failures.
- **Integrated Workspace**: A unified view combining the AI Hub, Statistics, and Vital Activity logs.
- **System Workflow Control**: Manual triggers for Bulk Hold mail and Daily Momentum crawlers.

### 3. Automated Recruitment Workflows ⚙️
Integrated engine for complex recruitment lifecycle tasks:
- **Offer Letters**: Professional PDF generation and distribution.
- **Academic Certificates**: Automated milestone certification with Pupil-design layouts.
- **Evaluation Feedback**: Streamlined review feedback distribution with personalized variables.
- **Task Allocations**: Dynamic project briefings with unique deadlines.

### 4. Resilient Background Engine
- **Daily Crawler**: Automated Mon-Fri scanning of active students for daily momentum updates.
- **Review Reminders**: Morning scans that notify students 24 hours before their evaluations.
- **Persistence**: All configurations and logs are stored in MongoDB.

## 🛠️ Technical Stack
- **AI Engine**: Hugging Face Inference API (Qwen-2.5-7B-Instruct)
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Automation**: Node-Cron
- **PDF Core**: Puppeteer
- **UI**: CSS3 Glassmorphism 2.0 (Outfit Typography)

## 🚥 Setup & Deployment

### 1. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_app_password
JWT_SECRET=your_secure_secret
HUGGINGFACE_API_KEY=your_hf_token
```

### 2. Installation
```bash
npm install
npx puppeteer browsers install chrome
```

### 3. Start Application
```bash
npm start
```

## 🤖 AI Interaction Guide
Try these commands in the Integrated Chat:
- *"Add student Bharat bharat@example.com"*
- *"Send an offer letter to Bharat for the Python role beginning next Monday"*
- *"Send completion certificates to John and Sarah"*

---
