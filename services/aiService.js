const { HfInference } = require('@huggingface/inference');

// Clean API Key (removes accidental quotes)
const apiKey = (process.env.HUGGINGFACE_API_KEY || "").replace(/["']/g, "").trim();
const hf = new HfInference(apiKey);

/**
 * System Prompt to guide the model for structured extraction
 */
const SYSTEM_PROMPT = `
You are an AI Email Automation Assistant. Your goal is to parse user instructions into structured JSON actions.
Available Actions:
1. "add_user": Extract "name" and "email".
2. "update_user": Extract "targetName" (who to update) and "updates" (object containing "name" and/or "email").
3. "send_email": Extract "templateType" (e.g., offer_letter, certificate, task_allocation, review_feedback), "names" (array of strings), and "variables" (object containing dynamic fields like courseName, joiningDate, jobTitle, deadline, etc.).
4. "query": For general questions about help or system status.

Rules:
- Respond ONLY with a valid JSON object.
- If multiple actions are requested, return an array of JSON objects.
- If information is missing (like email for a new user), include "missingFields" array.
- NEVER use placeholder strings like "missing", "unknown", or "null" as actual values for fields like "email" or "name". If a value is unknown, leave it as null and list it in "missingFields".
- Current Date: ${new Date().toLocaleDateString()}

User Instruction: "{{instruction}}"
JSON Output:
`;

const processInstruction = async (instruction) => {
    try {
        if (!apiKey) {
            throw new Error("HUGGINGFACE_API_KEY is not configured in .env");
        }

        const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
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
            })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(JSON.stringify(data));

        let content = data.choices[0].message.content.trim();
        // Clean markdown code blocks if present
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();
        
        return JSON.parse(content);
    } catch (error) {
        console.error("[AI Service Error]", error);
        throw error;
    }
};

module.exports = { processInstruction };
