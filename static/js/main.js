// main.js – Complete window manager, taskbar, clock, start menu, overlay, context menu
const explorerState = new Map(); // key: window id, value: { currentFolderId, vfs }

const bootScreen = document.getElementById('boot-screen');
const lockScreen = document.getElementById('lock-screen');
const desktop = document.getElementById('desktop');
const overlay = document.getElementById('overlay');
const startMenu = document.getElementById('start-menu');
const widgetsPanel = document.getElementById('widgets-panel');
const notificationPanel = document.getElementById('notification-panel');
const contextMenu = document.getElementById('context-menu');
const windowsContainer = document.getElementById('windows-container');
const taskbarApps = document.getElementById('taskbar-apps');
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');
const lockTime = document.getElementById('lock-time');
const lockDateEl = document.getElementById('lock-date');
const btnStart = document.getElementById('btn-start');
const btnSearch = document.getElementById('btn-search');
const btnWidgets = document.getElementById('btn-widgets');
const btnNotifications = document.getElementById('btn-notifications');
const startSearchInput = document.getElementById('start-search-input');
const startAppsGrid = document.getElementById('start-apps-grid'); 

let windows = [];
let windowIdCounter = 1;
let highestZIndex = 100;
let activeWindowId = null;
let isStartMenuOpen = false;
let isWidgetsOpen = false;
let isNotificationsOpen = false;
let isLocked = true;
let bootComplete = false;
const SNAP_THRESHOLD = 20;

// --- Start Menu Apps ---
const startMenuApps = [
    { name: 'File Explorer', icon: '📁', app: 'explorer', color: '#f59e0b' },
    { name: 'Edge Browser', icon: '🌐', app: 'browser', color: '#3b82f6' },
    { name: 'Settings', icon: '⚙️', app: 'settings', color: '#6b7280' },
    { name: 'Notepad', icon: '📝', app: 'notepad', color: '#10b981' },
    { name: 'Calculator', icon: '🧮', app: 'calculator', color: '#8b5cf6' },
    { name: 'Photos', icon: '🖼️', app: 'gallery', color: '#ec4899' },
    { name: 'Music Player', icon: '🎵', app: 'music', color: '#06b6d4' },
    { name: 'Video', icon: '🎬', app: 'video', color: '#ef4444' },
    { name: 'Store', icon: '🛒', app: 'store', color: '#14b8a6' },
    { name: 'App Store', icon: '🛒', app: 'store', color: '#14b8a6' },
    { name: 'Terminal', icon: '💻', app: 'terminal', color: '#1e293b' },
    { name: 'Calendar', icon: '📅', app: 'calendar', color: '#f97316' },
    { name: 'Weather', icon: '☁️', app: 'weather', color: '#0ea5e9' },
    { name: 'Mail', icon: '📧', app: 'mail', color: '#3b82f6' },
    { name: 'Paint', icon: '🎨', app: 'paint', color: '#ec4899' },
    { name: 'AI Assistant', icon: '🤖', app: 'assistant', color: '#8b5cf6' }
    
];


const btnTaskView = document.getElementById('btn-taskview');
if (btnTaskView) {
    btnTaskView.addEventListener('click', toggleTaskView);
}

function sanitize(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
function populateStartMenu() {
    startAppsGrid.innerHTML = '';
    startMenuApps.forEach(app => {
        const div = document.createElement('div');
        div.className = 'start-app-item';
        div.innerHTML = `<div class="app-icon" style="background:${app.color};color:#fff;">${app.icon}</div><div class="app-name">${app.name}</div>`;
        div.addEventListener('click', () => {
            openApp(app.app);
            closeStartMenu();
        });
        startAppsGrid.appendChild(div);
    });
}
populateStartMenu();

// --- Clock ---
function updateClocks() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' });
    const longDateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    clockTime.textContent = timeStr;
    clockDate.textContent = dateStr;
    if (lockTime) lockTime.textContent = timeStr;
    if (lockDateEl) lockDateEl.textContent = longDateStr;
}
updateClocks();
setInterval(updateClocks, 10000);

// --- Boot ---
function startBootSequence() {
    setTimeout(() => {
        bootScreen.classList.add('hidden');
        lockScreen.classList.remove('hidden');
        isLocked = true;
    }, 2000);
}

// --- Unlock ---
function unlockSystem() {
    if (!isLocked) return;
    isLocked = false;
    lockScreen.classList.add('hidden');
    desktop.classList.remove('blurred');
    updateClocks();
}
// ============================
// VIRTUAL DESKTOPS (WORKSPACES)
// ============================
let workspaces = [];               // array of workspace objects
let currentWorkspaceIndex = 0;    // 0‑based index
let taskViewActive = false;

// Each workspace has: { id: string, name: string, windows: array of window objects }
// The global `windows` array will always reflect the current workspace’s windows.
// We'll sync `windows` with `workspaces[currentWorkspaceIndex].windows`.

