class DashboardApp {
    constructor() {
        this.viewContainer = document.getElementById('viewContainer');
        this.pageTitle = document.getElementById('pageTitle');
        this.navItems = document.querySelectorAll('.nav-item');
        this.activePage = 'overview';
        this.templates = [];
        
        this.init();
    }

    init() {
        // Create toast container if not exists
        if (!document.getElementById('toast-container')) {
            const tc = document.createElement('div');
            tc.id = 'toast-container';
            document.body.appendChild(tc);
        }

        this.setupNavigation();
        this.loadPage('overview');
        this.setupLogout();
        
        window.dashboard = this;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast fade-in`;
        
        const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    setLoading(btn, isLoading, text = 'Processing...') {
        if (!btn) return;
        if (isLoading) {
            btn.setAttribute('data-original', btn.innerHTML);
            btn.disabled = true;
            btn.innerHTML = `<div class="loader"></div> <span>${text}</span>`;
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.getAttribute('data-original');
        }
    }

    setupNavigation() {
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                if (page) {
                    this.navItems.forEach(ni => ni.classList.remove('active'));
                    item.classList.add('active');
                    this.loadPage(page);
                }
            });
        });
    }

    setupLogout() {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = '/login.html';
        });
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        };
    }

    async handleResponse(res) {
        if (res.status === 401) {
            window.location.href = '/login.html';
            return null;
        }
        return res.json();
    }

    async loadPage(page) {
        this.activePage = page;
        this.pageTitle.innerText = this.getPageTitle(page);
        
        const template = document.getElementById(`${page}Tpl`);
        this.viewContainer.innerHTML = '';
        this.viewContainer.appendChild(template.content.cloneNode(true));

        switch(page) {
            case 'overview': this.loadOverview(); break;
            case 'students': this.loadStudents(); break;
            case 'templates': this.loadTemplates(); break;
            case 'logs': this.loadLogs(); break;
        }
    }

    getPageTitle(page) {
        const titles = { 'overview': 'System Overview', 'students': 'Student Records', 'templates': 'Template Strategy', 'logs': 'Automation History' };
        return titles[page] || 'MailFlow Pro';
    }

    renderEmptyState(containerId, message, icon = '📂') {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <tr><td colspan="100%">
                <div class="empty-state fade-in">
                    <div class="icon">${icon}</div>
                    <div style="font-weight:600; color:var(--text-main);">${message}</div>
                    <div style="font-size:0.85rem; color:var(--text-dim);">Everything is looking calm here.</div>
                </div>
            </td></tr>
        `;
    }

    async loadOverview() {
        const stats = await this.handleResponse(await fetch('/stats', { headers: this.getHeaders() }));
        if (!stats) return;

        document.getElementById('stat-users').innerText = stats.totalUsers;
        document.getElementById('stat-delivered').innerText = stats.successCount;
        document.getElementById('stat-failed').innerText = stats.failureCount;

        // Fetch automation engine status
        const configs = await this.handleResponse(await fetch('/cron-configs', { headers: this.getHeaders() }));
        if (configs) {
            const weekly = configs.find(c => c.key === 'weekly_schedule');
            if (weekly) {
                const statusEl = document.getElementById('automationStatus');
                const scheduleEl = document.getElementById('weeklyCronSchedule');
                
                scheduleEl.innerText = weekly.schedule;
                statusEl.innerText = weekly.enabled ? 'Active' : 'Paused';
                statusEl.className = `badge ${weekly.enabled ? 'badge-success' : 'badge-fail'}`;
            }
        }

        const logs = await this.handleResponse(await fetch('/logs', { headers: this.getHeaders() }));
        const list = document.getElementById('recentLogsList');
        
        if (!logs || logs.length === 0) {
            this.renderEmptyState('recentLogsList', 'No recent automation activity');
            return;
        }

        list.innerHTML = logs.slice(0, 10).map(log => `
            <tr class="fade-in">
                <td><div style="font-weight:600;">${log.recipientEmail}</div></td>
                <td><span class="badge" style="background:rgba(255,255,255,0.03); color:var(--text-dim);">${log.templateType}</span></td>
                <td><span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-fail'}">${log.status}</span></td>
                <td style="color:var(--text-dim); font-size:0.8rem;">${new Date(log.sentAt).toLocaleString()}</td>
            </tr>
        `).join('');
    }

