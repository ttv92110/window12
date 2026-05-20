class StoreApp {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.loadStore();
    }

    async loadStore() {
        try {
            const apps = await api.get('/store/apps');
            this.renderApps(apps);
        } catch (e) {
            this.container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">Store unavailable</div>';
        }
    }

    renderApps(apps) {
        this.container.style.display = 'flex';
        this.container.style.flexWrap = 'wrap';
        this.container.style.gap = '12px';
        this.container.style.padding = '16px';
        this.container.style.overflowY = 'auto';
        this.container.innerHTML = '';

        apps.forEach(app => {
            const card = document.createElement('div');
            card.style.cssText = 'width:160px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:16px; text-align:center; display:flex; flex-direction:column; gap:8px; transition:background 0.2s;';
            card.innerHTML = `
                <div style="font-size:36px;">${app.icon}</div>
                <div style="font-weight:500; color:#f1f5f9;">${app.display_name}</div>
                <div style="font-size:11px; color:#94a3b8;">${app.category}</div>
                <button class="store-action-btn" style="margin-top:auto; padding:6px 12px; border-radius:8px; border:none; cursor:pointer; font-size:12px; ${app.installed ? 'background:rgba(255,255,255,0.1); color:#94a3b8;' : 'background:var(--accent); color:#fff;'
                }">${app.installed ? 'Uninstall' : 'Install'}</button>
            `;

            const btn = card.querySelector('.store-action-btn');
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = '...';
                try {
                    if (app.installed) {
                        await api.delete(`/store/uninstall/${app.app_name}`);
                        app.installed = false;
                        btn.textContent = 'Install';
                        btn.style.background = 'var(--accent)';
                        btn.style.color = '#fff';
                    } else {
                        await api.post(`/store/install/${app.app_name}`);
                        app.installed = true;
                        btn.textContent = 'Uninstall';
                        btn.style.background = 'rgba(255,255,255,0.1)';
                        btn.style.color = '#94a3b8';
                    }
                    // Refresh start menu after install/uninstall
                    if (typeof loadInstalledApps === 'function') loadInstalledApps();
                } catch (err) {
                    alert(`Error: ${err.message}`);
                    btn.textContent = app.installed ? 'Uninstall' : 'Install';
                }
                btn.disabled = false;
            });

            this.container.appendChild(card);
        });
    }
}