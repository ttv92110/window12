class RecycleBinApp {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.loadTrash();
    }
    async loadTrash() {
        const items = await api.get('/trash/');
        this.render(items);
    }
    render(items) {
        this.container.innerHTML = `
            <div class="toolbar"><button id="empty-trash">Empty Trash</button></div>
            <div class="trash-items">${items.map(item => `
                <div class="trash-item" data-id="${item.id}">
                    <span>${item.original_type === 'folder' ? '📁' : '📄'} ${item.original_name}</span>
                    <span>${new Date(item.deleted_at).toLocaleString()}</span>
                    <button class="restore-btn">Restore</button>
                    <button class="delete-forever">Delete Forever</button>
                </div>
            `).join('')}</div>
        `;
        this.attachEvents();
    }
    attachEvents() {
        document.getElementById('empty-trash')?.addEventListener('click', async () => {
            await api.delete('/trash/empty');
            this.loadTrash();
        });
        document.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('.trash-item').dataset.id;
                await api.post(`/trash/restore/${id}`);
                this.loadTrash();
            });
        });
        // similar for delete-forever
    }
}