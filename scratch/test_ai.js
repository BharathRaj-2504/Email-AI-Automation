const { processInstruction } = require('./services/aiService');
require('dotenv').config();

async function test() {
    console.log("--- Test 1: Review Feedback ---");
    const res1 = await processInstruction("send review feedback to Bharath Raj ,feedback:Very worst ,Need improvement");
    console.log(JSON.stringify(res1, null, 2));

    console.log("\n--- Test 2: Offer Letter ---");
    const res2 = await processInstruction("send offer letter to Bhuvaneswaran S, company name: OneYes ,date of joining: 20/04/2026");
    console.log(JSON.stringify(res2, null, 2));
}

test();
