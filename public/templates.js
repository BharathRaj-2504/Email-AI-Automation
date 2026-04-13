document.addEventListener('DOMContentLoaded', () => {
    const templateList = document.getElementById('templateList');
    const templateForm = document.getElementById('templateForm');
    const pdfEditorSection = document.getElementById('pdfEditorSection');
    const statusMessage = document.getElementById('statusMessage');
    const logoutBtn = document.getElementById('logoutBtn');

    // Inputs
    const tplName = document.getElementById('tplName');
    const tplType = document.getElementById('tplType');
    const tplSubject = document.getElementById('tplSubject');
    const tplBody = document.getElementById('tplBody');
    const tplHasAttachment = document.getElementById('tplHasAttachment');
    const tplPdfHtml = document.getElementById('tplPdfHtml');
    
    // Previews
    const bodyPreview = document.getElementById('bodyPreview');
    const pdfPreview = document.getElementById('pdfPreview');

    let currentTemplates = [];
    let activeTemplateType = null;

    // --- Authentication Helpers ---
    const getHeaders = () => {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        };
    };

    const handleAuthError = async (res) => {
        if (res.status === 401) {
            localStorage.removeItem('adminToken');
            window.location.href = '/login.html';
            return true;
        }
        return false;
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = '/login.html';
        });
    }

    // --- State Management ---
    const fetchTemplates = async () => {
        try {
            const res = await fetch('/templates', { headers: getHeaders() });
            if (await handleAuthError(res)) return;

            const data = await res.json();
            currentTemplates = data;
            renderTemplateList();
        } catch (err) {
            console.error('Fetch templates failed', err);
        }
    };

    const renderTemplateList = () => {
        templateList.innerHTML = '';
        if (currentTemplates.length === 0) {
            templateList.innerHTML = '<p style="text-align:center; color:var(--text-dim); padding:20px;">No templates found.</p>';
            return;
        }

        currentTemplates.forEach(tpl => {
            const div = document.createElement('div');
            div.className = `template-item ${activeTemplateType === tpl.type ? 'active' : ''}`;
            div.innerHTML = `
                <h3>${tpl.name}</h3>
                <span>Type: ${tpl.type} ${tpl.hasAttachment ? '📎' : ''}</span>
            `;
            div.addEventListener('click', () => selectTemplate(tpl));
            templateList.appendChild(div);
        });
    };

    const selectTemplate = (tpl) => {
        activeTemplateType = tpl.type;
        tplName.value = tpl.name;
        tplType.value = tpl.type;
        tplSubject.value = tpl.subject;
        tplBody.value = tpl.body;
        tplHasAttachment.checked = tpl.hasAttachment;
        tplPdfHtml.value = tpl.htmlContent || '';

        togglePdfSection();
        updatePreview();
        renderTemplateList();
        
        // Disable type editing for existing templates to prevent key collision issues
        // (upsert based on type)
        tplType.disabled = true;
    };

    const resetForm = () => {
        activeTemplateType = null;
        templateForm.reset();
        tplType.disabled = false;
        togglePdfSection();
        updatePreview();
        renderTemplateList();
    };

    const togglePdfSection = () => {
        pdfEditorSection.classList.toggle('hidden', !tplHasAttachment.checked);
    };

    const updatePreview = () => {
        // Body Preview
        bodyPreview.innerHTML = tplBody.value.replace(/\n/g, '<br>');
        
        // PDF Preview
        pdfPreview.innerHTML = tplPdfHtml.value;
    };

    // --- Event Listeners ---
    tplHasAttachment.addEventListener('change', togglePdfSection);
    tplBody.addEventListener('input', updatePreview);
    tplPdfHtml.addEventListener('input', updatePreview);
    
    document.getElementById('newTemplateBtn').addEventListener('click', resetForm);

    templateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveBtn');
        const loader = saveBtn.querySelector('.loader');
        const btnText = saveBtn.querySelector('.btn-text');

        saveBtn.disabled = true;
        loader.classList.remove('hidden');
        btnText.classList.add('hidden');

        const payload = {
            type: tplType.value,
            name: tplName.value,
            subject: tplSubject.value,
            body: tplBody.value,
            htmlContent: tplPdfHtml.value,
            hasAttachment: tplHasAttachment.checked
        };

        try {
            const res = await fetch('/templates', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            if (await handleAuthError(res)) return;

            if (res.ok) {
                showStatus('Template saved successfully! ✅', 'success');
                await fetchTemplates();
            } else {
                showStatus('Failed to save template ❌', 'error');
            }
        } catch (err) {
            showStatus('Error connecting to server', 'error');
        } finally {
            saveBtn.disabled = false;
            loader.classList.add('hidden');
            btnText.classList.remove('hidden');
        }
    });

    const showStatus = (msg, type) => {
        statusMessage.textContent = msg;
        statusMessage.className = `status-box ${type}`;
        statusMessage.classList.remove('hidden');
        setTimeout(() => statusMessage.classList.add('hidden'), 5000);
    };

    // Initialize
    fetchTemplates();
});
