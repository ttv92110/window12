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

async function renderExplorerView(container, vfs, folderId) {
    const state = Win12.explorerState.get(container.dataset.windowId);
    if (!state) return;
    state.currentFolderId = folderId;
    Win12.explorerState.set(container.dataset.windowId, state);

    const items = vfs.getFolderContents(folderId);
    const sortBy = state.sortBy || 'name';
    const sortDir = state.sortDir || 'asc';
    const sorted = sortFiles(items, sortBy, sortDir);

    const breadHTML = vfs.getBreadcrumbs(folderId).map((c, i) => {
        const isLast = i === breadcrumbs.length - 1;
        return `<span class="explorer-crumb" data-folder-id="${c.id}" style="cursor:pointer;${isLast ? 'color:#f1f5f9;font-weight:500;' : ''}">${sanitize(c.name)}</span>${isLast ? '' : ' › '}`;
    }).join('');
    const gridHTML = items.length === 0
        ? '<div style="text-align:center;color:#94a3b8;padding:20px;">This folder is empty</div>'
        : items.map(item => `
            <div class="explorer-file" data-id="${item.id}" data-type="${item.type}" draggable="true">
                <div class="file-icon">${item.type === 'folder' ? '📁' : '📄'}</div>
                <div class="file-name">${sanitize(item.name)}</div>
            </div>
        `).join('');

    const filesGrid = document.createElement('div');
    filesGrid.className = 'explorer-files-grid';
    filesGrid.style.cssText = 'min-height: 300px;';

    container.innerHTML = `<div class="explorer-breadcrumb">${breadHTML}</div>`;
    container.appendChild(filesGrid);
    filesGrid.innerHTML = gridHTML;

    attachExplorerEvents(container, vfs, folderId);
    attachDragAndDrop(container, vfs, folderId);
    attachAddressBar(container, vfs);
    attachSorting(container, vfs, folderId);
    attachViewMode(container, vfs, folderId);
}

function attachDragAndDrop(container, vfs, folderId) {
    const filesContainer = container.querySelector('.explorer-files');
    // Make files draggable
    container.querySelectorAll('.explorer-file').forEach(el => {
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ id: el.dataset.id, type: el.dataset.type }));
            e.dataTransfer.effectAllowed = 'move';
        });
    });
    // Make folder drop target
    filesContainer.addEventListener('dragover', (e) => e.preventDefault());
    filesContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (!data) return;
        // Move dragged file to current folder
        await api.put(`/files/${data.id}`, { parent_id: folderId });
        refreshCurrentExplorer(container);
    });
}

function attachExplorerEvents(container, vfs, folderId) {
    container.querySelectorAll('.explorer-crumb').forEach(crumb => {
        crumb.addEventListener('click', () => {
            renderExplorerView(container, vfs, crumb.dataset.folderId);
        });
    });

    // ==================== DRAG & DROP SUPPORT ====================
    const filesGrid = container.querySelector('.explorer-files-grid');
    if (filesGrid) {
        // Drag start - capture selected file
        filesGrid.addEventListener('dragstart', (e) => {
            const fileEl = e.target.closest('.explorer-file');
            if (!fileEl) return;
            const fileId = fileEl.dataset.id;
            const file = vfs.getFileById(fileId);
            if (!file) return;

            e.dataTransfer.effectAllowed = 'moveAndCopy';
            e.dataTransfer.setData('application/json', JSON.stringify({
                sourceFileId: fileId,
                sourceFolderId: folderId,
                fileName: file.name,
                type: file.type,
            }));
            fileEl.style.opacity = '0.5';
        });

        // Drag over - visual feedback
        filesGrid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            filesGrid.style.background = 'rgba(139, 92, 246, 0.1)';
        });

        // Drag leave - reset styling
        filesGrid.addEventListener('dragleave', (e) => {
            if (e.target === filesGrid) {
                filesGrid.style.background = 'transparent';
            }
        });

        // Drop - move file
        filesGrid.addEventListener('drop', async (e) => {
            e.preventDefault();
            filesGrid.style.background = 'transparent';

            const dragData = e.dataTransfer.getData('application/json');
            if (!dragData) return;

            try {
                const { sourceFileId, sourceFolderId } = JSON.parse(dragData);
                const targetFolderId = folderId;

                // Check if dropping on a specific folder
                const targetEl = e.target.closest('.explorer-file');
                let actualTargetId = targetFolderId;
                if (targetEl) {
                    const targetId = targetEl.dataset.id;
                    const targetFile = vfs.getFileById(targetId);
                    if (targetFile && targetFile.type === 'folder') {
                        actualTargetId = targetId;
                    }
                }

                // Don't allow moving to same location
                if (sourceFileId === actualTargetId) return;

                // Update backend
                await api.put(`/files/${sourceFileId}`, { parent_id: actualTargetId });
                Win12.addHistory('move', [{ id: sourceFileId }], { targetParentId: actualTargetId });

                // Refresh view
                await refreshCurrentExplorer(container);
            } catch (err) {
                console.error('Drag-drop error:', err);
                await Win12.error('Move Failed', `Could not move file: ${err.message}`);
            }
        });

        // End drag
        filesGrid.addEventListener('dragend', (e) => {
            const fileEl = e.target.closest('.explorer-file');
            if (fileEl) fileEl.style.opacity = '1';
            filesGrid.style.background = 'transparent';
        });
    }

    // File interactions
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
        const result = await Win12.confirm('Delete Item?', `Are you sure you want to delete "${file.name}"? This will move it to Recycle Bin.`);
        if (result === 'yes') {
            await api.put(`/files/${fileId}`, { parent_id: 'recycle_bin' });
            Win12.addHistory('delete', [file], { originalParentId: file.parent_id });
            refreshCurrentExplorer(container);
        }
    }, '🗑️');

    // New Folder (if current is a folder)
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