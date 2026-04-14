const aiService = require('../services/aiService');
const testController = require('./testController');
const User = require('../models/User');

const chat = async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ success: false, message: "Missing message" });
    }

    try {
        const aiResponse = await aiService.processInstruction(message);
        const actions = Array.isArray(aiResponse) ? aiResponse : [aiResponse];
        const results = [];

        for (const action of actions) {
            if (action.action === 'add_user') {
                const isPlaceholder = action.email && (action.email.toLowerCase().includes('missing') || action.email.toLowerCase().includes('unknown'));
                if ((action.missingFields && action.missingFields.includes('email')) || !action.email || isPlaceholder) {
                    results.push({ 
                        type: 'message', 
                        content: `I've noted **${action.name}**, but I need an email address to add them to the database. Could you provide it?` 
                    });
                } else {
                    const existing = await User.findOne({ email: action.email });
                    if (existing) {
                        results.push({ type: 'message', content: `User **${action.name}** (${action.email}) already exists.` });
                    } else {
                        await User.create({ name: action.name, email: action.email, applicationStatus: 'active' });
                        results.push({ type: 'success', content: `Successfully added **${action.name}** to the database.` });
                    }
                }
            } else if (action.action === 'update_user') {
                const target = action.targetName;
                const users = await User.find({ name: new RegExp(target, 'i') });

                if (users.length === 0) {
                    results.push({ type: 'error', content: `Could not find any user named **${target}** to update.` });
                } else if (users.length > 1) {
                    results.push({ 
                        type: 'clarification', 
                        content: `I found multiple users named **${target}**. Which one would you like to update?`,
                        options: users.map(u => ({ label: `${u.name} (${u.email})`, email: u.email }))
                    });
                } else {
                    const user = users[0];
                    const originalEmail = user.email;
                    Object.assign(user, action.updates);
                    await user.save();
                    results.push({ 
                        type: 'success', 
                        content: `Successfully updated profile for **${user.name}**. (Old Email: ${originalEmail} -> New Email: ${user.email})` 
                    });
                }
            } else if (action.action === 'send_email') {
                const names = action.names || [];
                const template = action.templateType;
                
                for (const name of names) {
                    const users = await User.find({ name: new RegExp(name, 'i') });
                    
                    if (users.length === 0) {
                        results.push({ type: 'error', content: `Could not find any user named **${name}**.` });
                    } else if (users.length > 1) {
                        results.push({ 
                            type: 'clarification', 
                            content: `I found multiple users named **${name}**. Which one did you mean?`,
                            options: users.map(u => ({ label: `${u.name} (${u.email})`, email: u.email }))
                        });
                    } else {
                        const target = users[0];
                        await testController.executeSingleEmail(target.name, target.email, template, action.variables || {});
                        results.push({ type: 'success', content: `Triggered **${template.replace('_', ' ')}** for **${target.name}**.` });
                    }
                }
            } else {
                results.push({ type: 'message', content: action.message || "I've processed your instruction, but I'm not sure what action to take." });
            }
        }

        res.status(200).json({ success: true, results });
    } catch (error) {
        console.error("[AI Controller Error]", error);
        res.status(500).json({ success: false, message: "AI Processing Failed: " + error.message });
    }
};

module.exports = { chat };
