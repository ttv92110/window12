// window-manager.js – windows, drag, resize, snap, taskbar, openApp, loadAppContent

let windowsContainer, taskbarAppsEl;

function setupWindowManager(containerEl, taskbarEl) {
    windowsContainer = containerEl;
    taskbarAppsEl = taskbarEl;

    // Event delegation for window control buttons
    windowsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.win-ctrl-btn');
        if (!btn) return;
        const winEl = btn.closest('.window');
        if (!winEl) return;
        const windowId = parseInt(winEl.dataset.windowId);
        if (isNaN(windowId)) return;

        if (btn.classList.contains('minimize-btn')) minimizeWindow(windowId);
        else if (btn.classList.contains('maximize-btn')) toggleMaximizeWindow(windowId);
        else if (btn.classList.contains('close-btn')) closeWindow(windowId);
    });
    // Helper functions for the active Explorer window
    function getSelectedFilesInActiveExplorer() {
        const activeContainer = document.querySelector('.window-content[data-app="explorer"]');
        if (!activeContainer) return [];
        // This assumes you have a way to get selected file IDs.
        // For now, return an empty array or implement selection tracking.
        // You can extend this later with a proper selection system.
        const selectedElements = activeContainer.querySelectorAll('.explorer-file.selected');
        return Array.from(selectedElements).map(el => ({ id: el.dataset.id, type: el.dataset.type }));
    }

    function getCurrentFolderIdInActiveExplorer() {
        const activeContainer = document.querySelector('.window-content[data-app="explorer"]');
        if (!activeContainer) return 'root';
        const state = Win12.explorerState.get(activeContainer.dataset.windowId);
        return state ? state.currentFolderId : 'root';
    }

    // Dummy refreshCurrentExplorer if not already defined elsewhere
    async function refreshCurrentExplorer(container) {
        if (!container) return;
        const winId = container.dataset.windowId;
        const state = Win12.explorerState.get(winId);
        if (state) {
            const files = await api.get('/files/');
            state.vfs.refresh(files);
            renderExplorerView(container, state.vfs, state.currentFolderId);
        }
    }
    document.addEventListener('keydown', async (e) => {
        if (Win12.isLocked) return;
        const activeWin = Win12.windows.find(w => w.id === Win12.activeWindowId);
        if (!activeWin || activeWin.appType !== 'explorer') return;

        // Helper to get the active explorer container
        const getActiveExplorerContainer = () => {
            return document.querySelector('.window-content[data-app="explorer"]');
        };

        if (e.ctrlKey && e.key === 'x') {
            e.preventDefault();
            const selected = getSelectedFilesInActiveExplorer();
            if (selected.length) clipboard.cut(selected);
        } else if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            const selected = getSelectedFilesInActiveExplorer();
            if (selected.length) clipboard.copy(selected);
        } else if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            const currentFolder = getCurrentFolderIdInActiveExplorer();
            const container = getActiveExplorerContainer();
            await clipboard.paste(currentFolder, null, () => {
                if (container) refreshCurrentExplorer(container);
            });
        } else if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            await undoManager.undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            await undoManager.redo();
        } else if (e.key === 'Delete') {
            e.preventDefault();
            const selected = getSelectedFilesInActiveExplorer();
            if (selected.length && await modal.confirm(`Move ${selected.length} item(s) to Recycle Bin?`, 'Confirm Delete')) {
                for (const file of selected) {
                    await api.delete(`/files/${file.id}`);
                    // Push an undo action that restores the file from trash
                    undoManager.push({
                        undo: async () => {
                            // Restore from trash – we need the trash item id; simplified: reload
                            await api.post(`/trash/restore/${file.id}`); // assumes file.id is same as trash id? Not ideal. Better to store trashId.
                            refreshCurrentExplorer(getActiveExplorerContainer());
                        },
                        redo: async () => {
                            await api.delete(`/files/${file.id}`);
                            refreshCurrentExplorer(getActiveExplorerContainer());
                        }
                    });
                }
                const container = getActiveExplorerContainer();
                if (container) refreshCurrentExplorer(container);
            }
        }
    });
}

