// settings-sync.js – throttled settings writer (respects Google Sheets quota)

let pendingSettings = {};
let syncTimer = null;
const MIN_SYNC_INTERVAL = 5000;   // 5 seconds between writes (quota = 60/min)

function queueSettingsUpdate(updates) {
    // Merge into pending
    Object.assign(pendingSettings, updates);
    scheduleSync();
}

function scheduleSync() {
    if (syncTimer) return;  // already scheduled
    syncTimer = setTimeout(() => {
        flushSettings();
    }, MIN_SYNC_INTERVAL);
}

async function flushSettings() {
    syncTimer = null;
    if (Object.keys(pendingSettings).length === 0) return;

    const toSend = { ...pendingSettings };
    pendingSettings = {};   // clear immediately so new updates can queue

    try {
        await api.put('/settings/', toSend);
    } catch (e) {
        // If failed (e.g., quota still exceeded), re-merge and retry later
        Object.assign(pendingSettings, toSend);
        scheduleSync();
    }
}

// Also provide an immediate flush for critical saves (like on window close)
async function flushSettingsNow() {
    if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
    }
    await flushSettings();
}

// Expose globally
window.queueSettingsUpdate = queueSettingsUpdate;
window.flushSettingsNow = flushSettingsNow;