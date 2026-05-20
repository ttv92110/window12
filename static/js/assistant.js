class AIAssistant {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.initUI();
        this.loadHistory();
    }

    initUI() {
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.innerHTML = `
            <div id="chat-output-${this.win.id}" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; background:#0c0c0c;"></div>
            <div style="display:flex; padding:12px; border-top:1px solid rgba(255,255,255,0.1); background:#111;">
                <input type="text" id="chat-input-${this.win.id}" placeholder="Ask me anything..." style="flex:1; padding:10px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:8px; outline:none;">
                <button id="send-btn-${this.win.id}" style="margin-left:8px; background:var(--accent); color:#fff; border:none; padding:10px 16px; border-radius:8px; cursor:pointer;">Send</button>
            </div>
            <button id="clear-history-${this.win.id}" style="position:absolute; top:10px; right:10px; background:rgba(255,255,255,0.1); color:#fff; border:none; padding:4px 10px; border-radius:4px; font-size:10px; cursor:pointer;">Clear</button>
        `;

        this.chatOutput = document.getElementById(`chat-output-${this.win.id}`);
        this.chatInput = document.getElementById(`chat-input-${this.win.id}`);

        document.getElementById(`send-btn-${this.win.id}`).addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById(`clear-history-${this.win.id}`).addEventListener('click', () => this.clearHistory());
    }

    async loadHistory() {
        try {
            const history = await api.get('/assistant/history');
            this.chatOutput.innerHTML = '';
            history.forEach(msg => {
                this.appendMessage(msg.role, msg.content);
            });
        } catch (e) {
            this.appendMessage('assistant', 'Hello! I am your Windows 12 AI Assistant. How can I help you?');
        }
    }

    appendMessage(role, text) {
        const bubble = document.createElement('div');
        bubble.style.cssText = `max-width:80%; padding:10px 14px; border-radius:12px; ${role === 'user' ?
                'align-self:flex-end; background:var(--accent); color:#fff;' :
                'align-self:flex-start; background:rgba(255,255,255,0.1); color:#e2e8f0;'
            }`;
        bubble.textContent = text;
        this.chatOutput.appendChild(bubble);
        this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
    }

    async sendMessage() {
        const prompt = this.chatInput.value.trim();
        if (!prompt) return;
        this.appendMessage('user', prompt);
        this.chatInput.value = '';
        try {
            const res = await api.post('/assistant/chat', { prompt });
            this.appendMessage('assistant', res.reply);
        } catch (e) {
            this.appendMessage('assistant', 'Sorry, I encountered an error.');
        }
    }

    async clearHistory() {
        await api.delete('/assistant/history');
        this.chatOutput.innerHTML = '';
        this.appendMessage('assistant', 'History cleared. How can I assist you?');
    }
}