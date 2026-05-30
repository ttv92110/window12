// desktop.js – boot, clock, overlay, window manager setup, WebSocket, data loading

let currentUser;

// --- Overlay functions (used by start menu etc.) ---
function showOverlay() {
    const overlay = document.getElementById('overlay');
    const desktop = document.getElementById('desktop');
    if (overlay) overlay.classList.add('active');
    if (desktop) desktop.classList.add('blurred');
}

function hideOverlay() {
    const overlay = document.getElementById('overlay');
    const desktop = document.getElementById('desktop');
    if (overlay) overlay.classList.remove('active');
    if (desktop && !Win12.isStartMenuOpen && !Win12.isWidgetsOpen && !Win12.isNotificationsOpen) {
        desktop.classList.remove('blurred');
    }
}

window.showOverlay = showOverlay;
window.hideOverlay = hideOverlay;

// --- Boot & Unlock ---
function startBootSequence() {
    setTimeout(() => {
        if (!Win12.isLocked) return;   // already unlocked, don't show lock screen
        document.getElementById('boot-screen').classList.add('hidden');
        document.getElementById('lock-screen').classList.remove('hidden');
    }, 2000);
}

function hideBootScreen() {
    const bootScreen = document.getElementById('boot-screen');
    if (bootScreen) bootScreen.classList.add('hidden');
}
window.hideBootScreen = hideBootScreen;

function unlockSystem() {
    if (!Win12.isLocked) return;
    Win12.isLocked = false;
    document.getElementById('lock-screen').classList.add('hidden');
    document.getElementById('desktop').classList.remove('blurred');
    updateClocks();
}

window.unlockSystem = unlockSystem;

// --- Clock ---
function updateClocks() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' });
    const clockTime = document.getElementById('clock-time');
    const clockDate = document.getElementById('clock-date');
    const lockTime = document.getElementById('lock-time');
    const lockDateEl = document.getElementById('lock-date');
    if (clockTime) clockTime.textContent = timeStr;
    if (clockDate) clockDate.textContent = dateStr;
    if (lockTime) lockTime.textContent = timeStr;
    if (lockDateEl) lockDateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

setInterval(updateClocks, 10000);
updateClocks();

// --- Non‑auth initialization (after DOM ready) ---
document.addEventListener('DOMContentLoaded', () => {
    // Desktop right‑click context menu actions
    const newFolderBtn = document.querySelector('[data-action="new-folder"]');
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', () => {
            const name = prompt('Folder name');
            if (name) createNewFolder(name);
        });
    }
    const newFileBtn = document.querySelector('[data-action="new-file"]');
    if (newFileBtn) {
        newFileBtn.addEventListener('click', () => {
            const name = prompt('File name');
            if (name) createNewFile(name);
        });
    }

    // Task View button
    const btnTaskView = document.getElementById('btn-taskview');
    if (btnTaskView) btnTaskView.addEventListener('click', toggleTaskView);

    // Setup window manager
    setupWindowManager(
        document.getElementById('windows-container'),
        document.getElementById('taskbar-apps')
    );
});

document.addEventListener('keydown', async (e) => {
    if (Win12.isLocked) return;
    if (e.target.closest('input, textarea')) return; // ignore if typing

    const activeExplorer = document.querySelector('.window-content[data-app="explorer"] .explorer-files');
    if (!activeExplorer) return;

    const selected = activeExplorer.querySelector('.explorer-file.selected'); // aapko selection implement karna hoga
    const fileId = selected?.dataset.id;

    if (e.ctrlKey && e.key === 'x') { // Cut
        if (fileId) window.clipboard?.cut([fileId]);
        e.preventDefault();
    } else if (e.ctrlKey && e.key === 'c') { // Copy
        if (fileId) window.clipboard?.copy([fileId]);
        e.preventDefault();
    } else if (e.ctrlKey && e.key === 'v') { // Paste
        const currentFolderId = getCurrentFolderId(activeExplorer);
        await window.clipboard?.paste(currentFolderId);
        e.preventDefault();
    } else if (e.key === 'Delete') {
        if (fileId) deleteFile(fileId);
        e.preventDefault();
    } else if (e.key === 'F2') {
        if (fileId) renameFile(fileId);
        e.preventDefault();
    }
});

