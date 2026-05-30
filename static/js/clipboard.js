// clipboard.js
class ClipboardManager {
    constructor () {
        this.items = [];   // array of { id, type, operation } 'cut' or 'copy'
        this.operation = null;
    }

    cut(items) {
        this.items = items;
        this.operation = 'cut';
    }

    copy(items) {
        this.items = items;
        this.operation = 'copy';
    }

    async paste(targetFolderId, vfs, refreshCallback) {
        if (!this.items.length) return;
        const results = [];
        for (const item of this.items) {
            if (this.operation === 'copy') {
                const newFile = await api.post(`/files/${item.id}/copy`, { parent_id: targetFolderId });
                results.push(newFile);
            } else if (this.operation === 'cut') {
                // Move file to new parent
                const moved = await api.put(`/files/${item.id}`, { parent_id: targetFolderId });
                results.push(moved);
            }
        }
        if (this.operation === 'cut') {
            this.clear();
        }
        if (refreshCallback) await refreshCallback();
        return results;
    }

    clear() {
        this.items = [];
        this.operation = null;
    }
}

window.clipboard = new ClipboardManager();