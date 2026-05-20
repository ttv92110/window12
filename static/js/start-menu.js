// start-menu.js – start menu, search

const startMenuApps = [
    { name: 'File Explorer', icon: '📁', app: 'explorer', color: '#f59e0b' },
    { name: 'Edge Browser', icon: '🌐', app: 'browser', color: '#3b82f6' },
    { name: 'Settings', icon: '⚙️', app: 'settings', color: '#6b7280' },
    { name: 'Notepad', icon: '📝', app: 'notepad', color: '#10b981' },
    { name: 'Calculator', icon: '🧮', app: 'calculator', color: '#8b5cf6' },
    { name: 'Photos', icon: '🖼️', app: 'gallery', color: '#ec4899' },
    { name: 'Music Player', icon: '🎵', app: 'music', color: '#06b6d4' },
    { name: 'Terminal', icon: '💻', app: 'terminal', color: '#1e293b' },
    { name: 'App Store', icon: '🛒', app: 'store', color: '#14b8a6' },
    { name: 'Calendar', icon: '📅', app: 'calendar', color: '#f97316' },
    { name: 'Mail', icon: '📧', app: 'mail', color: '#3b82f6' },
    { name: 'Paint', icon: '🎨', app: 'paint', color: '#ec4899' },
    { name: 'AI Assistant', icon: '🤖', app: 'assistant', color: '#8b5cf6' }
];

function populateStartMenu() {
    const grid = document.getElementById('start-apps-grid');
    if (!grid) return;
    grid.innerHTML = '';

    startMenuApps.forEach(app => {
        const div = document.createElement('div');
        div.className = 'start-app-item';
        div.innerHTML = `<div class="app-icon" style="background:${app.color};color:#fff;">${app.icon}</div><div class="app-name">${app.name}</div>`;

        // Left click → open app
        div.addEventListener('click', () => {
            openApp(app.app);
            closeStartMenu();
        });

        // Right click → pin/unpin
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const menu = document.createElement('div');
            menu.style.cssText = 'position:fixed; background:rgba(30,30,50,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:4px 0; z-index:9000; left:' + e.clientX + 'px; top:' + e.clientY + 'px; min-width:180px;';

            const isPinned = typeof pinnedApps !== 'undefined' && pinnedApps.includes(app.app);
            const pinItem = document.createElement('div');
            pinItem.style.cssText = 'padding:8px 16px; cursor:pointer; color:#cbd5e1; font-size:13px;';
            pinItem.textContent = isPinned ? '📌 Unpin from taskbar' : '📌 Pin to taskbar';
            pinItem.addEventListener('click', () => {
                if (isPinned) {
                    if (typeof unpinApp === 'function') unpinApp(app.app);
                } else {
                    if (typeof pinApp === 'function') pinApp(app.app);
                }
                menu.remove();
            });
            menu.appendChild(pinItem);
            document.body.appendChild(menu);

            const closeMenu = (ev) => {
                if (!menu.contains(ev.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            setTimeout(() => document.addEventListener('click', closeMenu), 0);
        });

        grid.appendChild(div);
    });
}

function openStartMenu() {
    const startMenu = document.getElementById('start-menu');
    if (!startMenu) return;
    Win12.isStartMenuOpen = true;
    startMenu.classList.add('open');
    showOverlay();
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.classList.add('active-app');
    const input = document.getElementById('start-search-input');
    if (input) { input.value = ''; input.focus(); }
}

function closeStartMenu() {
    Win12.isStartMenuOpen = false;
    document.getElementById('start-menu')?.classList.remove('open');
    document.getElementById('btn-start')?.classList.remove('active-app');
    hideOverlay();
    removeSearchResults();
}

function toggleStartMenu() {
    if (Win12.isStartMenuOpen) closeStartMenu();
    else openStartMenu();
}

// Attach listener on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.addEventListener('click', (e) => { e.stopPropagation(); toggleStartMenu(); });
    populateStartMenu();
});

// --- Search ---
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('start-search-input');
    if (!searchInput) return;
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length === 0) { removeSearchResults(); return; }
        searchTimeout = setTimeout(() => performSearch(query), 300);
    });
});

async function performSearch(query) {
    try {
        const results = await api.get(`/search?q=${encodeURIComponent(query)}`);
        showSearchResults(results);
    } catch (e) { }
}

function showSearchResults(results) {
    removeSearchResults();
    const startMenu = document.getElementById('start-menu');
    if (!startMenu) return;
    const dropdown = document.createElement('div');
    dropdown.id = 'search-dropdown';
    dropdown.style.cssText = 'position:absolute; top:70px; left:16px; right:16px; background:rgba(20,20,40,0.95); backdrop-filter:blur(30px); border-radius:12px; border:1px solid rgba(255,255,255,0.2); max-height:300px; overflow-y:auto; z-index:7000;';
    if (results.length === 0) {
        dropdown.innerHTML = '<div style="padding:12px;color:#94a3b8;">No results found</div>';
    } else {
        results.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.05);';
            row.innerHTML = `<span>${item.type === 'file' ? (item.file_type === 'folder' ? '📁' : '📄') : item.type === 'note' ? '📝' : '📦'}</span><span>${item.name || item.title}</span><small>${item.type}</small>`;
            row.addEventListener('click', () => {
                handleSearchResult(item);
                removeSearchResults();
                closeStartMenu();
            });
            dropdown.appendChild(row);
        });
    }
    startMenu.appendChild(dropdown);
}

function removeSearchResults() {
    document.getElementById('search-dropdown')?.remove();
}

function handleSearchResult(item) {
    if (item.type === 'file') openApp('explorer');
    else if (item.type === 'note') openApp('notepad');
    else if (item.type === 'app') openApp(item.name.toLowerCase().replace(/\s+/g, '-'));
}