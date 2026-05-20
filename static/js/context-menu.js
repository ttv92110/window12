// context-menu.js – desktop right‑click menu

let contextMenu;

function showContextMenu(x, y) {
    contextMenu = document.getElementById('context-menu');
    if (!contextMenu) return;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('visible');
}

function hideContextMenu() {
    if (contextMenu) contextMenu.classList.remove('visible');
}

document.addEventListener('click', (e) => {
    if (contextMenu && !contextMenu.contains(e.target)) hideContextMenu();
});

document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.window') || e.target.closest('#taskbar') || e.target.closest('#start-menu') ||
        e.target.closest('#widgets-panel') || e.target.closest('#notification-panel') || e.target.closest('#context-menu') ||
        e.target.closest('#lock-screen') || e.target.closest('#boot-screen')) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
});

window.hideContextMenu = hideContextMenu;
window.showContextMenu = showContextMenu;