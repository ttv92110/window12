// desktop-icons.js – draggable desktop icons with throttled position save

let iconPositions = {};
let saveTimer = null;
const SAVE_DELAY = 1500;   // save 1.5 seconds after last drag movement
let lastSavedPositions = {};  // prevent duplicate saves

async function loadIconPositions() {
    try {
        const s = await api.get('/settings/');
        if (s.icon_positions) {
            iconPositions = JSON.parse(s.icon_positions);
            lastSavedPositions = { ...iconPositions };
        }
    } catch (e) {
        iconPositions = {};
    }
    initDesktopIcons();
}

function initDesktopIcons() {
    const container = document.getElementById('desktop-icons');
    if (!container) return;

    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';

    const icons = container.querySelectorAll('.desktop-icon');
    icons.forEach((icon, index) => {
        icon.style.position = 'absolute';
        const app = icon.dataset.app;

        const saved = iconPositions[app];
        if (saved) {
            icon.style.left = saved.x + 'px';
            icon.style.top = saved.y + 'px';
        } else {
            const col = index % 3;
            const row = Math.floor(index / 3);
            icon.style.left = (10 + col * 95) + 'px';
            icon.style.top = (10 + row * 95) + 'px';
        }

        makeIconDraggable(icon, app);
    });
}

function makeIconDraggable(icon, app) {
    let offsetX, offsetY;
    let startX, startY;  // original position at drag start
    icon.addEventListener('mousedown', (e) => {
        if (e.detail > 1) return;
        e.preventDefault();

        const rect = icon.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        startX = parseInt(icon.style.left) || 0;
        startY = parseInt(icon.style.top) || 0;

        const onMouseMove = (ev) => {
            const container = document.getElementById('desktop-icons');
            const containerRect = container.getBoundingClientRect();
            let newLeft = ev.clientX - containerRect.left - offsetX;
            let newTop = ev.clientY - containerRect.top - offsetY;

            newLeft = Math.max(0, Math.min(newLeft, containerRect.width - icon.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, containerRect.height - icon.offsetHeight));

            icon.style.left = newLeft + 'px';
            icon.style.top = newTop + 'px';

            // Reset timer: save will happen only after mouse stops moving for SAVE_DELAY ms
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                if (hasPositionChanged(app)) {
                    saveIconPositionsNow();
                }
            }, SAVE_DELAY);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Save immediately if position changed from start
            const curLeft = parseInt(icon.style.left) || 0;
            const curTop = parseInt(icon.style.top) || 0;
            if (curLeft !== startX || curTop !== startY) {
                saveIconPositionsNow();
            }
            clearTimeout(saveTimer);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    icon.addEventListener('dragstart', (e) => e.preventDefault());
}

function hasPositionChanged(app) {
    const icon = document.querySelector(`.desktop-icon[data-app="${app}"]`);
    if (!icon) return false;
    const curLeft = parseInt(icon.style.left) || 0;
    const curTop = parseInt(icon.style.top) || 0;
    const saved = lastSavedPositions[app];
    if (!saved) return true;
    return curLeft !== saved.x || curTop !== saved.y;
}

function saveIconPositionsNow() {
    const icons = document.querySelectorAll('#desktop-icons .desktop-icon');
    const positions = {};
    icons.forEach(icon => {
        const app = icon.dataset.app;
        positions[app] = {
            x: parseInt(icon.style.left) || 0,
            y: parseInt(icon.style.top) || 0
        };
    });
    // Only send if something actually changed (compare with last saved)
    if (JSON.stringify(positions) !== JSON.stringify(lastSavedPositions)) {
        lastSavedPositions = { ...positions };
        iconPositions = positions;
        queueSettingsUpdate({ icon_positions: JSON.stringify(positions) });
    }
}