// --- WebSocket ---
function connectWebSocket() {
    if (!authToken) return;
    const wsUrl = `ws://${location.host}/ws/notifications?token=${encodeURIComponent(authToken)}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (e) { }
    };
    ws.onclose = () => setTimeout(() => { if (authToken) connectWebSocket(); }, 5000);
}

function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'notification':
            showToast(message.data.title, message.data.message);
            if (Win12.isNotificationsOpen && typeof loadNotifications === 'function') loadNotifications();
            break;
        case 'file_change':
            refreshAllExplorers();
            break;
        case 'note_change':
            refreshAllNotesWindows();
            break;
        case 'settings_changed':
            if (typeof loadSettings === 'function') loadSettings();
            break;
    }
}

function refreshAllExplorers() {
    document.querySelectorAll('.window-content[data-app="explorer"]').forEach(container => {
        const winId = container.dataset.windowId;
        const state = Win12.explorerState.get(winId);
        if (state && state.vfs) {
            api.get('/files/').then(files => {
                state.vfs.refresh(files);
                renderExplorerView(container, state.vfs, state.currentFolderId);
            });
        } else {
            loadFilesIntoExplorer(container);
        }
    });
}

function refreshAllNotesWindows() {
    document.querySelectorAll('.window-content[data-app="notepad"]').forEach(container => {
        loadNotesIntoWindow(container);
    });
}

// --- Backend data (called by auth-ui.js after login) ---
async function initBackendData() {
    await restoreWorkspaces();
    loadFilesIntoExplorerWindows();
    loadSettings();
    loadIconPositions();
    loadPinnedApps();
    initWidgets();
    initSystemTray();
    loadNotifications();
    loadInstalledApps();
}

async function loadFilesIntoExplorerWindows() {
    const files = await api.get('/files/');
    document.querySelectorAll('.window-content[data-app="explorer"]').forEach(container => {
        container.innerHTML = renderFileList(files);
    });
}

function renderFileList(files) {
    if (!files.length) return '<div style="text-align:center;color:#94a3b8;padding:20px;">This folder is empty</div>';
    return files.map(f => `
        <div class="explorer-file" data-id="${f.id}" data-type="${f.type}">
            <div class="file-icon">${f.type === 'folder' ? '📁' : '📄'}</div>
            <div class="file-name">${sanitize(f.name)}</div>
        </div>
    `).join('');
}

async function createNewFolder(name) {
    await api.post('/files/', { name, type: 'folder', parent_id: 'root' });
    loadFilesIntoExplorerWindows();
}

async function createNewFile(name) {
    await api.post('/files/', { name, type: 'file', parent_id: 'root', content: '' });
    loadFilesIntoExplorerWindows();
}

async function loadSettings() {
    try {
        const s = await api.get('/settings/');
        if (s && Object.keys(s).length > 0) applySettings(s);
    } catch (e) { }
}

async function loadNotifications() {
    try {
        const notifs = await api.get('/notifications/');
        const panel = document.getElementById('notif-list');
        if (panel) panel.innerHTML = notifs.map(n => `
            <div class="notification-item"><strong>${sanitize(n.title)}</strong><p>${sanitize(n.message)}</p></div>
        `).join('');
    } catch (e) { }
}

async function loadInstalledApps() {
    try {
        const apps = await api.get('/apps/');
        const grid = document.getElementById('start-apps-grid');
        if (!grid) return;
        const coreApps = [
            { app_name: 'store', display_name: 'App Store', icon: '🛒', color: '#14b8a6' },
            { app_name: 'settings', display_name: 'Settings', icon: '⚙️', color: '#6b7280' },
            { app_name: 'explorer', display_name: 'File Explorer', icon: '📁', color: '#f59e0b' }
        ];
        const installedMap = new Map();
        apps.forEach(a => installedMap.set(a.app_name, a));
        coreApps.forEach(c => { if (!installedMap.has(c.app_name)) installedMap.set(c.app_name, c); });
        const allApps = Array.from(installedMap.values());
        grid.innerHTML = allApps.map(a => {
            const appDef = startMenuApps.find(def => def.app === a.app_name) || {};
            const icon = appDef.icon || a.icon || '📦';
            const color = appDef.color || a.color || '#60a5fa';
            return `<div class="start-app-item" data-app="${a.app_name}"><div class="app-icon" style="background:${color};color:#fff;">${icon}</div><div class="app-name">${a.display_name || a.app_name}</div></div>`;
        }).join('');
        grid.querySelectorAll('.start-app-item').forEach(item => {
            item.addEventListener('click', () => {
                openApp(item.dataset.app);
                closeStartMenu();
            });
        });
    } catch (e) { }
}

async function restoreWorkspaces() {
    try {
        const settings = await api.get('/settings/');
        if (settings.workspaces) {
            const parsed = JSON.parse(settings.workspaces);
            if (Array.isArray(parsed) && parsed.length > 0) {
                Win12.workspaces = parsed;
                Win12.currentWorkspaceIndex = 0;
                const curWindows = parsed[0].windows.map(w => ({ ...w, _el: null }));
                Win12.windows = curWindows;
                curWindows.forEach(w => renderWindow(w));
                updateTaskbarApps();
                return;
            }
        }
        initWorkspaces();
    } catch (e) {
        initWorkspaces();
    }
}

function showToast(title, message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = 'position:fixed;bottom:80px;right:20px;background:rgba(0,0,0,0.8);color:#fff;padding:12px 20px;border-radius:12px;z-index:9999;';
    toast.innerHTML = `<strong>${sanitize(title)}</strong><p>${sanitize(message)}</p>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Start boot
startBootSequence();