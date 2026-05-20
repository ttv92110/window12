// taskbar-pins.js – pinning apps to taskbar, persistence

let pinnedApps = [];

async function loadPinnedApps() {
    try {
        const s = await api.get('/settings/');
        if (s.pinned_apps) {
            pinnedApps = JSON.parse(s.pinned_apps);
        } else {
            pinnedApps = ['explorer', 'browser', 'settings'];
        }
    } catch (e) {
        pinnedApps = ['explorer', 'browser', 'settings'];
    }
    refreshPinnedTaskbarIcons();
}

function savePinnedApps() {
    queueSettingsUpdate({ pinned_apps: JSON.stringify(pinnedApps) });
}

function refreshPinnedTaskbarIcons() {
    const container = document.getElementById('pinned-apps');
    if (!container) return;
    container.innerHTML = '';

    pinnedApps.forEach(app => {
        const def = startMenuApps.find(a => a.app === app);
        if (!def) return;

        const btn = document.createElement('button');
        btn.className = 'taskbar-btn';
        btn.title = def.name;
        btn.textContent = def.icon;
        btn.addEventListener('click', () => openApp(app));

        // Right-click → custom menu
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showPinnedContextMenu(e.clientX, e.clientY, app, def.name);
        });

        container.appendChild(btn);
    });
}

function showPinnedContextMenu(x, y, appName, appDisplayName) {
    const existing = document.getElementById('pinned-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'pinned-context-menu';
    menu.style.cssText = `position:fixed; left:${x}px; top:${y}px; background:rgba(30,30,50,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:4px 0; min-width:150px; z-index:9000;`;

    const unpinItem = document.createElement('div');
    unpinItem.style.cssText = 'padding:8px 16px; cursor:pointer; color:#cbd5e1; font-size:13px;';
    unpinItem.textContent = `📌 Unpin from taskbar`;
    unpinItem.addEventListener('mouseenter', () => unpinItem.style.background = 'rgba(255,255,255,0.1)');
    unpinItem.addEventListener('mouseleave', () => unpinItem.style.background = 'transparent');
    unpinItem.addEventListener('click', () => {
        pinnedApps = pinnedApps.filter(a => a !== appName);
        savePinnedApps();
        refreshPinnedTaskbarIcons();
        menu.remove();
    });
    menu.appendChild(unpinItem);

    document.body.appendChild(menu);
    document.addEventListener('click', function close(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', close);
        }
    });
}

function pinApp(appName) {
    if (!pinnedApps.includes(appName)) {
        pinnedApps.push(appName);
        savePinnedApps();
        refreshPinnedTaskbarIcons();
    }
}

function unpinApp(appName) {
    pinnedApps = pinnedApps.filter(a => a !== appName);
    savePinnedApps();
    refreshPinnedTaskbarIcons();
}