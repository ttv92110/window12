// file-explorer.js – File Explorer window, virtual file system, file operations

async function loadFilesIntoExplorer(container) {
    const winId = container.dataset.windowId;
    try {
        const files = await api.get('/files/');
        const vfs = new VirtualFileSystem(files);
        const state = Win12.explorerState.get(winId) || { currentFolderId: 'root' };
        state.vfs = vfs;
        Win12.explorerState.set(winId, state);
        renderExplorerView(container, vfs, state.currentFolderId);
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;">Error loading files</div>';
    }
}

function renderExplorerView(container, vfs, folderId) {
    const state = Win12.explorerState.get(container.dataset.windowId);
    if (!state) return;
    state.currentFolderId = folderId;
    Win12.explorerState.set(container.dataset.windowId, state);
    const breadcrumbs = vfs.getBreadcrumbs(folderId);
    const items = vfs.getFolderContents(folderId);
    const breadHTML = breadcrumbs.map((c, i) => {
        const last = i === breadcrumbs.length - 1;
        return `<span class="explorer-crumb" data-folder-id="${c.id}" style="cursor:pointer;${last ? 'color:#f1f5f9;font-weight:500;' : ''}">${sanitize(c.name)}</span>${last ? '' : ' › '}`;
    }).join('');
    const gridHTML = items.length === 0
        ? '<div style="text-align:center;color:#94a3b8;padding:20px;">This folder is empty</div>'
        : items.map(item => `
            <div class="explorer-file" data-id="${item.id}" data-type="${item.type}">
                <div class="file-icon">${item.type === 'folder' ? '📁' : '📄'}</div>
                <div class="file-name">${sanitize(item.name)}</div>
            </div>
        `).join('');
    container.innerHTML = `<div class="explorer-breadcrumb">${breadHTML}</div><div class="explorer-files">${gridHTML}</div>`;
    attachExplorerEvents(container, vfs, folderId);
}

function attachExplorerEvents(container, vfs, folderId) {
    container.querySelectorAll('.explorer-crumb').forEach(crumb => {
        crumb.addEventListener('click', () => {
            renderExplorerView(container, vfs, crumb.dataset.folderId);
        });
    });
    container.querySelectorAll('.explorer-file').forEach(el => {
        el.addEventListener('dblclick', () => {
            const id = el.dataset.id;
            const type = el.dataset.type;
            if (type === 'folder') {
                renderExplorerView(container, vfs, id);
            } else {
                // Use global opener
                openFileById(id);
            }
        });
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showFileContextMenu(e.clientX, e.clientY, el.dataset.id, el.dataset.type, container);
        });
    });
}

async function openFileInNotepad(fileId) {
    try {
        const file = await api.get(`/files/${fileId}`);
        if (!file) return;
        const win = createWindow('notepad', `Notepad - ${file.name}`, 550, 400);
        window._pendingNotepadFile = { name: file.name, content: file.content };
        setTimeout(() => {
            const contentEl = win._el.querySelector('.window-content');
            if (contentEl) {
                contentEl.innerHTML = `<textarea style="width:100%; height:100%; background:rgba(0,0,0,0.2); border:none; color:#e2e8f0; padding:16px; resize:none; outline:none;">${escapeHtml(file.content)}</textarea>`;
                const textarea = contentEl.querySelector('textarea');
                textarea.addEventListener('input', debounce(async (e) => {
                    await api.put(`/files/${fileId}`, { content: e.target.value });
                }, 1000));
            }
        }, 100);
    } catch (e) {
        console.error('Error opening file', e);
    }
}

function showFileContextMenu(x, y, fileId, fileType, container) {
    const existing = document.getElementById('file-context-menu');
    if (existing) existing.remove();
    const menu = document.createElement('div');
    menu.id = 'file-context-menu';
    menu.style.cssText = `position:fixed; left:${x}px; top:${y}px; background:rgba(30,30,50,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:4px 0; min-width:150px; z-index:8001;`;
    const addItem = (text, action) => {
        const item = document.createElement('div');
        item.className = 'context-item';
        item.textContent = text;
        item.style.cssText = 'padding:8px 16px; cursor:pointer; color:#cbd5e1; font-size:13px;';
        item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.1)');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', action);
        menu.appendChild(item);
    };
    addItem('Rename', async () => {
        const newName = prompt('Enter new name:');
        if (newName) {
            await api.put(`/files/${fileId}`, { name: newName });
            refreshCurrentExplorer(container);
        }
        menu.remove();
    });
    addItem('Delete', async () => {
        if (confirm('Delete this item?')) {
            await api.delete(`/files/${fileId}`);
            refreshCurrentExplorer(container);
        }
        menu.remove();
    });
    addItem('Copy', async () => {
        await api.post(`/files/${fileId}/copy`);
        refreshCurrentExplorer(container);
        menu.remove();
    });
    if (fileType === 'folder') {
        addItem('New Folder here', async () => {
            const name = prompt('Folder name:');
            if (name) {
                await api.post('/files/', { name, type: 'folder', parent_id: fileId });
                refreshCurrentExplorer(container);
            }
            menu.remove();
        });
        addItem('New File here', async () => {
            const name = prompt('File name:');
            if (name) {
                await api.post('/files/', { name, type: 'file', parent_id: fileId, content: '' });
                refreshCurrentExplorer(container);
            }
            menu.remove();
        });
    }
    document.body.appendChild(menu);
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

async function refreshCurrentExplorer(container) {
    const winId = container.dataset.windowId;
    const state = Win12.explorerState.get(winId);
    if (state) {
        const files = await api.get('/files/');
        state.vfs.refresh(files);
        renderExplorerView(container, state.vfs, state.currentFolderId);
    }
}