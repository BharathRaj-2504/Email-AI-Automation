const { HfInference } = require('@huggingface/inference');

// Clean API Key (removes accidental quotes)
const apiKey = (process.env.HUGGINGFACE_API_KEY || "").replace(/["']/g, "").trim();
const hf = new HfInference(apiKey);

/**
 * System Prompt to guide the model for structured extraction
 */
const SYSTEM_PROMPT = `
You are an AI Email Automation Specialist. Your goal is to parse user instructions into precise structured JSON actions.

### Available Actions:
1. "add_user": Extract "name" and "email". For multiple people, return an array of separate "add_user" objects.
2. "update_user": Extract "targetName" (search query) and "updates" (object). For bulk changes, set "targetName" to "all".
3. "send_email": Extract "templateType", "names" (array), "emails" (array), and "variables" (object). Use "all" in "names" for bulk sending.
4. "delete_user": Extract "name" or "email". For bulk deletion of everyone, set "name" to "all".
5. "list_users": Extract "filters" (object).
6. "get_stats": No parameters.
7. "query": Use for questions or conversational responses.

### Critical Extraction Logic (Edge Cases):
- **Conversational Exclusion**: Ignore names meant for the assistant (e.g., "to Claude", "to the AI"). These are NOT recipients or variables.
- **Variable Separation**: Values assigned to "variables" (e.g., companyName, courseName) MUST NEVER be included in "names" or "emails". One word = one purpose.
- **Bulk Priority**: Whenever "all", "everyone", "the whole list", or "every student" is mentioned, prioritize the "all" keyword in the target field over individual name extraction.
- **Deduction and Context**: Use logic to determine if a name is a user or a parameter label.
- **No Hallucination**: NEVER guess or generate email addresses if they are not explicitly in the instruction. If an email is missing, leave the "emails" array empty.

### Autopilot Requirements (Generate Missing Data):
- If the user omits details for an email, proactively generate them:
  - 'review_feedback': Generate 2-line feedback + Review Date (Today + 2 days).
  - 'task_assignment': Generate logical taskTitle, taskDescription, and deadline (Today + 3 days).
  - 'weekly_schedule': Generate a 5-day, 6-period academic schedule.
  - 'offer_letter': Generate a jobTitle + Joining Date (Today + 14 days).

Current Date: ${new Date().toLocaleDateString()}
Always return valid JSON or an array of JSON objects.

User Instruction: "{{instruction}}"
JSON Output:
`;

const processInstruction = async (instruction) => {
    try {
        if (!apiKey) {
            throw new Error("HUGGINGFACE_API_KEY is not configured in .env");
        }

        const maxRetries = 3;
        let attempt = 0;
        let response;

        while (attempt < maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

                response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'Qwen/Qwen2.5-7B-Instruct',
                        messages: [
                            { role: "system", content: SYSTEM_PROMPT.split('User Instruction:')[0].trim() },
                            { role: "user", content: instruction }
                        ],
                        max_tokens: 500,
                        temperature: 0.1
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) break;
                
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            } catch (err) {
                attempt++;
                console.warn(`[AI Service] Attempt ${attempt} failed:`, err.message);
                if (attempt >= maxRetries) {
                    if (err.name === 'AbortError') {
                        throw new Error("AI service timed out. Please try again in a few moments.");
                    }
                    throw err;
                }
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }

        const data = await response.json();

        let content = data.choices[0].message.content.trim();
        
        // Robust JSON extraction: Find the first { or [ and the last } or ]
        const firstBrace = content.indexOf('{');
        const firstBracket = content.indexOf('[');
        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
        
        const lastBrace = content.lastIndexOf('}');
        const lastBracket = content.lastIndexOf(']');
        const end = (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) ? lastBrace : lastBracket;

        if (start !== -1 && end !== -1 && end > start) {
            content = content.substring(start, end + 1);
        }

        try {
            return JSON.parse(content);
        } catch (parseErr) {
            console.warn("[AI Service] JSON Parse failed, falling back to query action.", parseErr.message);
            // Fallback: If AI just speaks naturally, wrap it in a query action
            return { action: "query", message: data.choices[0].message.content.trim() };
        }
    } catch (error) {
        console.error("[AI Service Error]", error);
        throw error;
    }
};

module.exports = { processInstruction };