function initWorkspaces() {
    // If no workspaces exist, create a default one
    if (workspaces.length === 0) {
        const defaultWs = {
            id: generateId(),
            name: 'Desktop 1',
            windows: []
        };
        workspaces.push(defaultWs);
    }
    // Load the windows of the first workspace (or the last saved index)
    loadWorkspaceWindows(currentWorkspaceIndex);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function loadWorkspaceWindows(index) {
    // Remove all existing window DOM elements
    document.querySelectorAll('.window').forEach(el => el.remove());
    // Replace global `windows` array with the workspace's windows
    windows = workspaces[index].windows.map(w => ({ ...w })); // shallow copy for reactivity
    // Re‑render all windows
    windows.forEach(w => {
        // we need to re‑render them; we'll call renderWindow but it expects a win object
        // To avoid duplicates, we need a proper re‑creation.
    });
    // Actually, we’ll implement a complete workspace switch that clears and rebuilds.
    switchToWorkspace(index);
}

function switchToWorkspace(index) {
    // Save current workspace windows
    workspaces[currentWorkspaceIndex].windows = windows.map(w => ({ ...w }));
    // Clear DOM
    windowsContainer.innerHTML = '';
    // Set new index
    currentWorkspaceIndex = index;
    // Load new workspace windows
    windows = workspaces[index].windows.map(w => ({ ...w }));
    // Render each window
    windows.forEach(w => {
        w._el = null; // force re‑creation
        // renderWindow(w);
    });
    updateTaskbarApps();
    // Update workspace indicator if any
}

function addWorkspace(name = 'New Desktop') {
    const newWs = {
        id: generateId(),
        name: name,
        windows: []
    };
    workspaces.push(newWs);
    switchToWorkspace(workspaces.length - 1);
    saveWorkspaces();
}

function removeWorkspace(index) {
    if (workspaces.length <= 1) return;
    workspaces.splice(index, 1);
    if (currentWorkspaceIndex >= workspaces.length) {
        currentWorkspaceIndex = workspaces.length - 1;
    }
    switchToWorkspace(currentWorkspaceIndex);
    saveWorkspaces();
}

async function saveWorkspaces() {
    // Prepare workspaces data for storage
    const data = workspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        windows: ws.windows.map(w => ({
            id: w.id,
            appType: w.appType,
            title: w.title,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
            isMinimized: w.isMinimized,
            isMaximized: w.isMaximized,
            zIndex: w.zIndex
        }))
    }));
    const workspacesJson = JSON.stringify(data);
    // Also save current workspace's windows as windows_layout for compatibility
    const currentWindows = windows.map(w => ({
        id: w.id,
        appType: w.appType,
        title: w.title,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        isMinimized: w.isMinimized,
        isMaximized: w.isMaximized,
        zIndex: w.zIndex
    }));
    const windowsLayoutJson = JSON.stringify(currentWindows);

    try {
        await api.put('/settings/', {
            windows_layout: windowsLayoutJson,
            workspaces: workspacesJson
        });
    } catch (e) {
        console.error('Failed to save workspace', e);
    }
}
// Overlay
function showOverlay() { overlay.classList.add('active'); desktop.classList.add('blurred'); }
function hideOverlay() { overlay.classList.remove('active'); if (!isStartMenuOpen && !isWidgetsOpen && !isNotificationsOpen) desktop.classList.remove('blurred'); }

// Start menu
function openStartMenu() { isStartMenuOpen = true; startMenu.classList.add('open'); showOverlay(); btnStart.classList.add('active-app'); startSearchInput.value = ''; startSearchInput.focus(); }
function closeStartMenu() { isStartMenuOpen = false; removeSearchResults(); startMenu.classList.remove('open'); btnStart.classList.remove('active-app'); hideOverlay(); }
function toggleStartMenu() { if (isStartMenuOpen) closeStartMenu(); else openStartMenu(); if (isWidgetsOpen) closeWidgets(); if (isNotificationsOpen) closeNotifications(); }
if (btnStart) {
    btnStart.addEventListener('click', (e) => { e.stopPropagation(); toggleStartMenu(); });
}

// Widgets
function openWidgets() { isWidgetsOpen = true; widgetsPanel.classList.add('open'); showOverlay(); btnWidgets.classList.add('active-app'); }
function closeWidgets() { isWidgetsOpen = false; widgetsPanel.classList.remove('open'); btnWidgets.classList.remove('active-app'); hideOverlay(); }
function toggleWidgets() { if (isWidgetsOpen) closeWidgets(); else openWidgets(); if (isStartMenuOpen) closeStartMenu(); if (isNotificationsOpen) closeNotifications(); }
btnWidgets.addEventListener('click', (e) => { e.stopPropagation(); toggleWidgets(); });
document.getElementById('btn-widgets-close').addEventListener('click', closeWidgets);

// Notifications
function openNotifications() { isNotificationsOpen = true; notificationPanel.classList.add('open'); showOverlay(); btnNotifications.classList.add('active-app'); const dot = btnNotifications.querySelector('.tray-dot'); if (dot) dot.style.display = 'none'; }
function closeNotifications() { isNotificationsOpen = false; notificationPanel.classList.remove('open'); btnNotifications.classList.remove('active-app'); hideOverlay(); }
function toggleNotifications() { if (isNotificationsOpen) closeNotifications(); else openNotifications(); if (isStartMenuOpen) closeStartMenu(); if (isWidgetsOpen) closeWidgets(); }
btnNotifications.addEventListener('click', (e) => { e.stopPropagation(); toggleNotifications(); });
document.getElementById('btn-notif-close').addEventListener('click', closeNotifications);

// Search
btnSearch.addEventListener('click', (e) => { e.stopPropagation(); if (!isStartMenuOpen) openStartMenu(); startSearchInput.focus(); });
startSearchInput.addEventListener('input', () => {
    const query = startSearchInput.value.toLowerCase().trim();
    startAppsGrid.querySelectorAll('.start-app-item').forEach(item => {
        const name = item.querySelector('.app-name').textContent.toLowerCase();
        item.style.display = query === '' || name.includes(query) ? '' : 'none';
    });
});

overlay.addEventListener('click', () => {
    if (isStartMenuOpen) closeStartMenu();
    if (isWidgetsOpen) closeWidgets();
    if (isNotificationsOpen) closeNotifications();
});

// Context menu
function showContextMenu(x, y) { contextMenu.style.left = x + 'px'; contextMenu.style.top = y + 'px'; contextMenu.classList.add('visible'); }
function hideContextMenu() { contextMenu.classList.remove('visible'); }
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.window') || e.target.closest('#taskbar') || e.target.closest('#start-menu') ||
        e.target.closest('#widgets-panel') || e.target.closest('#notification-panel') ||
        e.target.closest('#context-menu') || e.target.closest('#lock-screen') || e.target.closest('#boot-screen')) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
});
document.addEventListener('click', (e) => { if (!e.target.closest('#context-menu')) hideContextMenu(); });

// ---------- WINDOW SYSTEM (complete with drag, resize, controls) ----------

function createWindow(appType, title, width = 700, height = 450) {
    const id = windowIdCounter++;
    const win = {
        id, appType, title, width, height,
        x: 60 + (windows.length * 30) % 200,
        y: 40 + (windows.length * 30) % 150,
        isMinimized: false, isMaximized: false,
        contentLoaded: false ,  // <-- add this
        zIndex: ++highestZIndex, prevState: null
    };
    win.x = Math.min(Math.max(win.x, 10), window.innerWidth - 200);
    win.y = Math.min(Math.max(win.y, 10), window.innerHeight - 250);
    windows.push(win);
    renderWindow(win);
    updateTaskbarApps();
    bringToFront(win.id);
    return win;
}

