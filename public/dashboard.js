(function() {
    const API_BASE = '';
    const token = localStorage.getItem('adminToken');

    const state = {
        currentPage: 'overview',
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
        }
        return res.json();
    }

    const dashboard = {
        init() {
            this.bindEvents();
            this.switchPage('overview');
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
            const tpl = document.getElementById(`${page}Tpl`).content.cloneNode(true);
            container.innerHTML = '';
            container.appendChild(tpl);

            document.getElementById('pageTitle').innerText = 
                page.charAt(0).toUpperCase() + page.slice(1).replace('tpl', '');

            // Load Data
            if (page === 'overview') this.loadOverview();
            if (page === 'students') this.loadStudents();
            if (page === 'templates') this.loadTemplates();
            if (page === 'logs') this.loadLogs();
        },

        async loadOverview() {
            const result = await apiFetch('/logs');
            const tbody = document.getElementById('recentLogsList');
            tbody.innerHTML = result.slice(0, 10).map(log => `
                <tr>
                    <td>${log.recipientEmail}</td>
                    <td><span class="badge badge-warning">${log.templateType}</span></td>
                    <td><span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">${log.status}</span></td>
                    <td>${new Date(log.sentAt).toLocaleString()}</td>
                </tr>
            `).join('');
            this.refreshStats();
        },

        async refreshStats() {
            const stats = await apiFetch('/stats');
            if (document.getElementById('stat-students')) {
                document.getElementById('stat-students').innerText = stats.totalUsers || 0;
                document.getElementById('stat-delivered').innerText = stats.successCount || 0;
                document.getElementById('stat-failed').innerText = stats.failureCount || 0;
                document.getElementById('stat-scheduled').innerText = stats.pendingTasks || 0;
            }
        },

        async loadStudents() {
            showLoading();
            const students = await apiFetch('/users');
            state.students = students;
            const tbody = document.getElementById('studentTableBody');
            tbody.innerHTML = students.map(s => `
                <tr>
                    <td><b>${s.name}</b></td>
                    <td>${s.email}</td>
                    <td><span class="badge ${s.status === 'sent' ? 'badge-success' : 'badge-warning'}">${s.status || 'idle'}</span></td>
                    <td><span class="badge ${s.applicationStatus === 'active' ? 'badge-success' : 'badge-danger'}">${s.applicationStatus}</span></td>
                    <td style="display: flex; gap: 8px;">
                        <button class="btn btn-primary" style="padding: 5px 12px; font-size: 11px;" onclick="window.dashboard.openIndividualSendModal('${s._id}')">🚀 Send Mail</button>
                        <button class="btn btn-secondary" style="padding: 5px 10px;" onclick="window.dashboard.deleteStudent('${s._id}')">🗑️</button>
                    </td>
                </tr>
            `).join('');
            hideLoading();
        },

        openIndividualSendModal(id) {
            const s = state.students.find(x => x._id === id);
            if (!s) return;
            state.targetStudent = s;
            document.getElementById('targetRecipientName').innerText = s.name;
            document.getElementById('targetRecipientEmail').innerText = s.email;
            document.getElementById('individualMailType').value = '';
            document.getElementById('dynamicFieldsContainer').innerHTML = '<p style="color:var(--text-dim);">Pick a template above to see dynamic fields.</p>';
            
            showModal('individualSendModal');

            document.getElementById('sendIndividualBtn').onclick = () => this.submitIndividualSend();
        },

        updateDynamicFields() {
            const type = document.getElementById('individualMailType').value;
            const container = document.getElementById('dynamicFieldsContainer');
            if (!type) {
                container.innerHTML = '';
                return;
            }

            const fields = {
                'review_feedback': [
                    { label: 'Review Feedback', key: 'feedback', type: 'textarea' },
                    { label: 'Next Review Date', key: 'nextReviewDate', type: 'text', placeholder: 'e.g. 20th Oct 2024' }
                ],
                'offer_letter': [
                    { label: 'Job Title', key: 'jobTitle', type: 'text' },
                    { label: 'Joining Date', key: 'joiningDate', type: 'text' }
                ],
                'certificate': [
                    { label: 'Course Name', key: 'courseName', type: 'text' },
                    { label: 'Completion Date', key: 'completionDate', type: 'text' }
                ],
                'first_review': [
                    { label: 'Review Date', key: 'reviewDate', type: 'text' },
                    { label: 'Time Slot', key: 'timeSlot', type: 'text', placeholder: 'e.g. 2:00 PM - 3:00 PM' }
                ],
                'task_allocation': [
                    { label: 'Task Title', key: 'taskTitle', type: 'text' },
                    { label: 'Task Description', key: 'taskDescription', type: 'textarea' },
                    { label: 'Deadline', key: 'deadline', type: 'text' }
                ],
                'review_reminder': [
                    { label: 'Review Date', key: 'reviewDate', type: 'text' }
                ],
                'weekly_schedule': [
                    { label: 'Personalized Schedule', key: 'schedule', type: 'textarea', placeholder: 'Monday: Java...\nTuesday: Python...' }
                ],
                'hold_mail': []
            };

            const typeFields = fields[type] || [];
            if (typeFields.length === 0) {
                container.innerHTML = '<p style="color:var(--accent-emerald);">This template does not require additional data. Click send to proceed.</p>';
                return;
            }

            container.innerHTML = typeFields.map(f => `
                <div class="field-group">
                    <label>${f.label}</label>
                    ${f.type === 'textarea' 
                        ? `<textarea id="dyn_${f.key}" placeholder="${f.placeholder || ''}"></textarea>`
                        : `<input type="text" id="dyn_${f.key}" placeholder="${f.placeholder || ''}">`
                    }
                </div>
            `).join('');
        },

        async submitIndividualSend() {
            const type = document.getElementById('individualMailType').value;
            if (!type) return showToast('Please select an email type', 'error');

            confirmAction('Confirm Dispatch', `Send the ${type.replace('_', ' ')} email to ${state.targetStudent.name}?`, async () => {
                const s = state.targetStudent;
                const container = document.getElementById('dynamicFieldsContainer');
                const inputs = container.querySelectorAll('input, textarea');
                const customVariables = {};
                
                inputs.forEach(input => {
                    const key = input.id.replace('dyn_', '');
                    customVariables[key] = input.value;
                });

                showLoading();
                try {
                    const res = await apiFetch('/send-email', {
                        method: 'POST',
                        body: JSON.stringify({
                            email: s.email,
                            name: s.name,
                            templateType: type,
                            customVariables: customVariables
                        })
                    });

                    if (res.success || (typeof res === 'string' && res.includes('sent'))) {
                        closeModal('individualSendModal');
                        showToast('Email sent successfully! 🚀');
                        this.loadStudents();
                        this.refreshStats();
                    } else if (res.error || res.message) {
                        showToast('Failed to send: ' + (res.error || res.message), 'error');
                    }
                } catch (err) {
                    showToast('Communication Error: ' + err.message, 'error');
                } finally {
                    hideLoading();
                }
            });
        },

        async loadOverview() {
            const result = await apiFetch('/logs');
            const tbody = document.getElementById('recentLogsList');
            if (!tbody) return;
            
            tbody.innerHTML = result.slice(0, 10).map(log => `
                <tr>
                    <td><b>${log.recipientEmail}</b></td>
                    <td><span class="badge" style="background:rgba(255,255,255,0.05);">${log.templateType}</span></td>
                    <td><span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">${log.status}</span></td>
                    <td>${new Date(log.sentAt).toLocaleString()}</td>
                </tr>
            `).join('');
            this.refreshStats();
        },

        async submitAddStudent() {
            const name = document.getElementById('newStudentName').value;
            const email = document.getElementById('newStudentEmail').value;
            if (!name || !email) return alert('Name and Email required');

            showLoading();
            await apiFetch('/students', {
                method: 'POST',
                body: JSON.stringify({ name, email, applicationStatus: 'active' })
            });
            hideLoading();
            closeModal('addStudentModal');
            this.loadStudents();
            this.refreshStats();
        },

        async deleteStudent(id) {
            confirmAction('Delete Student', 'Are you sure you want to remove this student from the database? This cannot be undone.', async () => {
                showLoading();
                await apiFetch(`/students/${id}`, { method: 'DELETE' });
                hideLoading();
                showToast('Student deleted successfully');
                this.loadStudents();
                this.refreshStats();
            });
        },

        async loadTemplates() {
            const templates = await apiFetch('/templates');
            state.templates = templates;
            const list = document.getElementById('tplList');
            if (!list) return;

            list.innerHTML = templates.map(t => `
                <div class="nav-item ${state.selectedTemplate?._id === t._id ? 'active' : ''}" 
                     style="margin-bottom: 5px; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; cursor: pointer;" 
                     onclick="window.dashboard.selectTemplate('${t._id}')">
                    ${t.name}
                </div>
            `).join('');

            const form = document.getElementById('tplForm');
            if (!form) return;

            form.onsubmit = async (e) => {
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
                await apiFetch('/templates', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                hideLoading();
                alert('Template Configuration Synchronized! ✅');
                this.loadTemplates();
            };
        },

        selectTemplate(id) {
            const t = state.templates.find(x => x._id === id);
            state.selectedTemplate = t;
            document.getElementById('tplName').value = t.name;
            document.getElementById('tplType').value = t.type;
            document.getElementById('tplSubject').value = t.subject;
            document.getElementById('tplBody').value = t.body;
            
            const pdfSection = document.getElementById('pdfSection');
            if (t.hasAttachment || t.htmlContent) {
                pdfSection.classList.remove('hidden');
                document.getElementById('tplPdfHtml').value = t.htmlContent || '';
            } else {
                pdfSection.classList.add('hidden');
            }
            this.loadTemplates(); 
        },

        async triggerBulkHold() {
            confirmAction('Bulk Hold Distributions', 'This will send hold notifications to ALL candidates currently marked with "Hold" status. Proceed?', async () => {
                showLoading();
                try {
                    const result = await apiFetch('/send-bulk-hold', { method: 'POST' });
                    showToast(result.message);
                    this.refreshStats();
                } catch (err) {
                    showToast('Bulk trigger failed: ' + err.message, 'error');
                } finally {
                    hideLoading();
                }
            });
        },

        async triggerDailyMomentum() {
            confirmAction('Trigger Daily Distribution', 'This will immediately send the hardcoded daily email to ALL active students. Continue?', async () => {
                showLoading();
                try {
                    const result = await apiFetch('/trigger-daily-crawler', { method: 'POST' });
                    showToast(result.message || `Success! Distributed to ${result.count} students! 🚀`);
                    this.refreshStats();
                } catch (err) {
                    showToast('Manual trigger failed: ' + err.message, 'error');
                } finally {
                    hideLoading();
                }
            });
        },

        async loadLogs() {
            showLoading();
            try {
                const logs = await apiFetch('/logs');
                const tbody = document.getElementById('logsTableBody');
                if (!tbody) return;

                tbody.innerHTML = logs.map(l => `
                    <tr>
                        <td><b>${l.recipientEmail}</b></td>
                        <td><span class="badge" style="background:rgba(255,255,255,0.05);">${l.templateType}</span></td>
                        <td><span class="badge ${l.status === 'success' ? 'badge-success' : 'badge-danger'}">${l.status}</span></td>
                        <td style="color:var(--accent-rose); font-size: 11px;">${l.error || '-'}</td>
                        <td>${new Date(l.sentAt).toLocaleString()}</td>
                    </tr>
                `).join('');
            } finally {
                hideLoading();
            }
        },

        refreshAllStudents() { this.loadStudents(); }
    };

    window.dashboard = dashboard;
    window.confirmAction = confirmAction;
    window.showModal = showModal;
    window.closeModal = closeModal;
    dashboard.init();
})();
