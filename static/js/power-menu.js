// power-menu.js – Power options dropdown for start menu

document.addEventListener('DOMContentLoaded', () => {
    const powerBtn = document.getElementById('power-btn');
    if (!powerBtn) return;

    powerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPowerMenu(e.clientX, e.clientY);
    });
});

function showPowerMenu(x, y) {
    const existing = document.getElementById('power-popup');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'power-popup';
    menu.style.cssText = `position:fixed; left:${x - 80}px; top:${y - 120}px; background:rgba(20,20,40,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:8px 0; min-width:160px; z-index:10000;`;

    const items = [
        { icon: '🔒', text: 'Lock', action: () => { menu.remove(); lockScreen(); } },
        { icon: '🚪', text: 'Logout', action: () => { menu.remove(); logout(); } },
        { icon: '😴', text: 'Sleep', action: () => { menu.remove(); lockScreen(); } },
        { icon: '🔄', text: 'Restart', action: () => { menu.remove(); location.reload(); } }
    ];

    items.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'padding:10px 16px; cursor:pointer; color:#cbd5e1; display:flex; gap:10px; font-size:14px;';
        row.innerHTML = `${item.icon} ${item.text}`;
        row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,255,255,0.1)');
        row.addEventListener('mouseleave', () => row.style.background = 'transparent');
        row.addEventListener('click', item.action);
        menu.appendChild(row);
    });

    document.body.appendChild(menu);
    document.addEventListener('click', function close(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', close);
        }
    });
}

function lockScreen() {
    // Show lock screen without losing state
    document.getElementById('lock-screen').classList.remove('hidden');
    document.getElementById('login-box').style.display = 'none';
    Win12.isLocked = true;
    document.getElementById('desktop').classList.add('blurred');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    authToken = null;
    location.reload();
}