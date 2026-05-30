// globals.js – shared state for the entire OS with advanced features

window.Win12 = {
    // Window management
    windows: [],
    windowIdCounter: 1,
    highestZIndex: 100,
    activeWindowId: null,

    // System state
    isLocked: true,
    bootComplete: false,
    isStartMenuOpen: false,
    isWidgetsOpen: false,
    isNotificationsOpen: false,
    explorerState: new Map(),
    workspaces: [],
    currentWorkspaceIndex: 0,
    taskViewActive: false,
    snapEnabled: true,
    SNAP_THRESHOLD: 20,
    currentUser: null,

    // ==================== FILE ASSOCIATION ENGINE ====================
    // Global application registry mapping file extensions to handlers
    appRegistry: {
        '.txt': { app: 'notepad', icon: '📝', handler: 'openFileInNotepad' },
        '.json': { app: 'notepad', icon: '📝', handler: 'openFileInNotepad' },
        '.xml': { app: 'notepad', icon: '📝', handler: 'openFileInNotepad' },
        '.csv': { app: 'notepad', icon: '📝', handler: 'openFileInNotepad' },
        '.md': { app: 'notepad', icon: '📝', handler: 'openFileInNotepad' },
        '.html': { app: 'browser', icon: '🌐', handler: 'openFileInBrowser' },
        '.js': { app: 'notepad', icon: '📝', handler: 'openFileInNotepad' },
        '.css': { app: 'notepad', icon: '📝', handler: 'openFileInNotepad' },
        '.png': { app: 'photos', icon: '🖼️', handler: 'openFileInPhotos' },
        '.jpg': { app: 'photos', icon: '🖼️', handler: 'openFileInPhotos' },
        '.jpeg': { app: 'photos', icon: '🖼️', handler: 'openFileInPhotos' },
        '.gif': { app: 'photos', icon: '🖼️', handler: 'openFileInPhotos' },
        '.mp4': { app: 'video', icon: '🎬', handler: 'openFileInVideoPlayer' },
        '.webm': { app: 'video', icon: '🎬', handler: 'openFileInVideoPlayer' },
        '.mp3': { app: 'music', icon: '🎵', handler: 'openFileInMusic' },
        '.wav': { app: 'music', icon: '🎵', handler: 'openFileInMusic' },
        '.pdf': { app: 'pdf', icon: '📄', handler: 'openFileInPDF' },
    },

    // Get app handler for a file by extension or mime type
    getAppForFile: function (file) {
        if (!file) return null;
        const ext = (file.extension || '').toLowerCase();
        return this.appRegistry[ext] || this.appRegistry['.txt'];
    },

    // ==================== CLIPBOARD ENGINE ====================
    clipboard: {
        action: null, // 'copy' or 'cut'
        files: [], // Array of file objects
        originalParentIds: {}, // Map file_id -> original_parent_id for cut operations
    },

    // Clipboard API methods
    copyToClipboard: function (files) {
        this.clipboard.action = 'copy';
        this.clipboard.files = [...files];
        this.clipboard.originalParentIds = {};
        console.log(`📋 Copied ${files.length} file(s) to clipboard`);
    },

    cutToClipboard: function (files) {
        this.clipboard.action = 'cut';
        this.clipboard.files = [...files];
        this.clipboard.originalParentIds = {};
        files.forEach(f => {
            this.clipboard.originalParentIds[f.id] = f.parent_id;
        });
        console.log(`✂️ Cut ${files.length} file(s) to clipboard`);
    },

    clearClipboard: function () {
        this.clipboard.action = null;
        this.clipboard.files = [];
        this.clipboard.originalParentIds = {};
    },

    // ==================== UNDO/REDO HISTORY ENGINE ====================
    historyStack: [],
    historyIndex: -1,
    MAX_HISTORY_ITEMS: 50,

    // Add action to history
    addHistory: function (action, targetFiles, metadata = {}) {
        // Remove any redo history after current index
        this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);

        const historyItem = {
            action, // 'copy', 'cut', 'paste', 'delete', 'move', 'rename', 'create'
            targetFiles: JSON.parse(JSON.stringify(targetFiles)), // Deep copy
            metadata, // originalName, newName, targetParentId, etc.
            timestamp: new Date().getTime(),
        };

        this.historyStack.push(historyItem);
        this.historyIndex = this.historyStack.length - 1;

        // Keep history size bounded
        if (this.historyStack.length > this.MAX_HISTORY_ITEMS) {
            this.historyStack.shift();
            this.historyIndex--;
        }
    },

    canUndo: function () {
        return this.historyIndex >= 0;
    },

    canRedo: function () {
        return this.historyIndex < this.historyStack.length - 1;
    },

    // ==================== MODAL DIALOG ENGINE ====================
    // Central modal rendering system
    showModal: function (config) {
        return new Promise((resolve) => {
            const {
                title = 'Dialog',
                message = '',
                icon = '❓',
                buttons = [{ label: 'OK', value: 'ok' }],
                className = '',
                onClose = null,
            } = config;

            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(4px);
            `;

            // Create modal dialog
            const modal = document.createElement('div');
            modal.className = `modal-dialog ${className}`;
            modal.style.cssText = `
                background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
                backdrop-filter: blur(10px) saturate(180%);
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 32px rgba(139, 92, 246, 0.1);
                padding: 24px;
                max-width: 420px;
                min-width: 300px;
                animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            `;

            // Header with icon
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            `;
            const iconEl = document.createElement('span');
            iconEl.textContent = icon;
            iconEl.style.cssText = 'font-size: 28px;';
            const titleEl = document.createElement('h2');
            titleEl.textContent = title;
            titleEl.style.cssText = `
                color: #f1f5f9;
                font-size: 18px;
                font-weight: 600;
                margin: 0;
                flex: 1;
            `;
            header.appendChild(iconEl);
            header.appendChild(titleEl);

            // Message body
            const messageEl = document.createElement('div');
            messageEl.className = 'modal-message';
            messageEl.textContent = message;
            messageEl.style.cssText = `
                color: #cbd5e1;
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 20px;
                white-space: pre-wrap;
                word-break: break-word;
            `;

            // Button container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 24px;
            `;

            // Create buttons
            buttons.forEach((btnConfig) => {
                const btn = document.createElement('button');
                btn.textContent = btnConfig.label;
                btn.value = btnConfig.value;
                btn.className = `modal-btn ${btnConfig.value === 'ok' || btnConfig.value === 'yes' ? 'primary' : 'secondary'}`;
                btn.style.cssText = `
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    ${btnConfig.value === 'ok' || btnConfig.value === 'yes' ? `
                        background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
                        color: white;
                    ` : `
                        background: rgba(148, 163, 184, 0.1);
                        color: #cbd5e1;
                        border: 1px solid rgba(148, 163, 184, 0.2);
                    `}
                `;
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.opacity = '0.9';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.opacity = '1';
                });
                btn.addEventListener('click', () => {
                    overlay.remove();
                    if (onClose) onClose(btnConfig.value);
                    resolve(btnConfig.value);
                });
                buttonContainer.appendChild(btn);
            });

            // Assemble modal
            modal.appendChild(header);
            modal.appendChild(messageEl);
            modal.appendChild(buttonContainer);
            overlay.appendChild(modal);

            // Close on ESC key
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', handleEsc);
                    const defaultBtn = buttons[buttons.length - 1];
                    if (onClose) onClose(defaultBtn?.value || 'cancel');
                    resolve(defaultBtn?.value || 'cancel');
                }
            };
            document.addEventListener('keydown', handleEsc);

            // Add to DOM
            document.body.appendChild(overlay);

            // Add animation keyframes if not already present
            if (!document.getElementById('modal-animations')) {
                const style = document.createElement('style');
                style.id = 'modal-animations';
                style.textContent = `
                    @keyframes modalSlideIn {
                        from {
                            opacity: 0;
                            transform: scale(0.95) translateY(-20px);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1) translateY(0);
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        });
    },

    // Common modal types
    alert: function (title, message, icon = 'ℹ️') {
        return this.showModal({
            title,
            message,
            icon,
            buttons: [{ label: 'OK', value: 'ok' }],
        });
    },

    confirm: function (title, message, icon = '❓') {
        return this.showModal({
            title,
            message,
            icon,
            buttons: [
                { label: 'Yes', value: 'yes' },
                { label: 'Cancel', value: 'cancel' },
            ],
        });
    },

    warn: function (title, message) {
        return this.showModal({
            title,
            message,
            icon: '⚠️',
            buttons: [{ label: 'OK', value: 'ok' }],
        });
    },

    error: function (title, message) {
        return this.showModal({
            title,
            message,
            icon: '❌',
            buttons: [{ label: 'OK', value: 'ok' }],
        });
    },
};