// ---------- Window creation ----------
function createWindow(appType, title, width = 700, height = 450) {
    const id = Win12.windowIdCounter++;
    const win = {
        id, appType, title, width, height,
        x: 60 + (Win12.windows.length * 30) % 200,
        y: 40 + (Win12.windows.length * 30) % 150,
        isMinimized: false,
        isMaximized: false,
        contentLoaded: false,
        zIndex: ++Win12.highestZIndex,
        prevState: null,
    };
    win.x = Math.min(Math.max(win.x, 10), window.innerWidth - 200);
    win.y = Math.min(Math.max(win.y, 10), window.innerHeight - 250);
    Win12.windows.push(win);
    renderWindow(win);
    updateTaskbarApps();
    bringToFront(win.id);
    return win;
}

function renderWindow(win) {
    // Remove existing if re‑rendering
    const existing = document.querySelector(`.window[data-window-id="${win.id}"]`);
    if (existing) existing.remove();

    const winEl = document.createElement('div');
    winEl.className = 'window';
    winEl.dataset.windowId = win.id;
    winEl.style.cssText = `left:${win.x}px; top:${win.y}px; width:${win.width}px; height:${win.height}px; z-index:${win.zIndex}`;
    if (win.isMinimized) winEl.classList.add('minimized');
    if (win.isMaximized) winEl.classList.add('maximized');

    // Titlebar
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';
    titlebar.innerHTML = `<span class="window-title">${sanitize(win.title)}</span>
        <div class="window-controls">
            <button class="win-ctrl-btn minimize-btn" title="Minimize">─</button>
            <button class="win-ctrl-btn maximize-btn" title="Maximize">□</button>
            <button class="win-ctrl-btn close-btn" title="Close">✕</button>
        </div>`;

    // Content area
    const content = document.createElement('div');
    content.className = 'window-content';
    content.dataset.windowId = win.id;
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

    // ---------- Drag ----------
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

    // ---------- Resize ----------
    let isResizing = false, resizeDir = '';
    let startX, startY, startW, startH, startL, startT;
    winEl.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            if (win.isMaximized) return;
            e.stopPropagation(); e.preventDefault();
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
                        if (Win12.snapEnabled !== false) snapWindowToEdge(win, win._el);
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
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (win._el) win._el.style.willChange = 'auto';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    winEl._cleanup = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    };

    winEl.addEventListener('mousedown', () => bringToFront(win.id));

    titlebar.addEventListener('dblclick', (e) => {
        if (!e.target.closest('.window-controls')) toggleMaximizeWindow(win.id);
    });

    win._el = winEl;
    // Content is lazy‑loaded in bringToFront
}

function snapWindowToEdge(win, winEl) {
    const sw = window.innerWidth, sh = window.innerHeight;
    const t = Win12.SNAP_THRESHOLD;
    if (Math.abs(win.x) < t) win.x = 0;
    if (Math.abs(win.y) < t) win.y = 0;
    if (Math.abs(sw - (win.x + win.width)) < t) win.x = sw - win.width;
    if (Math.abs(sh - (win.y + win.height) - 50) < t) win.y = sh - win.height - 50;
    winEl.style.left = win.x + 'px';
    winEl.style.top = win.y + 'px';
}

// ---------- Focus and z‑index ----------
function bringToFront(windowId) {
    const win = Win12.windows.find(w => w.id === windowId);
    if (!win || win.isMinimized) return;
    win.zIndex = ++Win12.highestZIndex;
    if (win._el) win._el.style.zIndex = win.zIndex;
    Win12.windows.forEach(w => { if (w._el) w._el.classList.remove('focused'); });
    if (win._el) win._el.classList.add('focused');
    Win12.activeWindowId = windowId;
    updateTaskbarApps();
    if (!win.contentLoaded) {
        win.contentLoaded = true;
        const contentEl = win._el.querySelector('.window-content');
        if (contentEl) loadAppContent(win, contentEl);
    }
}

// ---------- Window state controls ----------
function minimizeWindow(windowId) {
    const win = Win12.windows.find(w => w.id === windowId);
    if (!win) return;
    if (win.isMaximized) { win.isMaximized = false; if (win._el) win._el.classList.remove('maximized'); }
    win.isMinimized = true;
    if (win._el) win._el.classList.add('minimized');
    const visible = Win12.windows.filter(w => !w.isMinimized && w.id !== windowId);
    if (visible.length > 0) bringToFront(visible[visible.length - 1].id);
    else Win12.activeWindowId = null;
    updateTaskbarApps();
}

function restoreWindow(windowId) {
    const win = Win12.windows.find(w => w.id === windowId);
    if (!win) return;
    win.isMinimized = false;
    if (win._el) win._el.classList.remove('minimized');
    bringToFront(windowId);
    updateTaskbarApps();
}

