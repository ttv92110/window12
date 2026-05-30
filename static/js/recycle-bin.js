class RecycleBinApp {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.loadItems();
    }

    async loadItems() {
        const items = await api.get('/trash/');
        this.render(items);
    }

    render(items) {
        this.container.innerHTML = `
            <div style="padding: 16px;">
                <h3>🗑️ Recycle Bin</h3>
                <button id="empty-trash" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:6px; margin-bottom:12px;">Empty Trash</button>
                <div id="trash-list"></div>
            </div>
        `;
        const listDiv = this.container.querySelector('#trash-list');
        if (items.length === 0) {
            listDiv.innerHTML = '<div style="color:#94a3b8;">Trash is empty</div>';
        } else {
            listDiv.innerHTML = items.map(item => `
                <div class="trash-item" data-id="${item.id}" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid rgba(255,255,255,0.1);">
                    <span>${item.original_type === 'folder' ? '📁' : '📄'} ${sanitize(item.original_name)}</span>
                    <div>
                        <button class="restore-btn" data-id="${item.id}" style="background:var(--accent); color:#fff; border:none; padding:4px 12px; border-radius:4px;">Restore</button>
                        <button class="delete-forever" data-id="${item.id}" style="background:#ef4444; color:#fff; border:none; padding:4px 12px; border-radius:4px;">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        this.container.querySelector('#empty-trash')?.addEventListener('click', async () => {
            if (await modal.confirm('Empty Recycle Bin? This action cannot be undone.')) {
                await api.delete('/trash/empty');
                this.loadItems();
            }
        });
        this.container.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.dataset.id;
                await api.post(`/trash/restore/${id}`);
                this.loadItems();
            });
        });
        this.container.querySelectorAll('.delete-forever').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (await modal.confirm('Permanently delete this item?')) {
                    await api.delete(`/trash/${btn.dataset.id}`);
                    this.loadItems();
                }
            });
        });
    }
}