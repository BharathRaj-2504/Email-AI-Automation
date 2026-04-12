document.addEventListener('DOMContentLoaded', () => {
    const addUserForm = document.getElementById('addUserForm');
    const userList = document.getElementById('userList');
    const bulkEmailBtn = document.getElementById('bulkEmailBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const statusMessage = document.getElementById('statusMessage');
    const scheduledList = document.getElementById('scheduledList');
    
    // Scheduling UI Elements
    const scheduleSingle = document.getElementById('scheduleSingle');
    const singleTimeGroup = document.getElementById('singleTimeGroup');
    const singleTime = document.getElementById('singleTime');
    const submitBtnText = document.getElementById('submitBtnText');

    const scheduleBulk = document.getElementById('scheduleBulk');
    const bulkTimeGroup = document.getElementById('bulkTimeGroup');
    const bulkTime = document.getElementById('bulkTime');
    const bulkBtnText = document.getElementById('bulkBtnText');

    // Toggle Schedulers
    scheduleSingle.addEventListener('change', () => {
        singleTimeGroup.classList.toggle('hidden', !scheduleSingle.checked);
        submitBtnText.textContent = scheduleSingle.checked ? 'Schedule Welcome Email 📅' : 'Add & Send Welcome Email';
    });

    scheduleBulk.addEventListener('change', () => {
        bulkTimeGroup.classList.toggle('hidden', !scheduleBulk.checked);
        bulkBtnText.textContent = scheduleBulk.checked ? '🚀 Schedule Bulk Campaign 📅' : '🚀 Trigger Bulk Email Campaign';
    });

    // Fetch and display users
    const fetchUsers = async () => {
        try {
            const response = await fetch('/users');
            const users = await response.json();
            
            userList.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td><span class="status-badge">Active</span></td>
                `;
                userList.appendChild(tr);
            });
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    // Fetch and display scheduled emails
    const fetchSchedules = async () => {
        try {
            const response = await fetch('/scheduled-emails');
            const tasks = await response.json();
            
            scheduledList.innerHTML = '';
            if (tasks.length === 0) {
                scheduledList.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-dim);">No pending tasks</td></tr>';
                return;
            }

            tasks.forEach(task => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span class="status-badge" style="background:rgba(74, 144, 226, 0.1); color:var(--primary);">${task.recipientType}</span></td>
                    <td>${task.recipientEmail || 'All Members'}</td>
                    <td>${task.subject}</td>
                    <td>${new Date(task.scheduledAt).toLocaleString()}</td>
                `;
                scheduledList.appendChild(tr);
            });
        } catch (error) {
            console.error('Error fetching schedules:', error);
        }
    };

    const refreshAll = () => {
        fetchUsers();
        fetchSchedules();
    };

    // Show status message
    const showStatus = (message, type) => {
        statusMessage.textContent = message;
        statusMessage.className = `status-box ${type}`;
        statusMessage.classList.remove('hidden');
        
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 5000);
    };

    // Toggle loading state
    const setLoading = (btnId, isLoading) => {
        const btn = document.getElementById(btnId);
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.loader');
        
        if (isLoading) {
            btn.disabled = true;
            text.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            btn.disabled = false;
            text.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    };

    // Add User Form Submission
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const scheduledAt = scheduleSingle.checked ? singleTime.value : null;

        if (scheduleSingle.checked && !scheduledAt) {
            showStatus('Please select a date and time for scheduling', 'error');
            setLoading('submitBtn', false);
            return;
        }

        setLoading('submitBtn', true);

        try {
            const response = await fetch('/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, scheduledAt })
            });

            if (response.ok) {
                showStatus(scheduledAt ? 'Email scheduled successfully! 📅' : 'User added and welcome email sent!', 'success');
                addUserForm.reset();
                singleTimeGroup.classList.add('hidden');
                submitBtnText.textContent = 'Add & Send Welcome Email';
                refreshAll();
            } else {
                showStatus('Failed to process request', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showStatus('An unexpected error occurred', 'error');
        } finally {
            setLoading('submitBtn', false);
        }
    });

    // Bulk Email Campaign
    bulkEmailBtn.addEventListener('click', async () => {
        const scheduledAt = scheduleBulk.checked ? bulkTime.value : null;
        
        if (scheduleBulk.checked && !scheduledAt) {
            showStatus('Please select a date and time for the campaign', 'error');
            return;
        }

        const confirmMsg = scheduledAt 
            ? `Schedule this campaign for ${new Date(scheduledAt).toLocaleString()}?`
            : 'Are you sure you want to trigger a bulk email campaign to all users right now?';

        if (!confirm(confirmMsg)) return;

        setLoading('bulkEmailBtn', true);
        showStatus(scheduledAt ? '📅 Scheduling campaign...' : '🚀 Campaign started. Sending emails...', 'success');

        try {
            const response = await fetch('/send-bulk-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: 'Exclusive Update for You 🚀',
                    message: 'We have some exciting news to share! Check out the attached PDF for more details.',
                    scheduledAt
                })
            });

            const result = await response.json();

            if (response.ok) {
                showStatus(result.message, 'success');
                if (scheduledAt) {
                    scheduleBulk.checked = false;
                    bulkTimeGroup.classList.add('hidden');
                    bulkBtnText.textContent = '🚀 Trigger Bulk Email Campaign';
                    fetchSchedules();
                }
            } else {
                showStatus(result.message || 'Bulk email operation failed', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showStatus('Failed to connect to the server', 'error');
        } finally {
            setLoading('bulkEmailBtn', false);
        }
    });

    // Refresh list
    refreshBtn.addEventListener('click', () => {
        refreshAll();
    });

    // Initial Load
    refreshAll();
});
