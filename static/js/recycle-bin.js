// recycle-bin.js – Recycle bin management and UI

class RecycleBinApp {
    constructor(container, window) {
        this.container = container;
        this.window = window;
        this.init();
    }
    
    async init() {
        await this.render();
        this.attachEvents();
    }
    
    async render() {
        try {
            const files = await api.get('/files/');
            const vfs = new VirtualFileSystem(files);
            
            // Get only soft-deleted files (parent_id === 'recycle_bin')
            const recycleBinItems = files.filter(f => f.parent_id === 'recycle_bin');
            
            if (recycleBinItems.length === 0) {
                this.container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🗑️</div>
                        <div style="font-size: 18px; color: #cbd5e1; margin-bottom: 8px;">Recycle Bin is Empty</div>
                        <div style="font-size: 13px;">No deleted items yet</div>
                    </div>
                `;
                return;
            }
            
            // Build recycle bin view
            const itemsHTML = recycleBinItems.map(item => `
                <div class="recycle-item" data-id="${item.id}" data-type="${item.type}">
                    <div class="recycle-icon">${item.type === 'folder' ? '📁' : '📄'}</div>
                    <div class="recycle-details">
                        <div class="recycle-name">${sanitize(item.name)}</div>
                        <div class="recycle-meta">
                            Type: ${item.type} • Deleted: ${new Date(item.updated_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="recycle-actions">
                        <button class="restore-btn" title="Restore">↶ Restore</button>
                        <button class="delete-btn" title="Permanently Delete">🗑️ Delete</button>
                    </div>
                </div>
            `).join('');
            
            this.container.innerHTML = `
                <div style="padding: 16px; height: 100%; overflow-y: auto; background: rgba(0, 0, 0, 0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 8px;">
                        <h3 style="margin: 0; color: #f1f5f9; font-size: 16px;">
                            🗑️ Recycle Bin (${recycleBinItems.length} item${recycleBinItems.length !== 1 ? 's' : ''})
                        </h3>
                        <button id="empty-bin-btn" style="
                            padding: 6px 12px;
                            background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: 500;
                        ">Empty Recycle Bin</button>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${itemsHTML}
                    </div>
                </div>
            `;
            
            this.recycleBinItems = recycleBinItems;
            this.vfs = vfs;
        } catch (e) {
            console.error('Error loading recycle bin:', e);
            this.container.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:20px;">Error loading recycle bin</div>`;
        }
    }
    
    attachEvents() {
        // Restore buttons
        this.container.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const itemEl = btn.closest('.recycle-item');
                const fileId = itemEl.dataset.id;
                await this.restoreFile(fileId);
            });
        });
        
        // Delete buttons
        this.container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const itemEl = btn.closest('.recycle-item');
                const fileId = itemEl.dataset.id;
                await this.deleteFilePermanently(fileId);
            });
        });
        
        // Empty recycle bin button
        const emptyBtn = this.container.querySelector('#empty-bin-btn');
        if (emptyBtn) {
            emptyBtn.addEventListener('click', () => this.emptyRecycleBin());
        }
    }
    
    async restoreFile(fileId) {
        try {
            const result = await Win12.confirm(
                'Restore File?',
                `Are you sure you want to restore this file from the recycle bin?`
            );
            
            if (result === 'yes') {
                await api.put(`/files/${fileId}`, { parent_id: 'root' });
                Win12.addHistory('restore', [{ id: fileId }], { fromRecycleBin: true });
                await this.render();
                this.attachEvents();
                await Win12.alert('Success', 'File restored successfully');
            }
        } catch (err) {
            console.error('Restore error:', err);
            await Win12.error('Restore Failed', `Could not restore file: ${err.message}`);
        }
    }
    
    async deleteFilePermanently(fileId) {
        try {
            const result = await Win12.confirm(
                'Permanently Delete?',
                `This file will be permanently deleted and cannot be recovered. Continue?`,
                '⚠️'
            );
            
            if (result === 'yes') {
                await api.delete(`/files/${fileId}`);
                Win12.addHistory('permanent_delete', [{ id: fileId }]);
                await this.render();
                this.attachEvents();
            }
        } catch (err) {
            console.error('Delete error:', err);
            await Win12.error('Delete Failed', `Could not delete file: ${err.message}`);
        }
    }
    
    async emptyRecycleBin() {
        try {
            const result = await Win12.confirm(
                'Empty Recycle Bin?',
                `All items in the recycle bin will be permanently deleted. This cannot be undone. Continue?`,
                '⚠️'
            );
            
            if (result === 'yes') {
                // Backend should implement empty_recycle_bin endpoint
                const response = await api.post('/files/recycle/empty');
                Win12.addHistory('empty_recycle_bin', [], { itemsDeleted: response.count });
                await this.render();
                this.attachEvents();
                await Win12.alert('Success', `Permanently deleted ${response.count || 'all'} item(s)`);
            }
        } catch (err) {
            console.error('Empty recycle bin error:', err);
            await Win12.error('Error', `Failed to empty recycle bin: ${err.message}`);
        }
    }
}

async function deleteFile(fileId) {
    const result = await modal.show({
        title: 'Delete',
        message: 'Move this item to Recycle Bin?',
        buttons: [
            { text: 'Yes', value: 'yes', primary: true },
            { text: 'No', value: 'no' }
        ]
    });
    if (result.button === 'yes') {
        await api.delete(`/files/${fileId}`);
        refreshCurrentExplorer(container);
    }
}
// Style for recycle bin items
if (!document.getElementById('recycle-bin-styles')) {
    const style = document.createElement('style');
    style.id = 'recycle-bin-styles';
    style.textContent = `
        .recycle-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .recycle-item:hover {
            background: rgba(30, 41, 59, 0.9);
            border-color: rgba(139, 92, 246, 0.3);
        }
        
        .recycle-icon {
            font-size: 24px;
            flex-shrink: 0;
        }
        
        .recycle-details {
            flex: 1;
            min-width: 0;
        }
        
        .recycle-name {
            color: #f1f5f9;
            font-size: 13px;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .recycle-meta {
            color: #94a3b8;
            font-size: 11px;
            margin-top: 2px;
        }
        
        .recycle-actions {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }
        
        .restore-btn, .delete-btn {
            padding: 6px 10px;
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid rgba(139, 92, 246, 0.3);
            color: #cbd5e1;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        
        .restore-btn:hover {
            background: rgba(34, 197, 94, 0.2);
            border-color: rgba(34, 197, 94, 0.5);
            color: #22c55e;
        }
        
        .delete-btn:hover {
            background: rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.5);
            color: #ef4444;
        }
    `;
    document.head.appendChild(style);
}
