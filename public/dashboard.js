(function() {
    const API_BASE = '';
    const token = localStorage.getItem('adminToken');

    const state = {
        currentPage: 'dashboard',
        students: [],
        templates: [],
        logs: [],
        selectedTemplate: null
    };

    // UI Helpers
    const showLoading = () => document.getElementById('loadingIndicator').style.display = 'flex';
    const hideLoading = () => document.getElementById('loadingIndicator').style.display = 'none';

    const showModal = (id) => document.getElementById(id).style.display = 'flex';
    const closeModal = (id) => document.getElementById(id).style.display = 'none';

    const showToast = (message, type = 'success') => {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✅' : '❌'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    };

    const confirmAction = (title, message, callback) => {
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalMessage').innerText = message;
        document.getElementById('confirmActionBtn').onclick = () => {
            closeModal('confirmModal');
            callback();
        };
        showModal('confirmModal');
    };

    async function apiFetch(endpoint, options = {}) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        const res = await fetch(endpoint, options);
        
        if (res.status === 401) {
            localStorage.removeItem('adminToken');
            window.location.href = '/login.html';
            return;
        }

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return res.json();
        } else {
            const text = await res.text();
            return { success: false, message: text || `Server Error (${res.status})` };
        }
    }

    const dashboard = {
        init() {
            this.bindEvents();
            this.switchPage('dashboard');
            this.refreshStats();
        },

        bindEvents() {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const page = e.currentTarget.dataset.page;
                    if (page) this.switchPage(page);
                });
            });

            document.getElementById('logoutBtn').addEventListener('click', () => {
                localStorage.removeItem('adminToken');
                window.location.href = '/login.html';
            });
        },

        async switchPage(page) {
            state.currentPage = page;
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.toggle('active', nav.dataset.page === page);
            });

            const container = document.getElementById('viewContainer');
            const template = document.getElementById(`${page}Tpl`);
            if (!template) return;

            const content = template.content.cloneNode(true);
            container.innerHTML = '';
            container.appendChild(content);

            // Update Page Title
            const labels = {
                'dashboard': 'AI Command Center',
                'students': 'Student Database',
                'actions': 'Automation Workflows',
                'templates': 'Template Configuration',
                'logs': 'Execution History'
            };
            document.getElementById('pageTitle').innerText = labels[page] || page;

            // Page Specific Logic
            if (page === 'dashboard') {
                this.refreshStats();
                this.loadDashboardActivity();
                this.initAiChat();
            }
            if (page === 'students') this.loadStudents();
            if (page === 'templates') this.loadTemplates();
            if (page === 'logs') this.loadLogs();
        },

        async refreshStats() {
            try {
                const stats = await apiFetch('/stats');
                const update = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.innerText = val || 0;
                };
                update('stat-students', stats.totalUsers);
                update('stat-delivered', stats.successCount);
                update('stat-failed', stats.failureCount);
                update('stat-scheduled', stats.pendingTasks);
            } catch (e) {}
        },

        async loadDashboardActivity() {
            const logs = await apiFetch('/logs');
            const container = document.getElementById('recentLogsList');
            if (!container) return;

            container.innerHTML = logs.slice(0, 5).map(l => `
                <div class="log-entry-compact">
                    <div class="top">
                        <span class="email">${l.recipientEmail}</span>
                        <span class="status" style="color:${l.status === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">${l.status.toUpperCase()}</span>
                    </div>
                    <div style="opacity:0.6; font-size:10px;">${l.templateType} • ${new Date(l.sentAt).toLocaleTimeString()}</div>
                </div>
            `).join('');
        },

        // --- AI CHAT LOGIC ---
        initAiChat() {
            const input = document.getElementById('aiChatInput');
            const btn = document.getElementById('sendAiChat');
            if (!input || !btn) return;

            const sendMessage = () => {
                const text = input.value.trim();
                if (text) {
                    this.sendChatMessage(text);
                    input.value = '';
                }
            };

            input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
            btn.onclick = sendMessage;

            // Hints binding
            document.querySelectorAll('.chat-hints span').forEach(hint => {
                hint.onclick = () => {
                    input.value = hint.innerText;
                    input.focus();
                };
            });
        },

        async sendChatMessage(message) {
            this.addChatMessage('user', message);
            
            try {
                const res = await apiFetch('/ai/chat', {
                    method: 'POST',
                    body: JSON.stringify({ message })
                });

                if (res.success && res.results) {
                    res.results.forEach(result => {
                        let type = 'system';
                        if (result.type === 'success') type = 'ai-result';
                        if (result.type === 'error') type = 'ai-error';
                        
                        let content = result.content;
                        if (result.type === 'clarification' && result.options) {
                            content += `<div class="clarification-options">
                                ${result.options.map(opt => `
                                    <button class="btn-option" onclick="window.dashboard.sendChatMessage('I mean ${opt.label}')">
                                        🔘 ${opt.label}
                                    </button>
                                `).join('')}
                            </div>`;
                        }
                        
                        this.addChatMessage(type, content);
                        if (result.type === 'success') {
                            this.refreshStats();
                            this.loadDashboardActivity();
                        }
                    });
                }
            } catch (err) {
                this.addChatMessage('ai-error', 'Connectivity issue: ' + err.message);
            }
        },

        addChatMessage(type, content) {
            const container = document.getElementById('chatMessages');
            if (!container) return;
            const div = document.createElement('div');
            div.className = `message ${type}`;
            div.innerHTML = content;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        },

        // --- STUDENT MANAGEMENT ---
        async loadStudents() {
            showLoading();
            try {
                const students = await apiFetch('/users');
                state.students = students;
                const tbody = document.getElementById('studentTableBody');
                if (tbody) {
                    tbody.innerHTML = students.map(s => `
                        <tr>
                            <td><b>${s.name}</b></td>
                            <td>${s.email}</td>
                            <td><span class="badge ${s.applicationStatus === 'active' ? 'badge-success' : 'badge-danger'}">${s.applicationStatus}</span></td>
                            <td>
                                <button class="btn btn-primary" style="padding:4px 10px; font-size:11px;" onclick="window.dashboard.openIndividualSendModal('${s._id}')">🚀 Send</button>
                                <button class="btn btn-secondary" style="padding:4px 10px;" onclick="window.dashboard.deleteStudent('${s._id}')">🗑️</button>
                            </td>
                        </tr>
                    `).join('');
                }
            } finally { hideLoading(); }
        },

        openIndividualSendModal(id) {
            const s = state.students.find(x => x._id === id);
            if (!s) return;
            state.targetStudent = s;
            document.getElementById('targetRecipientName').innerText = s.name;
            document.getElementById('targetRecipientEmail').innerText = s.email;
            showModal('individualSendModal');
            document.getElementById('sendIndividualBtn').onclick = () => this.submitIndividualSend();
        },

        updateDynamicFields() {
            const type = document.getElementById('individualMailType').value;
            const container = document.getElementById('dynamicFieldsContainer');
            const fields = {
                'review_feedback': [{ label: 'Feedback', key: 'feedback', type: 'textarea' }, { label: 'Date', key: 'nextReviewDate', type: 'text' }],
                'offer_letter': [{ label: 'Role', key: 'jobTitle', type: 'text' }, { label: 'Date', key: 'joiningDate', type: 'text' }],
                'certificate': [{ label: 'Course', key: 'courseName', type: 'text' }, { label: 'Date', key: 'completionDate', type: 'text' }]
            };
            const active = fields[type] || [];
            container.innerHTML = active.map(f => `
                <div class="field-group">
                    <label>${f.label}</label>
                    ${f.type === 'textarea' ? `<textarea id="dyn_${f.key}"></textarea>` : `<input type="text" id="dyn_${f.key}">`}
                </div>
            `).join('') || '<p style="opacity:0.5;">No extra fields required.</p>';
        },

        async submitIndividualSend() {
            const type = document.getElementById('individualMailType').value;
            if (!type) return;
            const customVariables = {};
            document.querySelectorAll('#dynamicFieldsContainer input, #dynamicFieldsContainer textarea').forEach(i => {
                customVariables[i.id.replace('dyn_', '')] = i.value;
            });

            showLoading();
            try {
                await apiFetch('/send-email', {
                    method: 'POST',
                    body: JSON.stringify({ email: state.targetStudent.email, name: state.targetStudent.name, templateType: type, customVariables })
                });
                closeModal('individualSendModal');
                showToast('Dispatched! 🚁');
                this.refreshStats();
            } finally { hideLoading(); }
        },

        async deleteStudent(id) {
            confirmAction('Delete', 'Remove candidate?', async () => {
                showLoading();
                await apiFetch(`/students/${id}`, { method: 'DELETE' });
                this.loadStudents();
                this.refreshStats();
                hideLoading();
            });
        },

        async submitAddStudent() {
            const name = document.getElementById('newStudentName').value;
            const email = document.getElementById('newStudentEmail').value;
            showLoading();
            try {
                await apiFetch('/students', { method: 'POST', body: JSON.stringify({ name, email, applicationStatus: 'active' }) });
                closeModal('addStudentModal');
                this.loadStudents();
                this.refreshStats();
            } finally { hideLoading(); }
        },

        // --- TEMPLATES ---
        async loadTemplates() {
            const tpls = await apiFetch('/templates');
            state.templates = tpls;
            document.getElementById('tplList').innerHTML = tpls.map(t => `
                <div class="tpl-item ${state.selectedTemplate?._id === t._id ? 'active' : ''}" onclick="window.dashboard.selectTemplate('${t._id}')">
                    ${t.name}
                </div>
            `).join('');

            document.getElementById('tplForm').onsubmit = async (e) => {
                e.preventDefault();
                const data = {
                    type: document.getElementById('tplType').value,
                    name: document.getElementById('tplName').value,
                    subject: document.getElementById('tplSubject').value,
                    body: document.getElementById('tplBody').value,
                    htmlContent: document.getElementById('tplPdfHtml').value,
                    hasAttachment: !!document.getElementById('tplPdfHtml').value
                };
                showLoading();
                await apiFetch('/templates', { method: 'POST', body: JSON.stringify(data) });
                this.loadTemplates();
                hideLoading();
            };
        },

        selectTemplate(id) {
            const t = state.templates.find(x => x._id === id);
            state.selectedTemplate = t;
            document.getElementById('tplName').value = t.name;
            document.getElementById('tplType').value = t.type;
            document.getElementById('tplSubject').value = t.subject;
            document.getElementById('tplBody').value = t.body;
            document.getElementById('pdfSection').classList.toggle('hidden', !t.htmlContent);
            if (t.htmlContent) document.getElementById('tplPdfHtml').value = t.htmlContent;
            
            // Update active state in UI without full reload
            document.querySelectorAll('.tpl-item').forEach(el => {
                el.classList.toggle('active', el.innerText.trim() === t.name);
            });
        },

        // --- EXTRAS ---
        async triggerBulkHold() {
            confirmAction('Confirm', 'Trigger bulk hold?', async () => {
                showLoading();
                await apiFetch('/send-bulk-hold', { method: 'POST' });
                this.refreshStats();
                hideLoading();
            });
        },

        async triggerDailyMomentum() {
            confirmAction('Run', 'Execute daily crawler?', async () => {
                showLoading();
                await apiFetch('/trigger-daily-crawler', { method: 'POST' });
                this.refreshStats();
                hideLoading();
            });
        },

        async loadLogs() {
            showLoading();
            const logs = await apiFetch('/logs');
            const tbody = document.getElementById('logsTableBody');
            if (tbody) {
                tbody.innerHTML = logs.map(l => `
                    <tr>
                        <td><b>${l.recipientEmail}</b></td>
                        <td>${l.templateType}</td>
                        <td><span class="badge ${l.status === 'success' ? 'badge-success' : 'badge-danger'}">${l.status}</span></td>
                        <td>${new Date(l.sentAt).toLocaleString()}</td>
                    </tr>
                `).join('');
            }
            hideLoading();
        }
    };

    window.dashboard = dashboard;
    window.showModal = showModal;
    window.closeModal = closeModal;
    dashboard.init();
})();
