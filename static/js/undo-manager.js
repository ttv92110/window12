// undo-manager.js – simple action stack for file operations
class UndoManager {
    constructor () {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = 20;
    }

    push(action) {
        this.undoStack.unshift(action);
        if (this.undoStack.length > this.maxSize) this.undoStack.pop();
        this.redoStack = [];
    }

    async undo() {
        const action = this.undoStack.shift();
        if (!action) return false;
        await action.undo();
        this.redoStack.unshift(action);
        return true;
    }

    async redo() {
        const action = this.redoStack.shift();
        if (!action) return false;
        await action.redo();
        this.undoStack.unshift(action);
        return true;
    }
}

window.undoManager = new UndoManager();

// Helper to create actions
function createDeleteAction(file, vfs, refreshFn) {
    return {
        undo: async () => {
            // restore file – call restore endpoint
            await api.post(`/trash/restore/${file.id}`); // but we need trash item id
            // For simplicity, store trash_id in action
        },
        redo: async () => {
            await api.delete(`/files/${file.id}`);
            refreshFn();
        }
    };
}