function toggleMaximizeWindow(windowId) {
    const win = Win12.windows.find(w => w.id === windowId);
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
            win._el.style.width = '100%'; win._el.style.height = 'calc(100% - var(--taskbar-height))';
        }
        win.x = 0; win.y = 0; win.width = window.innerWidth; win.height = window.innerHeight - 50;
    }
    bringToFront(windowId);
}

function closeWindow(windowId) {
    const win = Win12.windows.find(w => w.id === windowId);
    if (!win) return;
    if (win._el) {
        win._el.style.transition = 'all 0.2s ease';
        win._el.style.opacity = '0'; win._el.style.transform = 'scale(0.9)';
        if (win._el._cleanup) win._el._cleanup();
        win._el.remove();
    }
    Win12.windows = Win12.windows.filter(w => w.id !== windowId);
    const remaining = Win12.windows.filter(w => !w.isMinimized);
    if (remaining.length > 0) bringToFront(remaining[remaining.length - 1].id);
    else Win12.activeWindowId = null;
    updateTaskbarApps();
    if (typeof saveWorkspaces === 'function') saveWorkspaces();
}

// ---------- Taskbar ----------
function updateTaskbarApps() {
    if (!taskbarAppsEl) return;
    taskbarAppsEl.innerHTML = '';
    const seen = new Set();
    const uniqueApps = [];
    Win12.windows.forEach(win => {
        if (!seen.has(win.appType)) { seen.add(win.appType); uniqueApps.push(win); }
        else {
            const idx = uniqueApps.findIndex(u => u.appType === win.appType);
            if (idx >= 0 && win.zIndex > uniqueApps[idx].zIndex) uniqueApps[idx] = win;
        }
    });
    uniqueApps.forEach(win => {
        const btn = document.createElement('button');
        btn.className = 'taskbar-btn';
        if (win.id === Win12.activeWindowId && !win.isMinimized) btn.classList.add('active-app');
        if (win.isMinimized) btn.classList.add('minimized-app');
        btn.title = win.title;
        const icons = {
            explorer: '📁', browser: '🌐', settings: '⚙️', notepad: '📝', recycle: '🗑️',
            calculator: '🧮', photos: '🖼️', music: '🎵', video: '🎬', store: '🛒',
            terminal: '💻', calendar: '📅', weather: '☁️'
        };
        btn.textContent = icons[win.appType] || '📄';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (win.isMinimized) restoreWindow(win.id);
            else if (win.id === Win12.activeWindowId) minimizeWindow(win.id);
            else bringToFront(win.id);
        });
        taskbarAppsEl.appendChild(btn);
    });
}

// ---------- App launcher ----------
const appConfigs = {
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

function openApp(appType) {
    const config = appConfigs[appType] || {
        title: appType.charAt(0).toUpperCase() + appType.slice(1),
        width: 600, height: 400
    };
    createWindow(appType, config.title, config.width, config.height);
}

// ---------- Content dispatcher ----------
function loadAppContent(win, container) {
    switch (win.appType) {
        case 'explorer': loadFilesIntoExplorer(container); break;
        case 'browser': new BrowserApp(container, win); break;
        case 'settings': loadSettingsIntoWindow(container); break;
        case 'notepad': loadNotesIntoWindow(container); break;
        case 'recycle': container.innerHTML = `<div style="text-align:center;padding:30px;">🗑️ Recycle Bin<br><small>No items</small></div>`; break;
        case 'calculator': loadCalculator(container, win); break;
        case 'terminal': new Terminal(container, win); break;
        case 'store': new StoreApp(container, win); break;
        case 'music': new MusicApp(container, win); break;
        case 'gallery': new GalleryApp(container, win); break;
        case 'calendar': new CalendarApp(container, win); break;
        case 'mail': new MailApp(container, win); break;
        case 'paint': new PaintApp(container, win); break;
        case 'assistant': new AIAssistant(container, win); break;
        default: container.innerHTML = `<div style="text-align:center;padding:30px;">${sanitize(win.title)}</div>`;
    }
}

// Expose globally
window.setupWindowManager = setupWindowManager;
window.createWindow = createWindow;
window.renderWindow = renderWindow;
window.bringToFront = bringToFront;
window.minimizeWindow = minimizeWindow;
window.restoreWindow = restoreWindow;
window.toggleMaximizeWindow = toggleMaximizeWindow;
window.closeWindow = closeWindow;
window.updateTaskbarApps = updateTaskbarApps;
window.openApp = openApp;
window.loadAppContent = loadAppContent;