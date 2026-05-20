// settings-app.js – Settings window

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
    const accentInp = document.getElementById('setting-accent-color');
    const snapChk = document.getElementById('setting-snap-enabled');
    const autoChk = document.getElementById('setting-taskbar-autohide');

    const save = async () => {
        queueSettingsUpdate({
            wallpaper: wallpaperInp?.value,
            theme: themeSel?.value,
            transparency: transChk?.checked,
            accent_color: accentInp?.value,
            snap_enabled: snapChk?.checked,
            taskbar_autohide: autoChk?.checked
        });
        if (typeof applySettings === 'function') applySettings({
            wallpaper: wallpaperInp?.value,
            theme: themeSel?.value,
            transparency: transChk?.checked,
            accent_color: accentInp?.value,
            snap_enabled: snapChk?.checked,
            taskbar_autohide: autoChk?.checked
        });
    };
    [wallpaperInp, themeSel, transChk, accentInp, snapChk, autoChk].forEach(el => {
        if (el) el.addEventListener('change', save);
    });
}

function applySettings(settings) {
    if (settings.wallpaper) {
        document.getElementById('desktop').style.backgroundImage = `url(${settings.wallpaper})`;
    }
    if (settings.accent_color) {
        document.documentElement.style.setProperty('--accent', settings.accent_color);
    }
    const taskbar = document.getElementById('taskbar');
    if (taskbar) {
        taskbar.classList.toggle('autohide', settings.taskbar_autohide === true || settings.taskbar_autohide === 'True');
    }
    Win12.snapEnabled = settings.snap_enabled !== false && settings.snap_enabled !== 'False';
    // transparency – we can toggle a CSS class or variable
    document.documentElement.style.setProperty('--glass-bg', settings.transparency === false || settings.transparency === 'False' ? 'rgba(30,30,50,0.9)' : 'rgba(30,30,50,0.65)');
}

window.applySettings = applySettings;