    async loadStudents() {
        const users = await this.handleResponse(await fetch('/users', { headers: this.getHeaders() }));
        const body = document.getElementById('studentTableBody');
        
        if (!users || users.length === 0) {
            this.renderEmptyState('studentTableBody', 'No students found in audience', '🎓');
            return;
        }

        body.innerHTML = users.map(user => `
            <tr class="fade-in">
                <td><div style="font-weight:600;">${user.name}</div></td>
                <td style="color:var(--text-dim); font-size:0.85rem;">${user.email}</td>
                <td>
                    <span class="badge ${user.applicationStatus === 'selected' ? 'badge-success' : (user.applicationStatus === 'hold' ? 'badge-pending' : 'badge-info')}" 
                          style="cursor:pointer;" 
                          onclick="dashboard.changeUserStatus('${user._id}', '${user.applicationStatus}')"
                          title="Click to toggle status">
                        ${user.applicationStatus || 'active'}
                    </span>
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <textarea id="feedback-${user._id}" placeholder="Automation notes..." style="height:60px; font-size:0.85rem; padding:10px;">${user.metadata?.feedback || ''}</textarea>
                        <input type="date" id="date-${user._id}" value="${user.metadata?.nextReviewDate || ''}" style="font-size:0.8rem; padding:8px;">
                    </div>
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="btn btn-primary" id="btn-complete-${user._id}" style="width:100%; justify-content:center; font-size:0.75rem;" onclick="dashboard.markComplete('${user._id}', false)">
                            ${user.reviewCompleted ? 'Update Strategy' : 'Confirm & Send'}
                        </button>
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap:8px;">
                            <button class="btn btn-secondary" style="width:100%; justify-content:center; font-size:0.75rem;" onclick="dashboard.sendTaskAllocation('${user._id}')" title="Allocate Project Task">🚀</button>
                            <button class="btn btn-secondary" style="width:100%; justify-content:center; font-size:0.75rem;" onclick="dashboard.sendFirstReview('${user._id}')" title="Schedule First Review">📅</button>
                            <button class="btn btn-secondary" style="width:100%; justify-content:center; font-size:0.75rem;" onclick="dashboard.sendOfferLetter('${user._id}')" title="Offer Letter">📄</button>
                            
                            <button class="btn btn-secondary" style="width:100%; justify-content:center; font-size:0.75rem;" onclick="dashboard.sendCertificate('${user._id}')" title="Graduate Certificate">🎓</button>
                            <button class="btn btn-secondary" style="width:100%; justify-content:center; font-size:0.75rem;" onclick="dashboard.sendHoldMail('${user._id}')" title="Hold Notification">⏸️</button>
                            <button class="btn btn-fail" style="width:100%; justify-content:center; font-size:0.75rem; background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.2);" onclick="dashboard.deleteUser('${user._id}')">🗑️</button>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async markComplete(userId, force = false) {
        const btn = document.getElementById(`btn-complete-${userId}`);
        const feedback = document.getElementById(`feedback-${userId}`).value;
        const nextReviewDate = document.getElementById(`date-${userId}`).value;

        if (!feedback) {
            this.showToast("Feedback content is required", "error");
            return;
        }

        this.setLoading(btn, true, force ? "Resending..." : "Processing...");

        try {
            const res = await fetch('/mark-review-complete', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ userId, feedback, nextReviewDate, forceResend: force })
            });

            const data = await this.handleResponse(res);
            if (data && data.success) {
                this.showToast(data.message, "success");
                this.loadStudents();
            } else {
                throw new Error(data?.error || "Automation error");
            }
        } catch (err) {
            this.showToast(err.message, "error");
        } finally {
            this.setLoading(btn, false);
        }
    }

    async sendOfferLetter(userId) {
        if (!confirm("Are you sure you want to generate and send the Offer Letter PDF?")) return;

        this.showToast("Preparing Offer Letter...", "info");

        try {
            const res = await fetch('/trigger-offer-letter', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ userId })
            });

            const data = await this.handleResponse(res);
            if (data && data.success) {
                this.showToast(data.message, "success");
            } else {
                throw new Error(data?.error || "Offer generation failed");
            }
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async sendCertificate(userId) {
        if (!confirm("Are you sure you want to generate and send the Achievement Certificate PDF?")) return;

        this.showToast("Generating Certificate...", "info");

        try {
            const res = await fetch('/trigger-certificate', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ userId })
            });

            const data = await this.handleResponse(res);
            if (data && data.success) {
                this.showToast(data.message, "success");
            } else {
                throw new Error(data?.error || "Certificate generation failed");
            }
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async sendFirstReview(userId) {
        if (!confirm("Are you sure you want to send the First Review schedule notification?")) return;

        this.showToast("Scheduling Review...", "info");

        try {
            const res = await fetch('/trigger-first-review', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ userId })
            });

            const data = await this.handleResponse(res);
            if (data && data.success) {
                this.showToast(data.message, "success");
            } else {
                throw new Error(data?.error || "Scheduling failed");
            }
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async sendTaskAllocation(userId) {
        if (!confirm("Are you sure you want to generate and send the Task Briefing PDF?")) return;
        this.showToast("Allocating Task...", "info");

        try {
            const res = await fetch('/trigger-task-allocation', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ userId })
            });

            const data = await this.handleResponse(res);
            if (data && data.success) {
                this.showToast(data.message, "success");
            } else {
                throw new Error(data?.error || "Task briefing failed");
            }
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async sendHoldMail(userId) {
        if (!confirm("Are you sure you want to put this application on HOLD and notify the candidate?")) return;
        this.showToast("Updating Status & Notifying...", "info");

        try {
            const res = await fetch('/trigger-hold-mail', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ userId })
            });

            const data = await this.handleResponse(res);
            if (data && data.success) {
                this.showToast(data.message, "success");
                this.loadStudents();
            } else {
                throw new Error(data?.error || "Hold failed");
            }
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async changeUserStatus(userId, currentStatus) {
        const statuses = ["active", "hold", "selected"];
        const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];

        try {
            const res = await fetch(`/users/${userId}/status`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({ status: nextStatus })
            });

            if (res.ok) {
                this.showToast(`Status updated to ${nextStatus}`, "success");
                this.loadStudents();
            }
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async deleteUser(id) {
        if(!confirm("Are you sure you want to remove this student?")) return;
        try {
            const res = await fetch(`/users/${id}`, { 
                method: 'DELETE',
                headers: this.getHeaders()
            });
            if(res.ok) {
                this.showToast("Student profile removed", "success");
                this.loadStudents();
            }
        } catch(err) {
            this.showToast(err.message, "error");
        }
    }

    async loadTemplates() {
        this.templates = await this.handleResponse(await fetch('/templates', { headers: this.getHeaders() }));
        const list = document.getElementById('tplList');
        list.innerHTML = this.templates.map(tpl => `
            <div class="nav-item ${this.activeTpl === tpl.type ? 'active' : ''}" style="margin-bottom:8px;" onclick="dashboard.selectTemplate('${tpl.type}')">
                📄 ${tpl.name}
            </div>
        `).join('');

        const form = document.getElementById('tplForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const payload = {
                type: document.getElementById('tplType').value,
                name: document.getElementById('tplName').value,
                subject: document.getElementById('tplSubject').value,
                body: document.getElementById('tplBody').value,
                htmlContent: document.getElementById('tplPdfHtml').value,
                hasAttachment: document.getElementById('tplHasAttachment').checked
            };
            
            this.setLoading(btn, true, "Saving...");
            try {
                const res = await fetch('/templates', {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    this.showToast("Template Strategy Updated", "success");
                    this.loadTemplates();
                } else {
                    throw new Error("Failed to save template");
                }
            } catch (err) {
                this.showToast(err.message, "error");
            } finally {
                this.setLoading(btn, false);
            }
        };

        document.getElementById('tplHasAttachment').onchange = (e) => {
            document.getElementById('pdfContentSection').classList.toggle('hidden', !e.target.checked);
        };
    }

    selectTemplate(type) {
        this.activeTpl = type;
        this.loadTemplates();
        const tpl = this.templates.find(t => t.type === type);
        document.getElementById('tplType').value = tpl.type;
        document.getElementById('tplName').value = tpl.name;
        document.getElementById('tplSubject').value = tpl.subject;
        document.getElementById('tplBody').value = tpl.body;
        document.getElementById('tplPdfHtml').value = tpl.htmlContent || '';
        document.getElementById('tplHasAttachment').checked = tpl.hasAttachment;
        document.getElementById('pdfContentSection').classList.toggle('hidden', !tpl.hasAttachment);
    }

    async loadLogs() {
        const logs = await this.handleResponse(await fetch('/logs', { headers: this.getHeaders() }));
        const body = document.getElementById('logsTableBody');
        
        if (!logs || logs.length === 0) {
            this.renderEmptyState('logsTableBody', 'No automation history found');
            return;
        }

        body.innerHTML = logs.map(l => `
            <tr class="fade-in">
                <td><div style="font-weight:600;">${l.recipientEmail}</div></td>
                <td><span class="badge" style="background:rgba(255,255,255,0.03);">${l.templateType}</span></td>
                <td><span class="badge ${l.status === 'success' ? 'badge-success' : 'badge-fail'}">${l.status}</span></td>
                <td style="color:var(--accent-red); font-size:0.75rem; max-width:200px;">${l.error || '-'}</td>
                <td style="color:var(--text-dim); font-size:0.85rem;">${new Date(l.sentAt).toLocaleString()}</td>
            </tr>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardApp();
});
