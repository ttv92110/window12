class MailApp {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.currentFolder = 'inbox';   // 'inbox' or 'sent'
        this.currentEmailId = null;
        this.initUI();
        this.loadFolder(this.currentFolder);
    }

    initUI() {
        this.container.style.display = 'flex';
        this.container.style.height = '100%';
        this.container.innerHTML = `
            <div class="mail-sidebar" style="width:160px; background:rgba(0,0,0,0.2); padding:12px; border-right:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column;">
                <button class="folder-btn" data-folder="inbox" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:8px; border-radius:6px; margin-bottom:4px; text-align:left; cursor:pointer;">📥 Inbox</button>
                <button class="folder-btn" data-folder="sent" style="background:transparent; color:#cbd5e1; border:none; padding:8px; border-radius:6px; margin-bottom:4px; text-align:left; cursor:pointer;">📤 Sent</button>
                <button id="compose-btn-${this.win.id}" style="margin-top:auto; background:var(--accent); color:#fff; border:none; padding:8px; border-radius:6px; cursor:pointer;">✏️ Compose</button>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                <div id="mail-list-${this.win.id}" style="flex:1; overflow-y:auto; padding:8px;"></div>
                <div id="mail-preview-${this.win.id}" style="height:200px; border-top:1px solid rgba(255,255,255,0.1); padding:12px; overflow-y:auto; display:none;"></div>
            </div>
            <div id="compose-modal-${this.win.id}" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(20,20,40,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:20px; z-index:9500; width:400px;"></div>
        `;

        this.mailList = document.getElementById(`mail-list-${this.win.id}`);
        this.mailPreview = document.getElementById(`mail-preview-${this.win.id}`);
        this.composeModal = document.getElementById(`compose-modal-${this.win.id}`);

        // Folder switching
        this.container.querySelectorAll('.folder-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.container.querySelectorAll('.folder-btn').forEach(b => {
                    b.style.background = 'transparent';
                    b.style.color = '#cbd5e1';
                });
                btn.style.background = 'rgba(255,255,255,0.1)';
                btn.style.color = '#fff';
                this.currentFolder = btn.dataset.folder;
                this.loadFolder(this.currentFolder);
            });
        });

        // Compose button
        document.getElementById(`compose-btn-${this.win.id}`).addEventListener('click', () => this.openCompose());
    }

    async loadFolder(folder) {
        try {
            const emails = await api.get(`/mail/${folder}`);
            this.renderMailList(emails);
        } catch (e) {
            this.mailList.innerHTML = '<div style="color:#94a3b8; padding:20px; text-align:center;">Failed to load</div>';
        }
    }

    renderMailList(emails) {
        this.mailPreview.style.display = 'none';
        this.mailList.innerHTML = emails.length === 0 ? '<div style="color:#94a3b8; padding:20px; text-align:center;">No messages</div>' :
            emails.map(e => `
                <div class="mail-item" data-id="${e.id}" style="display:flex; align-items:center; gap:10px; padding:10px; cursor:pointer; color:${e.read === 'True' ? '#94a3b8' : '#f1f5f9'}; border-bottom:1px solid rgba(255,255,255,0.05); ${e.read === 'True' ? '' : 'font-weight:600;'}">
                    <span style="width:30px;">${e.read === 'True' ? '✉️' : '📩'}</span>
                    <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sanitize(e.subject)}</span>
                    <span style="font-size:11px; color:#64748b;">${e.sender || e.recipient}</span>
                    <button class="delete-mail-btn" data-id="${e.id}" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:12px;">✕</button>
                </div>
            `).join('');

        // Click to view
        this.mailList.querySelectorAll('.mail-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-mail-btn')) return;
                this.viewEmail(item.dataset.id);
            });
        });

        // Delete button
        this.mailList.querySelectorAll('.delete-mail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteEmail(btn.dataset.id);
            });
        });
    }

    async viewEmail(id) {
        try {
            const email = await api.get(`/mail/${id}`);
            // Mark as read if inbox
            if (this.currentFolder === 'inbox' && email.read === 'False') {
                await api.put(`/mail/${id}/read`);
            }
            this.mailPreview.style.display = 'block';
            this.mailPreview.innerHTML = `
                <div style="margin-bottom:8px;"><strong>Subject:</strong> ${sanitize(email.subject)}</div>
                <div style="margin-bottom:8px; color:#94a3b8;">From: ${sanitize(email.sender)}</div>
                <div style="white-space:pre-wrap;">${sanitize(email.body)}</div>
            `;
            // Refresh list to update read status
            this.loadFolder(this.currentFolder);
        } catch (e) {
            alert('Failed to load email');
        }
    }

    async deleteEmail(id) {
        if (await modal.confirm('Delete this email?', 'Confirm Delete')) {
            await api.delete(`/mail/${id}`);
        } 
        this.loadFolder(this.currentFolder);
    }

    openCompose() {
        this.composeModal.innerHTML = `
            <h3 style="color:#f1f5f9; margin-bottom:12px;">New Message</h3>
            <input type="text" id="recipient-input" placeholder="To: username" style="width:100%; padding:8px; margin-bottom:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;">
            <input type="text" id="subject-input" placeholder="Subject" style="width:100%; padding:8px; margin-bottom:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;">
            <textarea id="body-input" placeholder="Message" style="width:100%; padding:8px; margin-bottom:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; resize:vertical;" rows="5"></textarea>
            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button id="cancel-send-btn" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Cancel</button>
                <button id="send-btn" style="background:var(--accent); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Send</button>
            </div>
        `;
        this.composeModal.style.display = 'block';

        document.getElementById('cancel-send-btn').addEventListener('click', () => {
            this.composeModal.style.display = 'none';
        });
        document.getElementById('send-btn').addEventListener('click', async () => {
            const recipient = document.getElementById('recipient-input').value.trim();
            const subject = document.getElementById('subject-input').value.trim();
            const body = document.getElementById('body-input').value.trim();
            if (!recipient || !subject) {
                await modal.alert('Recipient and subject are required.', 'Missing Information');
                return;
            }
            try {
                await api.post('/mail/send', { recipient, subject, body });
                this.composeModal.style.display = 'none';
                alert('Message sent!');
                this.loadFolder(this.currentFolder);
            } catch (e) {
                alert('Error sending: ' + e.message);
            }
        });
    }
}