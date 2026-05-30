class BrowserApp {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.tabs = [];
        this.activeTabId = null;
        this.tabCounter = 0;
        this.initUI();
        this.addTab('https://www.google.com/webhp?igu=1');
    }

    initUI() {
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.style.background = '#1a1a2e';
        this.container.style.overflow = 'hidden';

        // ----- Tab bar -----
        const tabBar = document.createElement('div');
        tabBar.className = 'browser-tabbar';
        tabBar.style.cssText = 'display:flex; align-items:center; background:rgba(0,0,0,0.4); border-bottom:1px solid rgba(255,255,255,0.1); padding:0 4px; overflow-x:auto; gap:2px;';
        tabBar.innerHTML = `
            <button class="new-tab-btn" title="New Tab" style="background:transparent; border:none; color:#94a3b8; font-size:18px; padding:6px 10px; cursor:pointer; border-radius:6px;">+</button>
        `;
        this.tabBar = tabBar;
        this.container.appendChild(tabBar);

        // ----- Navigation bar -----
        const navBar = document.createElement('div');
        navBar.style.cssText = 'display:flex; align-items:center; gap:6px; padding:6px 10px; background:rgba(0,0,0,0.2);';
        navBar.innerHTML = `
            <button class="nav-btn back-btn" title="Back" style="background:transparent; border:none; color:#cbd5e1; font-size:16px; padding:4px 8px; cursor:pointer; border-radius:4px;">◀</button>
            <button class="nav-btn forward-btn" title="Forward" style="background:transparent; border:none; color:#cbd5e1; font-size:16px; padding:4px 8px; cursor:pointer; border-radius:4px;">▶</button>
            <button class="nav-btn refresh-btn" title="Refresh" style="background:transparent; border:none; color:#cbd5e1; font-size:16px; padding:4px 8px; cursor:pointer; border-radius:4px;">🔄</button>
            <input type="text" class="address-bar" placeholder="Search or enter URL" style="flex:1; padding:6px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.08); color:#f1f5f9; outline:none; font-size:13px;">
            <button class="nav-btn go-btn" title="Go" style="background:var(--accent); border:none; color:#fff; font-size:14px; padding:6px 14px; cursor:pointer; border-radius:20px;">Go</button>
        `;
        this.addressBar = navBar.querySelector('.address-bar');
        this.container.appendChild(navBar);

        // ----- Content area (tab content) -----
        this.contentArea = document.createElement('div');
        this.contentArea.style.cssText = 'flex:1; position:relative; background:#fff;';
        this.container.appendChild(this.contentArea);

        // ----- Event listeners -----
        tabBar.querySelector('.new-tab-btn').addEventListener('click', () => this.addTab('about:blank'));

        navBar.querySelector('.back-btn').addEventListener('click', () => this.navigateBack());
        navBar.querySelector('.forward-btn').addEventListener('click', () => this.navigateForward());
        navBar.querySelector('.refresh-btn').addEventListener('click', () => this.refreshTab());
        navBar.querySelector('.go-btn').addEventListener('click', () => this.navigateToUrl(this.addressBar.value));

        this.addressBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.navigateToUrl(this.addressBar.value);
        });
    }

    // ----- Tab management -----
    addTab(url) {
        const tabId = ++this.tabCounter;
        const tab = {
            id: tabId,
            url: url,
            title: 'New Tab',
            history: [url],
            historyIndex: 0
        };
        this.tabs.push(tab);

        // Create tab element
        const tabEl = document.createElement('div');
        tabEl.className = 'browser-tab';
        tabEl.dataset.tabId = tabId;
        tabEl.style.cssText = 'display:flex; align-items:center; gap:6px; padding:6px 12px; background:rgba(255,255,255,0.08); border-radius:8px 8px 0 0; cursor:pointer; color:#cbd5e1; font-size:12px; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
        tabEl.innerHTML = `
            <span class="tab-title" style="flex:1; overflow:hidden; text-overflow:ellipsis;">New Tab</span>
            <button class="close-tab-btn" style="background:transparent; border:none; color:#94a3b8; font-size:12px; cursor:pointer; padding:0;">✕</button>
        `;
        tabEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-tab-btn')) return;
            this.switchTab(tabId);
        });
        tabEl.querySelector('.close-tab-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tabId);
        });

        // Insert before the "+" button
        const newTabBtn = this.tabBar.querySelector('.new-tab-btn');
        this.tabBar.insertBefore(tabEl, newTabBtn);

        // Switch to new tab
        this.switchTab(tabId);

        // Load URL
        if (url !== 'about:blank') {
            this.navigateToUrl(url);
        }
    }

    switchTab(tabId) {
        // Update active state
        this.tabBar.querySelectorAll('.browser-tab').forEach(el => {
            el.style.background = 'rgba(255,255,255,0.08)';
            el.style.color = '#cbd5e1';
        });
        const activeEl = this.tabBar.querySelector(`.browser-tab[data-tab-id="${tabId}"]`);
        if (activeEl) {
            activeEl.style.background = 'rgba(255,255,255,0.2)';
            activeEl.style.color = '#fff';
        }

        // Hide all iframes, show the active one
        this.contentArea.querySelectorAll('iframe').forEach(iframe => {
            iframe.style.display = 'none';
        });
        const activeIframe = document.getElementById(`browser-frame-${tabId}`);
        if (activeIframe) {
            activeIframe.style.display = 'block';
            this.addressBar.value = activeIframe.src || '';
        }

        this.activeTabId = tabId;
    }

    closeTab(tabId) {
        if (this.tabs.length <= 1) {
            // Close the window if last tab
            if (typeof closeWindow === 'function') {
                closeWindow(this.win.id);
            }
            return;
        }

        // Remove tab
        this.tabs = this.tabs.filter(t => t.id !== tabId);
        const tabEl = this.tabBar.querySelector(`.browser-tab[data-tab-id="${tabId}"]`);
        if (tabEl) tabEl.remove();
        const iframe = document.getElementById(`browser-frame-${tabId}`);
        if (iframe) iframe.remove();

        // Switch to another tab
        if (tabId === this.activeTabId) {
            const newActive = this.tabs[this.tabs.length - 1];
            this.switchTab(newActive.id);
        }
    }

    // ----- Navigation -----
    navigateToUrl(rawUrl) {
        if (!rawUrl) return;
        let url = rawUrl.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            // If it contains a dot, assume it's a domain
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
            } else {
                // Search Google
                url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
            }
        }

        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (!tab) return;

        // Update history
        if (tab.historyIndex < tab.history.length - 1) {
            tab.history = tab.history.slice(0, tab.historyIndex + 1);
        }
        tab.history.push(url);
        tab.historyIndex++;
        tab.url = url;

        // Create or update iframe
        let iframe = document.getElementById(`browser-frame-${this.activeTabId}`);
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = `browser-frame-${this.activeTabId}`;
            iframe.style.cssText = 'width:100%; height:100%; border:none;';
            // iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms allow-modals');
            this.contentArea.appendChild(iframe);
        }
        iframe.src = url;
        this.addressBar.value = url;

        // Update tab title
        const tabEl = this.tabBar.querySelector(`.browser-tab[data-tab-id="${this.activeTabId}"]`);
        if (tabEl) {
            const titleSpan = tabEl.querySelector('.tab-title');
            try {
                const domain = new URL(url).hostname;
                titleSpan.textContent = domain;
                tab.title = domain;
            } catch (e) {
                titleSpan.textContent = url.substring(0, 30);
            }
        }
    }

    navigateBack() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (!tab || tab.historyIndex <= 0) return;
        tab.historyIndex--;
        const url = tab.history[tab.historyIndex];
        this.loadUrlSilently(url);
    }

    navigateForward() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (!tab || tab.historyIndex >= tab.history.length - 1) return;
        tab.historyIndex++;
        const url = tab.history[tab.historyIndex];
        this.loadUrlSilently(url);
    }

    refreshTab() {
        const iframe = document.getElementById(`browser-frame-${this.activeTabId}`);
        if (iframe) {
            iframe.src = iframe.src;
        }
    }

    loadUrlSilently(url) {
        const iframe = document.getElementById(`browser-frame-${this.activeTabId}`);
        if (iframe) {
            iframe.src = url;
        }
        this.addressBar.value = url;
    }
}