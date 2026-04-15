const aiService = require('../services/aiService');
const testController = require('./testController');
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const ScheduledEmail = require('../models/ScheduledEmail');

// Status Normalization Helper
const normalizeStatus = (status) => {
    if (!status) return status;
    const s = status.toLowerCase().replace(/_/g, ' ').trim();
    if (s.includes('hold') || s.includes('wait')) return 'hold';
    if (s.includes('active') || s.includes('start')) return 'active';
    if (s.includes('selected') || s.includes('final')) return 'selected';
    return status; // Default fallback
};

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
                const target = action.targetName || '';
                const updates = action.updates || {};

                // Handle Bulk Update Case
                if (['all', 'everyone', 'all users', 'all students'].includes(target.toLowerCase())) {
                    const updateObj = { ...updates };
                    
                    // Normalize applicationStatus if present
                    if (updateObj.applicationStatus) {
                        updateObj.applicationStatus = normalizeStatus(updateObj.applicationStatus);
                    }

                    const mongoUpdate = {};
                    for (const [key, value] of Object.entries(updateObj)) {
                        if (key === 'metadata') {
                            for (const [mKey, mVal] of Object.entries(value)) {
                                mongoUpdate[`metadata.${mKey}`] = mVal;
                            }
                        } else {
                            mongoUpdate[key] = value;
                        }
                    }

                    const result = await User.updateMany({}, { $set: mongoUpdate });
                    results.push({ 
                        type: 'success', 
                        content: `Successfully performed bulk update! **${result.modifiedCount}** users were updated.` 
                    });
                } else {
                    // Standard Individual Update Case
                    const users = await User.find({ 
                        $or: [
                            { name: new RegExp(target, 'i') },
                            { email: target }
                        ]
                    });

                    if (users.length === 0) {
                        results.push({ type: 'error', content: `Could not find any user named **${target || 'unknown'}** to update.` });
                    } else if (users.length > 1) {
                        results.push({ 
                            type: 'clarification', 
                            content: `I found multiple users named **${target}**. Which one would you like to update?`,
                            options: users.map(u => ({ label: `${u.name} (${u.email})`, email: u.email }))
                        });
                    } else {
                        const user = users[0];
                        
                        // Handle metadata updates properly
                        if (updates.metadata) {
                            user.metadata = { ...user.metadata, ...updates.metadata };
                            delete updates.metadata;
                        }
                        
                        // Merge and normalize updates
                        if (updates.applicationStatus) {
                            updates.applicationStatus = normalizeStatus(updates.applicationStatus);
                        }
                        Object.assign(user, updates);
                        await user.save();
                        results.push({ 
                            type: 'success', 
                            content: `Successfully updated profile for **${user.name}**.` 
                        });
                    }
                }
            } else if (action.action === 'delete_user') {
                const target = action.name || action.email || '';
                const rawMessage = message.toLowerCase();
                
                // Fail-Safe: Recognition of bulk keywords in the raw message + extracted AI fields
                const isBulkDelete = 
                    ['all', 'everyone', 'all users', 'all students'].includes(target.toLowerCase()) ||
                    (rawMessage.includes('delete all') && (rawMessage.includes('student') || rawMessage.includes('user'))) ||
                    (rawMessage.includes('remove all') && (rawMessage.includes('student') || rawMessage.includes('user')));

                if (isBulkDelete) {
                    const studentResult = await User.deleteMany({});
                    const logResult = await EmailLog.deleteMany({});
                    results.push({ 
                        type: 'success', 
                        content: `System Reset: Removed **${studentResult.deletedCount}** students and cleared **${logResult.deletedCount}** history logs.` 
                    });
                } else {
                    // Standard Individual Delete Case
                    const users = await User.find({ 
                        $or: [
                            { name: new RegExp(target, 'i') },
                            { email: target }
                        ]
                    });

                    if (users.length === 0) {
                        results.push({ type: 'error', content: `Could not find any user matching **${target || 'unknown'}** to delete.` });
                    } else if (users.length > 1) {
                        results.push({ 
                            type: 'clarification', 
                            content: `I found multiple users matching **${target}**. Which one should I delete?`,
                            options: users.map(u => ({ label: `${u.name} (${u.email})`, email: u.email }))
                        });
                    } else {
                        const user = users[0];
                        await User.findByIdAndDelete(user._id);
                        results.push({ type: 'success', content: `User **${user.name}** has been removed from the database.` });
                    }
                }
            } else if (action.action === 'list_users') {
                const filter = {};
                if (action.filters?.status) filter.applicationStatus = action.filters.status;
                
                const users = await User.find(filter).limit(20);
                if (users.length === 0) {
                    results.push({ type: 'message', content: "No users found matching those criteria." });
                } else {
                    const list = users.map(u => `- **${u.name}** (${u.email}) [${u.applicationStatus}]`).join('\n');
                    results.push({ 
                        type: 'message', 
                        content: `Here are the matching students:\n${list}${users.length >= 20 ? '\n\n*Truncated to latest 20 results.*' : ''}` 
                    });
                }
            } else if (action.action === 'get_stats') {
                const stats = {
                    total: await User.countDocuments(),
                    active: await User.countDocuments({ applicationStatus: 'active' }),
                    hold: await User.countDocuments({ applicationStatus: 'hold' }),
                    selected: await User.countDocuments({ applicationStatus: 'selected' })
                };
                results.push({ 
                    type: 'message', 
                    content: `System Statistics:\n- Total Students: **${stats.total}**\n- Active: **${stats.active}**\n- On Hold: **${stats.hold}**\n- Selected: **${stats.selected}**` 
                });
            } else if (action.action === 'send_email') {
                const rawNames = action.names || [];
                const rawEmails = action.emails || [];
                const template = action.templateType;

                // Normalize inputs to arrays to prevent character-iteration on strings
                let names = Array.isArray(rawNames) ? rawNames : [rawNames];
                let emails = Array.isArray(rawEmails) ? rawEmails : [rawEmails];
                const variables = action.variables || {};

                // Deduction Filter: Remove values that are clearly variables, not recipients
                // (e.g., if "Claude" is the company name, it's not a person to email)
                const variableValues = Object.values(variables).map(v => String(v).toLowerCase());
                names = names.filter(n => !variableValues.includes(String(n).toLowerCase()));
                emails = emails.filter(e => !variableValues.includes(String(e).toLowerCase()));
                
                let targets = [];
                const clarifications = [];
                const errors = [];

                // Check for Bulk Sending Case
                const hasBulkKeyword = [...names, ...emails].some(t => 
                    typeof t === 'string' && ['all', 'everyone', 'all users', 'all students'].includes(t.toLowerCase())
                );

                if (hasBulkKeyword) {
                    targets = await User.find({ applicationStatus: { $ne: 'deleted' } });
                } else {
                    // 1. Process exact emails
                    for (const email of emails) {
                        if (!email) continue;
                        const user = await User.findOne({ email: email.toLowerCase() });
                        if (user) {
                            targets.push(user);
                        } else {
                            errors.push(`Could not find a user with email **${email}**.`);
                        }
                    }

                    // 2. Process names with smart matching
                    for (const name of names) {
                        if (!name) continue;
                        // Try exact name match first to avoid ambiguity with substrings
                        let users = await User.find({ name: new RegExp(`^${name}$`, 'i') });
                        
                        if (users.length === 0) {
                            // Fallback to partial match if no exact match
                            users = await User.find({ name: new RegExp(name, 'i') });
                        }

                        if (users.length === 0) {
                            errors.push(`Could not find any user named **${name}**.`);
                        } else if (users.length > 1) {
                            clarifications.push({
                                name,
                                options: users.map(u => ({ label: `${u.name} (${u.email})`, email: u.email }))
                            });
                        } else {
                            targets.push(users[0]);
                        }
                    }
                }

                // 3. Deduction & Action
                if (clarifications.length > 0) {
                    // Option B: If ANY ambiguity exists, don't send anything
                    for (const clar of clarifications) {
                        results.push({ 
                            type: 'clarification', 
                            content: `I found multiple users named **${clar.name}**. Which one did you mean?`,
                            options: clar.options 
                        });
                    }
                    if (targets.length > 0) {
                        results.push({ 
                            type: 'message', 
                            content: `Note: I've held off on sending to **${targets.map(u => u.name).join(', ')}** until you've clarified the other names to ensure everything is sent together.` 
                        });
                    }
                } else {
                    // Deduplicate targets by ID
                    const uniqueTargets = Array.from(new Map(targets.map(u => [u._id.toString(), u])).values());
                    
                    for (const target of uniqueTargets) {
                        const variables = action.variables || {};
                        
                        // Global Branding Fallback
                        if (!variables.companyName) variables.companyName = "AutoEmail AI";

                        // Backend Fallbacks if AI missed autopilot instructions
                        if (template === 'review_feedback') {
                            if (!variables.feedback) variables.feedback = "Great progress so far! Your grasp of the concepts is improving, and you're showing a strong commitment to the material. Keep up the consistent effort.";
                            if (!variables.nextReviewDate) {
                                const dayAfterTomorrow = new Date();
                                dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
                                variables.nextReviewDate = dayAfterTomorrow.toLocaleDateString();
                            }
                        } else if (template === 'weekly_schedule') {
                            if (!variables.schedule) {
                                variables.schedule = `
Monday: 9AM-12PM Web Development, 1PM-3PM Soft Skills
Tuesday: 9AM-12PM Python Basics, 1PM-3PM Lab Session
Wednesday: 9AM-12PM Database Design, 1PM-3PM Project Review
Thursday: 9AM-12PM UI/UX Basics, 1PM-3PM Technical Seminar
Friday: 9AM-12PM Final Project Lab, 1PM-3PM Peer Review
`.trim();
                            }
                        } else if (template === 'offer_letter') {
                            if (!variables.jobTitle) variables.jobTitle = "Full Stack Developer Intern";
                            if (!variables.joiningDate) {
                                const twoWeeksLater = new Date();
                                twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
                                variables.joiningDate = twoWeeksLater.toLocaleDateString();
                            }
                        }

                        await testController.executeSingleEmail(target.name, target.email, template, variables);
                        results.push({ type: 'success', content: `Triggered **${template.replace('_', ' ')}** for **${target.name}**.` });
                    }
                    
                    for (const err of errors) {
                        results.push({ type: 'error', content: err });
                    }
                }
            } else if (action.action === 'query') {
                results.push({ type: 'message', content: action.message || "I've processed your request." });
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
