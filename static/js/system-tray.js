// system-tray.js – interactive volume & network tray icons

let isMuted = false;

function initSystemTray() {
    const volumeIcon = document.querySelector('.tray-icon[title="Volume"]');
    if (volumeIcon) {
        volumeIcon.style.cursor = 'pointer';
        volumeIcon.addEventListener('click', () => {
            isMuted = !isMuted;
            volumeIcon.textContent = isMuted ? '🔇' : '🔊';
            api.put('/settings/', queueSettingsUpdate({ volume_muted: isMuted }));
            showToast(isMuted ? 'Muted' : 'Unmuted', 'Volume changed');
        });
    }

    const networkIcon = document.querySelector('.tray-icon[title="Network"]');
    if (networkIcon) {
        networkIcon.style.cursor = 'pointer';
        networkIcon.title = 'Network: Connected';
        networkIcon.addEventListener('click', () => {
            alert('🌐 Network Status: Connected\nSignal: Excellent');
        });
    }

    loadMuteState();
}

async function loadMuteState() {
    try {
        const s = await api.get('/settings/');
        if (s.volume_muted !== undefined) {
            isMuted = s.volume_muted === true || s.volume_muted === 'True';
            const volumeIcon = document.querySelector('.tray-icon[title="Volume"]');
            if (volumeIcon) volumeIcon.textContent = isMuted ? '🔇' : '🔊';
        }
    } catch (e) { }
}