// === Event delegation for window controls ===
windowsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.win-ctrl-btn');
    if (!btn) return;
    const winEl = btn.closest('.window');
    if (!winEl) return;
    const windowId = parseInt(winEl.dataset.windowId);
    if (isNaN(windowId)) return;

    if (btn.classList.contains('minimize-btn')) {
        minimizeWindow(windowId);
    } else if (btn.classList.contains('maximize-btn')) {
        toggleMaximizeWindow(windowId);
    } else if (btn.classList.contains('close-btn')) {
        closeWindow(windowId);
    }
});
function renderWindow(win) {
    const existing = document.querySelector(`.window[data-window-id="${win.id}"]`);
    if (existing) existing.remove();
    const winEl = document.createElement('div');
    winEl.className = 'window';
    winEl.setAttribute('data-window-id', win.id);
    winEl.style.cssText = `left:${win.x}px; top:${win.y}px; width:${win.width}px; height:${win.height}px; z-index:${win.zIndex}`;
    if (win.isMinimized) winEl.classList.add('minimized');
    if (win.isMaximized) winEl.classList.add('maximized');

    // Titlebar
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';
    titlebar.innerHTML = `<span class="window-title">${win.title}</span>
        <div class="window-controls">
            <button class="win-ctrl-btn minimize-btn" title="Minimize">─</button>
            <button class="win-ctrl-btn maximize-btn" title="Maximize">□</button>
            <button class="win-ctrl-btn close-btn" title="Close">✕</button>
        </div>`;

    // Content
    const content = document.createElement('div');
    content.className = 'window-content';
    content.setAttribute('data-window-id', win.id);
    // content.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">Loading...</div>';

    // Resize handles
    ['nw', 'ne', 'sw', 'se', 'e', 's'].forEach(dir => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${dir}`;
        winEl.appendChild(handle);
    });

    winEl.appendChild(titlebar);
    winEl.appendChild(content);
    windowsContainer.appendChild(winEl);

    // ---- Drag logic ----
    // ---- Drag logic ----
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
    titlebar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-controls') || win.isMaximized) return;
        isDragging = true;
        winEl.style.willChange = 'transform';
        const rect = winEl.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        bringToFront(win.id);
    });

    // ---- Resize logic ----
    let isResizing = false, resizeDir = '';
    let startX, startY, startW, startH, startL, startT;
    const resizeHandles = winEl.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            if (win.isMaximized) return;
            e.stopPropagation();
            e.preventDefault();
            isResizing = true;
            resizeDir = handle.className.replace('resize-handle ', '').trim();
            startX = e.clientX; startY = e.clientY;
            startW = win.width; startH = win.height;
            startL = win.x; startT = win.y;
            bringToFront(win.id);
        });
    });

    let rafId = null;
    const onMouseMove = (e) => {
        if (isDragging && !win.isMaximized) {
            win.x = e.clientX - dragOffsetX;
            win.y = e.clientY - dragOffsetY;
            win.x = Math.max(-50, Math.min(win.x, window.innerWidth - 100));
            win.y = Math.max(0, Math.min(win.y, window.innerHeight - 60));
            if (!rafId) {
                rafId = requestAnimationFrame(() => {
                    if (win._el) {
                        win._el.style.left = win.x + 'px';
                        win._el.style.top = win.y + 'px';
                        // Snap logic
                        if (window.snapEnabled !== false) {
                            const snapRight = window.innerWidth - (win.x + win.width);
                            const snapBottom = window.innerHeight - (win.y + win.height) - 50;
                            if (Math.abs(win.x) < SNAP_THRESHOLD) win.x = 0;
                            if (Math.abs(win.y) < SNAP_THRESHOLD) win.y = 0;
                            if (Math.abs(snapRight) < SNAP_THRESHOLD) win.x = window.innerWidth - win.width;
                            if (Math.abs(snapBottom) < SNAP_THRESHOLD) win.y = window.innerHeight - win.height - 50;
                            win._el.style.left = win.x + 'px';
                            win._el.style.top = win.y + 'px';
                        }
                    }
                    rafId = null;
                });
            }
        }
        if (isResizing && !win.isMaximized) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newW = startW, newH = startH, newL = startL, newT = startT;
            if (resizeDir.includes('e')) newW = Math.max(300, startW + dx);
            if (resizeDir.includes('s')) newH = Math.max(180, startH + dy);
            if (resizeDir.includes('w')) { newW = Math.max(300, startW - dx); newL = startL + (startW - newW); }
            if (resizeDir.includes('n')) { newH = Math.max(180, startH - dy); newT = startT + (startH - newH); }
            if (resizeDir === 'e') newH = startH;
            if (resizeDir === 's') newW = startW;
            win.width = newW; win.height = newH; win.x = newL; win.y = newT;
            winEl.style.width = newW + 'px'; winEl.style.height = newH + 'px';
            winEl.style.left = newL + 'px'; winEl.style.top = newT + 'px';
        }
    };

    const onMouseUp = () => {
        isDragging = false;
        isResizing = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (win._el) win._el.style.willChange = 'auto';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    winEl._cleanup = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    };

    // Click to focus
    winEl.addEventListener('mousedown', () => bringToFront(win.id));

    // Control buttons
    // winEl.querySelector('.minimize-btn').addEventListener('click', (e) => { e.stopPropagation(); minimizeWindow(win.id); });
    // winEl.querySelector('.maximize-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleMaximizeWindow(win.id); });
    // winEl.querySelector('.close-btn').addEventListener('click', (e) => { e.stopPropagation(); closeWindow(win.id); });
    titlebar.addEventListener('dblclick', (e) => { if (!e.target.closest('.window-controls')) toggleMaximizeWindow(win.id); });

    win._el = winEl;
    // Content loader – called immediately after rendering
    loadAppContent(win, content);
}

// ---------- Focus & Z-index ----------
function bringToFront(windowId) {
    const win = windows.find(w => w.id === windowId);
    if (!win || win.isMinimized) return;
    win.zIndex = ++highestZIndex;
    if (win._el) win._el.style.zIndex = win.zIndex;
    windows.forEach(w => { if (w._el) w._el.classList.remove('focused'); });
    if (win._el) win._el.classList.add('focused');
    activeWindowId = windowId;
    updateTaskbarApps();
    if (!win.contentLoaded) {
        win.contentLoaded = true;
        const contentEl = win._el.querySelector('.window-content');
        if (contentEl) {
            loadAppContent(win, contentEl);
        }
    }
}

// ---------- Window state controls ----------
function minimizeWindow(windowId) {
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    if (win.isMaximized) { win.isMaximized = false; if (win._el) win._el.classList.remove('maximized'); }
    win.isMinimized = true;
    if (win._el) win._el.classList.add('minimized');
    const visible = windows.filter(w => !w.isMinimized && w.id !== windowId);
    if (visible.length > 0) bringToFront(visible[visible.length - 1].id);
    else activeWindowId = null;
    updateTaskbarApps();
}
function restoreWindow(windowId) {
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    win.isMinimized = false;
    if (win._el) win._el.classList.remove('minimized');
    bringToFront(windowId);
    updateTaskbarApps();
}
function toggleMaximizeWindow(windowId) {
    const win = windows.find(w => w.id === windowId);
    if (!win || win.isMinimized) return;
    if (win.isMaximized) {
        win.isMaximized = false;
        if (win._el) {
            win._el.classList.remove('maximized');
            win._el.style.left = win.prevState.x + 'px';
            win._el.style.top = win.prevState.y + 'px';
            win._el.style.width = win.prevState.width + 'px';
            win._el.style.height = win.prevState.height + 'px';
            win.x = win.prevState.x; win.y = win.prevState.y;
            win.width = win.prevState.width; win.height = win.prevState.height;
        }
    } else {
        win.prevState = { x: win.x, y: win.y, width: win.width, height: win.height };
        win.isMaximized = true;
        if (win._el) {
            win._el.classList.add('maximized');
            win._el.style.left = '0'; win._el.style.top = '0';
            win._el.style.width = '100%'; win._el.style.height = `calc(100% - var(--taskbar-height))`;
        }
        win.x = 0; win.y = 0; win.width = window.innerWidth; win.height = window.innerHeight - 50;
    }
    bringToFront(windowId);
}
function closeWindow(windowId) {
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    if (win._el) {
        win._el.style.transition = 'all 0.2s ease';
        win._el.style.opacity = '0'; win._el.style.transform = 'scale(0.9)';

        if (win._el._cleanup) win._el._cleanup();
        // Cancel any pending animation frame
        // (We'll need to store the rafId on the win object; let's add it to the window object.)
        if (win._rafId) {
            cancelAnimationFrame(win._rafId);
        }
        win._el.remove();
        setTimeout(() => { if (win._el && win._el.parentNode) win._el.remove(); }, 200);
    }
    windows = windows.filter(w => w.id !== windowId);
    const remaining = windows.filter(w => !w.isMinimized);
    if (remaining.length > 0) bringToFront(remaining[remaining.length - 1].id);
    else activeWindowId = null;
    updateTaskbarApps();
}

// ---------- Taskbar app buttons ----------
function updateTaskbarApps() {
    taskbarApps.innerHTML = '';
    const seen = new Set();
    const uniqueApps = [];
    windows.forEach(win => {
        if (!seen.has(win.appType)) { seen.add(win.appType); uniqueApps.push(win); }
        else {
            const idx = uniqueApps.findIndex(u => u.appType === win.appType);
            if (idx >= 0 && win.zIndex > uniqueApps[idx].zIndex) uniqueApps[idx] = win;
        }
    });
    uniqueApps.forEach(win => {
        const btn = document.createElement('button');
        btn.className = 'taskbar-btn';
        if (win.id === activeWindowId && !win.isMinimized) btn.classList.add('active-app');
        if (win.isMinimized) btn.classList.add('minimized-app');
        btn.title = win.title;
        const icons = { explorer: '📁', browser: '🌐', settings: '⚙️', notepad: '📝', recycle: '🗑️', calculator: '🧮', photos: '🖼️', music: '🎵', video: '🎬', store: '🛒', terminal: '💻', calendar: '📅', weather: '☁️' };
        btn.textContent = icons[win.appType] || '📄';
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showRunningAppContextMenu(e.clientX, e.clientY, win.appType, win.title, win.id);
        });
        taskbarApps.appendChild(btn);
    });
}
function showRunningAppContextMenu(x, y, appType, appTitle, windowId) {
    const existing = document.getElementById('running-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'running-context-menu';
    menu.style.cssText = `position:fixed; left:${x}px; top:${y}px; background:rgba(30,30,50,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:4px 0; min-width:160px; z-index:9000;`;

    const addItem = (text, action) => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:8px 16px; cursor:pointer; color:#cbd5e1; font-size:13px;';
        item.textContent = text;
        item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.1)');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', () => { action(); menu.remove(); });
        menu.appendChild(item);
    };

    const isPinned = typeof pinnedApps !== 'undefined' && pinnedApps.includes(appType);
    addItem(isPinned ? '📌 Unpin from taskbar' : '📌 Pin to taskbar', () => {
        if (isPinned) unpinApp(appType);
        else pinApp(appType);
    });
    addItem('✕ Close window', () => closeWindow(windowId));

    document.body.appendChild(menu);
    document.addEventListener('click', function close(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', close);
        }
    });
}
// ---------- Open application ----------
function openApp(appType) {
    const configs = {
        explorer: { title: 'File Explorer', width: 800, height: 500 },
        browser: { title: 'Edge Browser', width: 900, height: 550 },
        settings: { title: 'Settings', width: 650, height: 480 },
        notepad: { title: 'Notes', width: 550, height: 400 },
        recycle: { title: 'Recycle Bin', width: 600, height: 420 },
        calculator: { title: 'Calculator', width: 360, height: 440 },
        store: { title: 'App Store', width: 700, height: 500 },
        music: { title: 'Music Player', width: 800, height: 500 },
        gallery: { title: 'Photos', width: 800, height: 550 },
        calendar: { title: 'Calendar', width: 750, height: 550 },
        mail: { title: 'Mail', width: 750, height: 500 },
        paint: { title: 'Paint', width: 900, height: 600 },
        assistant: { title: 'AI Assistant', width: 600, height: 500 }
    };
    const c = configs[appType] || { title: appType.charAt(0).toUpperCase() + appType.slice(1), width: 600, height: 400 };
    createWindow(appType, c.title, c.width, c.height);
}

// openApp now accepts an optional options object
function openApp(appType, options = {}) {
    const config = appConfigs[appType] || {
        title: appType.charAt(0).toUpperCase() + appType.slice(1),
        width: 600, height: 400
    };
    const win = createWindow(appType, config.title, config.width, config.height);
    // Attach file data to window
    if (options.file) {
        win.fileData = options.file;
    }
    return win;
}

// ---------- Load app-specific content from backend ----------
async function loadAppContent(win, container) {
    switch (win.appType) {
        case 'explorer':
            loadFilesIntoExplorer(container);
            break;
        case 'browser':
            new BrowserApp(container, win);
            break;
        case 'settings':
            loadSettingsIntoWindow(container);
            break;
        case 'notepad':
            loadNotesIntoWindow(container);
            break;
        case 'recycle':
            container.innerHTML = `<div style="text-align:center;padding:30px;">🗑️ Recycle Bin<br><small>No items</small></div>`;
            break;
        case 'calculator':
            loadCalculator(container, win);
            break;
        case 'terminal':
            new Terminal(container, win);
            break;
        case 'store':
            new StoreApp(container, win);
            break;
        case 'music':
            new MusicApp(container, win);
            break;
        case 'gallery':
            new GalleryApp(container, win);
            break;
        case 'calendar':
            new CalendarApp(container, win);
            break;
        case 'mail':
            new MailApp(container, win);
            break;
        case 'paint':
            new PaintApp(container, win);
            break;
        case 'assistant':
            new AIAssistant(container, win);
            break;
        case 'recycle':
            new RecycleBinApp(container, win);
            break;

        case 'explorer': loadFilesIntoExplorer(container); break;
        case 'browser': new BrowserApp(container, win); break;
        case 'settings': loadSettingsIntoWindow(container); break;
        case 'notepad': loadNotesIntoWindow(container); break;
        case 'gallery': new GalleryApp(container, win); break;
        case 'music': new MusicApp(container, win); break;
        case 'video_player': new VideoPlayer(container, win); break;
        case 'code_editor': new CodeEditor(container, win); break;
        case 'pdf_viewer': new PDFViewer(container, win); break;
        default:
            container.innerHTML = `<div style="text-align:center;padding:30px;">${win.title}</div>`;
    }
}

// ---------- File Explorer (from API) ----------
async function loadFilesIntoExplorer(container) {
    const winId = container.dataset.windowId;
    try {
        const files = await api.get('/files/');
        const vfs = new VirtualFileSystem(files);
        const state = explorerState.get(winId) || { currentFolderId: 'root' };
        state.vfs = vfs;
        explorerState.set(winId, state);
        renderExplorerView(container, vfs, state.currentFolderId);
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;">Error loading files</div>';
    }
}

async function renderExplorerView(container, vfs, folderId) {
    const state = Win12.explorerState.get(container.dataset.windowId);
    if (!state) return;
    state.currentFolderId = folderId;
    Win12.explorerState.set(container.dataset.windowId, state);

    const items = vfs.getFolderContents(folderId);
    const sortBy = state.sortBy || 'name';
    const sortDir = state.sortDir || 'asc';
    const sorted = sortFiles(items, sortBy, sortDir);

    const breadHTML = vfs.getBreadcrumbs(folderId).map((c, i) => {
        const isLast = i === breadcrumbs.length - 1;
        return `<span class="explorer-crumb" data-folder-id="${c.id}" style="cursor:pointer;${isLast ? 'color:#f1f5f9;font-weight:500;' : ''}">${sanitize(c.name)}</span>${isLast ? '' : ' › '}`;
    }).join('');

    const viewMode = state.viewMode || 'icons'; // 'icons', 'list', 'details'
    let gridHTML = '';
    if (viewMode === 'icons') {
        gridHTML = `<div class="explorer-icons">${sorted.map(item => `<div class="explorer-file" draggable="true" data-id="${item.id}" data-type="${item.type}"><div class="file-icon">${item.type === 'folder' ? '📁' : '📄'}</div><div class="file-name">${sanitize(item.name)}</div></div>`).join('')}</div>`;
    } else if (viewMode === 'details') {
        gridHTML = `<table class="explorer-table"><thead><tr><th data-sort="name">Name</th><th data-sort="type">Type</th><th data-sort="size">Size</th><th data-sort="updated">Date modified</th></tr></thead><tbody>${sorted.map(item => `<tr class="explorer-file" data-id="${item.id}" data-type="${item.type}"><td>${item.type === 'folder' ? '📁' : '📄'} ${sanitize(item.name)}</td><td>${item.type === 'folder' ? 'Folder' : (item.extension || 'File')}</td><td>${item.size || '-'}</td><td>${item.updated_at ? new Date(item.updated_at).toLocaleString() : '-'}</td></tr>`).join('')}</tbody></table>`;
    }

    container.innerHTML = `
        <div class="explorer-toolbar">
            <div class="explorer-breadcrumb">${breadHTML}</div>
            <div class="explorer-address"><input type="text" class="address-bar" value="${getPathString(vfs, folderId)}" placeholder="Path"></div>
            <div class="view-controls">
                <button class="view-icons" title="Icons">🖼️</button>
                <button class="view-details" title="Details">📋</button>
                <button class="sort-name">Sort by Name</button>
            </div>
        </div>
        <div class="explorer-files" data-folder-id="${folderId}">${gridHTML}</div>
    `;

    attachExplorerEvents(container, vfs, folderId);
    attachDragAndDrop(container, vfs, folderId);
    attachAddressBar(container, vfs);
    attachSorting(container, vfs, folderId);
    attachViewMode(container, vfs, folderId);
}

function attachDragAndDrop(container, vfs, folderId) {
    const filesContainer = container.querySelector('.explorer-files');
    // Make files draggable
    container.querySelectorAll('.explorer-file').forEach(el => {
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ id: el.dataset.id, type: el.dataset.type }));
            e.dataTransfer.effectAllowed = 'move';
        });
    });
    // Make folder drop target
    filesContainer.addEventListener('dragover', (e) => e.preventDefault());
    filesContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (!data) return;
        // Move dragged file to current folder
        await api.put(`/files/${data.id}`, { parent_id: folderId });
        refreshCurrentExplorer(container);
    });
}

function attachExplorerEvents(container, vfs, folderId) {
    // Breadcrumb clicks
    container.querySelectorAll('.explorer-crumb').forEach(crumb => {
        crumb.addEventListener('click', () => {
            const id = crumb.dataset.folderId;
            renderExplorerView(container, vfs, id);
        });
    });

    // Double-click on files/folders
    container.querySelectorAll('.explorer-file').forEach(el => {
        el.addEventListener('dblclick', () => {
            const id = el.dataset.id;
            const type = el.dataset.type;
            if (type === 'folder') {
                renderExplorerView(container, vfs, id);
            } else {
                // Open file content in Notepad
                openFileInNotepad(id);
            }
        });

        // Right-click context menu for file operations
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showFileContextMenu(e.clientX, e.clientY, el.dataset.id, el.dataset.type, container);
        });
    });
}

async function openFileInNotepad(fileId) {
    try {
        const file = await api.get(`/files/${fileId}`);
        if (!file) return;
        // Open Notepad app with content
        const win = createWindow('notepad', `Notepad - ${file.name}`, 550, 400);
        // The notepad content loader is in loadAppContent; we need to pass the file content.
        // We'll modify loadAppContent for notepad to accept an optional content parameter.
        // For simplicity, we'll store the content in a global temp and then let the notepad window pick it up.
        window._pendingNotepadFile = { name: file.name, content: file.content };
        // Wait for the window to be rendered then set content
        setTimeout(() => {
            const contentEl = win._el.querySelector('.window-content');
            if (contentEl) {
                contentEl.innerHTML = `<textarea style="width:100%; height:100%; background:rgba(0,0,0,0.2); border:none; color:#e2e8f0; padding:16px; resize:none; outline:none;">${escapeHtml(file.content)}</textarea>`;
                // Enable auto-save back to file
                const textarea = contentEl.querySelector('textarea');
                textarea.addEventListener('input', debounce(async (e) => {
                    await api.put(`/files/${fileId}`, { content: e.target.value });
                }, 1000));
            }
        }, 100);
    } catch (e) {
        console.error('Error opening file', e);
    }
}

function showFileContextMenu(x, y, fileId, fileType, container) {
    // Remove any previous
    const existing = document.getElementById('file-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'file-context-menu';
    menu.style.cssText = `position:fixed; left:${x}px; top:${y}px; background:rgba(30,30,50,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:4px 0; min-width:150px; z-index:8001;`;

    const addItem = (text, action) => {
        const item = document.createElement('div');
        item.className = 'context-item';
        item.textContent = text;
        item.style.cssText = 'padding:8px 16px; cursor:pointer; color:#cbd5e1; font-size:13px;';
        item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.1)');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', action);
        menu.appendChild(item);
    };

    addItem('Rename', async () => {
        const newName = prompt('Enter new name:');
        if (newName) {
            await api.put(`/files/${fileId}`, { name: newName });
            refreshCurrentExplorer(container);
        }
        menu.remove();
    });

    addItem('Delete', async () => {
        if (confirm('Delete this item?')) {
            await api.delete(`/files/${fileId}`);
            refreshCurrentExplorer(container);
        }
        menu.remove();
    });

    addItem('Copy', async () => {
        await api.post(`/files/${fileId}/copy`);
        refreshCurrentExplorer(container);
        menu.remove();
    });

    if (fileType === 'folder') {
        addItem('New Folder here', async () => {
            const name = prompt('Folder name:');
            if (name) {
                await api.post('/files/', { name, type: 'folder', parent_id: fileId });
                refreshCurrentExplorer(container);
            }
            menu.remove();
        });
        addItem('New File here', async () => {
            const name = prompt('File name:');
            if (name) {
                await api.post('/files/', { name, type: 'file', parent_id: fileId, content: '' });
                refreshCurrentExplorer(container);
            }
            menu.remove();
        });
    }

    document.body.appendChild(menu);
    // Close on outside click
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

async function refreshCurrentExplorer(container) {
    const winId = container.dataset.windowId;
    const state = explorerState.get(winId);
    if (state) {
        const files = await api.get('/files/');
        state.vfs.refresh(files);
        renderExplorerView(container, state.vfs, state.currentFolderId);
    }
}

function renderFileList(files) {
    if (!files.length) return '<div style="text-align:center;color:#94a3b8;padding:20px;">This folder is empty</div>';
    return files.map(f => `
        <div class="explorer-file" data-id="${f.id}" data-type="${f.type}">
            <div class="file-icon">${f.type === 'folder' ? '📁' : '📄'}</div>
            <div class="file-name">${f.name}</div>
        </div>
    `).join('');
}

 
// ---------- Settings (loads from API, saves immediately) ----------
async function loadSettingsIntoWindow(container) {
    try {
        const s = await api.get('/settings/');
        container.innerHTML = renderSettingsHTML(s);
        attachSettingsEvents(container);
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;">Settings unavailable</div>';
    }
}

function renderSettingsHTML(settings) {
    const wallpaper = settings.wallpaper || '';
    const theme = settings.theme || 'dark';
    const transparency = settings.transparency !== undefined ? settings.transparency : 'True';
    const accentColor = settings.accent_color || '#60a5fa';
    const snapEnabled = settings.snap_enabled !== undefined ? settings.snap_enabled : 'True';
    const taskbarAutohide = settings.taskbar_autohide !== undefined ? settings.taskbar_autohide : 'False';

    return `
        <div class="settings-group"><h4>Personalization</h4>
            <div class="settings-row"><span>Wallpaper URL</span>
                <input type="text" id="setting-wallpaper" value="${escapeHtml(wallpaper)}" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:4px 8px; border-radius:6px; width:200px;">
            </div>
            <div class="settings-row"><span>Theme</span>
                <select id="setting-theme" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:4px 8px; border-radius:6px;">
                    <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
                    <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
                </select>
            </div>
            <div class="settings-row"><span>Transparency</span>
                <input type="checkbox" id="setting-transparency" ${transparency === 'True' ? 'checked' : ''}>
            </div>
            <div class="settings-row"><span>Accent Color</span>
                <input type="color" id="setting-accent-color" value="${escapeHtml(accentColor)}" style="width:50px; height:30px; border:none; border-radius:6px; background:transparent; cursor:pointer;">
            </div>
        </div>
        <div class="settings-group"><h4>Behavior</h4>
            <div class="settings-row"><span>Window Snap</span>
                <input type="checkbox" id="setting-snap-enabled" ${snapEnabled === 'True' ? 'checked' : ''}>
            </div>
            <div class="settings-row"><span>Taskbar Auto‑hide</span>
                <input type="checkbox" id="setting-taskbar-autohide" ${taskbarAutohide === 'True' ? 'checked' : ''}>
            </div>
        </div>
        <div class="settings-group"><h4>System</h4>
            <div class="settings-row"><span>Windows 12 Pro</span><span style="color:#94a3b8;">Build 26000</span></div>
        </div>
    `;
}

function attachSettingsEvents(container) {
    const wallpaperInp = document.getElementById('setting-wallpaper');
    const themeSel = document.getElementById('setting-theme');
    const transChk = document.getElementById('setting-transparency');
    const save = async () => {
        await api.put('/settings/', {
            wallpaper: wallpaperInp.value,
            theme: themeSel.value,
            transparency: transChk.checked
        });
        if (wallpaperInp.value) {
            document.getElementById('desktop').style.backgroundImage = `url(${wallpaperInp.value})`;
        }
    };
    wallpaperInp.addEventListener('change', save);
    themeSel.addEventListener('change', save);
    transChk.addEventListener('change', save);
}

// ---------- Notes (list from API, auto‑save) ----------
async function loadNotesIntoWindow(container) {
    try {
        const notes = await api.get('/notes/');
        container.innerHTML = renderNotesHTML(notes);
        attachNotesEvents(container);
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;">Notes unavailable</div>';
    }
}
function renderNotesHTML(notes) {
    return notes.map(n => `
        <div class="note-item" data-id="${n.id}">
            <input class="note-title" value="${escapeHtml(n.title)}" style="width:100%;background:transparent;border:none;color:#fff;font-weight:bold;margin-bottom:4px;">
            <textarea class="note-body" style="width:100%;background:rgba(0,0,0,0.2);border:none;color:#e2e8f0;padding:8px;border-radius:8px;">${escapeHtml(n.body)}</textarea>
            <button class="delete-note" style="background:#ef4444;color:#fff;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;">Delete</button>
            <hr style="border-color:rgba(255,255,255,0.1); margin:12px 0;">
        </div>
    `).join('') + `<button id="new-note-btn" style="background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">+ New Note</button>`;
}
function attachNotesEvents(container) {
    const saveNote = async (el) => {
        const noteDiv = el.closest('.note-item');
        const id = noteDiv.dataset.id;
        const title = noteDiv.querySelector('.note-title').value;
        const body = noteDiv.querySelector('.note-body').value;
        await api.put(`/notes/${id}`, { title, body });
    };
    container.querySelectorAll('.note-title, .note-body').forEach(el => {
        el.addEventListener('input', debounce((e) => saveNote(e.target), 800));
    });
    container.querySelectorAll('.delete-note').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.closest('.note-item').dataset.id;
            await api.delete(`/notes/${id}`);
            loadNotesIntoWindow(container);
        });
    });
    document.getElementById('new-note-btn')?.addEventListener('click', async () => {
        await api.post('/notes/', { title: 'New Note', body: '' });
        loadNotesIntoWindow(container);
    });
}

// ---------- Calculator (local) ----------
function loadCalculator(container, win) {
    container.innerHTML = `
        <div style="background:rgba(0,0,0,0.3);padding:16px;border-radius:12px;text-align:right;font-size:28px;color:#f1f5f9;min-height:50px;" id="calc-display-${win.id}">0</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;" id="calc-buttons-${win.id}"></div>
    `;
    const display = container.querySelector(`#calc-display-${win.id}`);
    const btnsGrid = container.querySelector(`#calc-buttons-${win.id}`);
    const buttons = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='];
    let state = { current: '0', previous: '', operator: '', shouldReset: false };
    buttons.forEach(btn => {
        const b = document.createElement('button');
        b.textContent = btn;
        b.style.cssText = 'padding:14px;font-size:16px;border:none;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.08);color:#e2e8f0;';
        b.addEventListener('click', () => handleCalcButton(btn, state, display));
        btnsGrid.appendChild(b);
    });
}
function handleCalcButton(btn, state, display) {
    if (btn === 'C') { state.current = '0'; state.previous = ''; state.operator = ''; state.shouldReset = false; }
    else if (btn === '⌫') state.current = state.current.length > 1 ? state.current.slice(0, -1) : '0';
    else if (btn === '±') state.current = state.current.startsWith('-') ? state.current.slice(1) : '-' + state.current;
    else if (['+', '−', '×', '÷'].includes(btn)) {
        if (state.operator && !state.shouldReset) state.current = String(compute(state.previous, state.current, state.operator));
        state.previous = state.current; state.operator = btn; state.shouldReset = true;
    } else if (btn === '=') {
        if (state.operator && state.previous) { state.current = String(compute(state.previous, state.current, state.operator)); state.previous = ''; state.operator = ''; }
        state.shouldReset = true;
    } else if (btn === '%') { state.current = String(parseFloat(state.current) / 100); state.shouldReset = true; }
    else {
        if (state.shouldReset) { state.current = btn; state.shouldReset = false; }
        else state.current = state.current === '0' ? btn : state.current + btn;
    }
    let displayVal = state.current;
    if (displayVal.length > 12) displayVal = parseFloat(displayVal).toExponential(6);
    display.textContent = displayVal;
}
function compute(a, b, op) {
    const na = parseFloat(a), nb = parseFloat(b);
    switch (op) {
        case '+': return na + nb;
        case '−': return na - nb;
        case '×': return na * nb;
        case '÷': return nb !== 0 ? na / nb : 'Error';
        default: return nb;
    }
}

// ---------- Utility ----------
function escapeHtml(text) { return String(text).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
function debounce(fn, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); }; }

// ---------- Keyboard shortcuts ----------
document.addEventListener('keydown', (e) => {
    if (isLocked) return;

    // Escape – close panels
    if (e.key === 'Escape') {
        if (isStartMenuOpen) closeStartMenu();
        if (isWidgetsOpen) closeWidgets();
        if (isNotificationsOpen) closeNotifications();
        hideContextMenu();
        if (taskViewActive) closeTaskView();
        return;
    }

    // Alt+Tab – cycle windows
    if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        const visibleWins = windows.filter(w => !w.isMinimized);
        if (visibleWins.length > 1) {
            const idx = visibleWins.findIndex(w => w.id === activeWindowId);
            const next = (idx + 1) % visibleWins.length;
            bringToFront(visibleWins[next].id);
        }
        return;
    }

    // Win key shortcuts (use Ctrl+Win or just Ctrl? We'll use Ctrl+Shift for snap to avoid conflicts)
    // For realism, we'll use Ctrl+Shift+Arrow for snap, and Ctrl+Shift+D for new desktop etc.
    if (e.ctrlKey && e.shiftKey) {
        const win = activeWindowId ? windows.find(w => w.id === activeWindowId) : null;
        if (win && !win.isMaximized) {
            if (e.key === 'ArrowLeft') {
                // Snap left half
                win.x = 0;
                win.y = 0;
                win.width = window.innerWidth / 2;
                win.height = window.innerHeight - 50;
                applyWindowState(win);
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                win.x = window.innerWidth / 2;
                win.y = 0;
                win.width = window.innerWidth / 2;
                win.height = window.innerHeight - 50;
                applyWindowState(win);
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                // Maximize
                toggleMaximizeWindow(win.id);
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                // Restore if maximized, else minimize
                if (win.isMaximized) {
                    toggleMaximizeWindow(win.id);
                } else {
                    minimizeWindow(win.id);
                }
                e.preventDefault();
            }
        }

        // Workspace shortcuts
        if (e.key === 'd' || e.key === 'D') {
            // Toggle task view (show all workspaces)
            toggleTaskView();
            e.preventDefault();
        } else if (e.key === 'F4') {
            // Close current workspace (if not last)
            removeWorkspace(currentWorkspaceIndex);
            e.preventDefault();
        } else if (e.key === 'n' || e.key === 'N') {
            // New workspace
            addWorkspace(`Desktop ${workspaces.length + 1}`);
            e.preventDefault();
        } else if (e.key >= '1' && e.key <= '9') {
            const num = parseInt(e.key);
            if (num <= workspaces.length) {
                switchToWorkspace(num - 1);
                e.preventDefault();
            }
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'L') {
            lockScreen();
            e.preventDefault();
        }
    }
});
function toggleTaskView() {
    if (taskViewActive) {
        closeTaskView();
    } else {
        showTaskView();
    }
}

function showTaskView() {
    // Create a fullscreen overlay
    const tv = document.createElement('div');
    tv.id = 'task-view';
    tv.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(20px); z-index:7000; display:flex; flex-wrap:wrap; gap:20px; padding:40px; align-items:flex-start; justify-content:center; overflow:auto;';

    workspaces.forEach((ws, idx) => {
        const card = document.createElement('div');
        card.style.cssText = 'width:200px; height:150px; background:rgba(255,255,255,0.1); border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; border:2px solid ' + (idx === currentWorkspaceIndex ? '#60a5fa' : 'transparent');
        card.innerHTML = `<span style="color:#fff;">${ws.name}</span>`;
        card.addEventListener('click', () => {
            switchToWorkspace(idx);
            closeTaskView();
        });
        // Add a close button (except if only one workspace)
        if (workspaces.length > 1) {
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '✕';
            closeBtn.style.cssText = 'position:absolute; top:5px; right:5px; background:transparent; border:none; color:#fff; cursor:pointer; font-size:16px;';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeWorkspace(idx);
                closeTaskView();
                showTaskView(); // refresh
            });
            card.style.position = 'relative';
            card.appendChild(closeBtn);
        }
        tv.appendChild(card);
    });

    // New desktop button
    const newBtn = document.createElement('div');
    newBtn.style.cssText = 'width:200px; height:150px; background:rgba(255,255,255,0.05); border-radius:12px; display:flex; align-items:center; justify-content:center; cursor:pointer; border:2px dashed rgba(255,255,255,0.3);';
    newBtn.innerHTML = '<span style="color:#fff; font-size:32px;">+</span>';
    newBtn.addEventListener('click', () => {
        addWorkspace(`Desktop ${workspaces.length + 1}`);
        closeTaskView();
    });
    tv.appendChild(newBtn);
    document.body.appendChild(tv);
    taskViewActive = true;
}

function closeTaskView() {
    const tv = document.getElementById('task-view');
    if (tv) tv.remove();
    taskViewActive = false;
}
// ---------- Window resize handling ----------
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        windows.forEach(win => {
            if (win.isMaximized && win._el) {
                win._el.style.width = '100%';
                win._el.style.height = `calc(100% - var(--taskbar-height))`;
                win.width = window.innerWidth;
                win.height = window.innerHeight - 50;
            }
        });
    }, 100);
});

// ---------- Expose globals ----------
window.openApp = openApp;
window.hideContextMenu = hideContextMenu;
window.closeStartMenu = closeStartMenu;
window.closeWidgets = closeWidgets;
window.closeNotifications = closeNotifications;
window.minimizeWindow = minimizeWindow;
window.restoreWindow = restoreWindow;
window.toggleMaximizeWindow = toggleMaximizeWindow;
window.closeWindow = closeWindow;
window.bringToFront = bringToFront;
window.unlockSystem = unlockSystem;

// ---------- Boot ----------
function init() {
    startBootSequence();
    setTimeout(() => { bootComplete = true; }, 2100);
}
init();