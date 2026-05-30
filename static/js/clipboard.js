class ClipboardManager {
    constructor () {
        this.items = []; // { fileId, action: 'cut' or 'copy' }
        this.action = null;
    }
    cut(fileIds) { this.items = fileIds; this.action = 'cut'; }
    copy(fileIds) { this.items = fileIds; this.action = 'copy'; }
    async paste(targetParentId) {
        if (!this.items.length) return;
        if (this.action === 'cut') {
            for (let id of this.items) {
                await api.put(`/files/${id}`, { parent_id: targetParentId });
            }
            this.items = [];
        } else if (this.action === 'copy') {
            for (let id of this.items) {
                await api.post(`/files/${id}/copy`, { parent_id: targetParentId });
            }
            this.items = [];
        }
        refreshAllExplorers();
    }
}
window.clipboard = new ClipboardManager();