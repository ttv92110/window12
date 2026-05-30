// file-explorer.js – File Explorer window with drag-drop, clipboard, and recycle bin support

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
        console.error('Error loading files:', e);
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
}

function attachExplorerEvents(container, vfs, folderId) {
    // Breadcrumb navigation
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

        // Drag & Drop
        let draggedItemId = null;
        container.querySelectorAll('.explorer-file').forEach(el => {
            el.setAttribute('draggable', 'true');
            el.addEventListener('dragstart', (e) => {
                draggedItemId = el.dataset.id;
                e.dataTransfer.setData('text/plain', draggedItemId);
                e.dataTransfer.effectAllowed = 'move';
            });
            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            el.addEventListener('drop', async (e) => {
                e.preventDefault();
                const targetId = el.dataset.id;
                const targetType = el.dataset.type;
                if (targetType === 'folder' && draggedItemId && draggedItemId !== targetId) {
                    // Move dragged file/folder into target folder
                    await api.put(`/files/${draggedItemId}`, { parent_id: targetId });
                    refreshCurrentExplorer(container);
                }
                draggedItemId = null;
            });
        });

        // Make entire container a drop target for desktop area
        const filesContainer = container.querySelector('.explorer-files');
        filesContainer.addEventListener('dragover', (e) => e.preventDefault());
        filesContainer.addEventListener('drop', async (e) => {
            e.preventDefault();
            const sourceId = e.dataTransfer.getData('text/plain');
            if (sourceId && folderId !== 'root') {
                await api.put(`/files/${sourceId}`, { parent_id: folderId });
                refreshCurrentExplorer(container);
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
        // Double-click to open
        el.addEventListener('dblclick', () => {
            const id = el.dataset.id;
            const type = el.dataset.type;
            if (type === 'folder') {
                renderExplorerView(container, vfs, id);
            } else {
                openFileById(id);
            }
        });

        // Right-click context menu
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showFileContextMenu(e.clientX, e.clientY, el.dataset.id, el.dataset.type, container, vfs);
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
        await Win12.error('Open Error', `Failed to open file: ${e.message}`);
    }
}

async function showFileContextMenu(x, y, fileId, fileType, container, vfs) {
    const existing = document.getElementById('file-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'file-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: rgba(30, 30, 50, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 4px 0;
        min-width: 180px;
        z-index: 8001;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    `;

    const addItem = (text, action, icon = '') => {
        const item = document.createElement('div');
        item.className = 'context-item';
        item.innerHTML = `${icon} ${text}`;
        item.style.cssText = `
            padding: 10px 16px;
            cursor: pointer;
            color: #cbd5e1;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.15s ease;
        `;
        item.addEventListener('mouseenter', () => {
            item.style.background = 'rgba(139, 92, 246, 0.2)';
            item.style.color = '#f1f5f9';
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
            item.style.color = '#cbd5e1';
        });
        item.addEventListener('click', async () => {
            try {
                await action();
            } catch (err) {
                console.error('Context menu action error:', err);
            }
            menu.remove();
        });
        menu.appendChild(item);
    };

    // Get file info for "Open With" submenu
    const file = vfs.getFileById(fileId);
    const appInfo = Win12.getAppForFile(file);

    // Open With
    if (fileType === 'file' && appInfo) {
        addItem(`Open with ${appInfo.app}`, async () => {
            if (appInfo.handler && typeof window[appInfo.handler] === 'function') {
                window[appInfo.handler](fileId);
            }
        }, '🚀');
    }

    // Copy
    addItem('Copy', async () => {
        Win12.copyToClipboard([file]);
    }, '📋');

    // Cut
    addItem('Cut', async () => {
        Win12.cutToClipboard([file]);
    }, '✂️');

    // Paste
    if (Win12.clipboard.files.length > 0 && fileType === 'folder') {
        addItem('Paste', async () => {
            await pasteFilesIntoFolder(fileId, container);
        }, '📌');
    }

    // Rename
    addItem('Rename', async () => {
        const newName = await promptModal('Rename File', `Enter new name for "${file.name}":`, file.name);
        if (newName && newName !== file.name) {
            await api.put(`/files/${fileId}`, { name: newName });
            Win12.addHistory('rename', [file], { oldName: file.name, newName });
            refreshCurrentExplorer(container);
        }
    }, '✏️');

    // Delete
    addItem('Delete', async () => {
        const result = await modal.show({
            title: 'Delete',
            message: `Move "${fileName}" to Recycle Bin?`,
            buttons: [
                { text: 'Yes', value: 'yes', primary: true },
                { text: 'No', value: 'no' }
            ]
        });
        if (result.button === 'yes') {
            await api.delete(`/files/${fileId}`);   // backend will move to trash
            refreshCurrentExplorer(container);
        }
        menu.remove();
    }, '🗑️');
    // addItem('Delete', async () => {
    //     const result = await Win12.confirm('Delete Item?', `Are you sure you want to delete "${file.name}"? This will move it to Recycle Bin.`);
    //     if (result === 'yes') {
    //         await api.put(`/files/${fileId}`, { parent_id: 'recycle_bin' });
    //         Win12.addHistory('delete', [file], { originalParentId: file.parent_id });
    //         refreshCurrentExplorer(container);
    //     }
    // }, '🗑️');

    // New Folder (if current is a folder)
    if (fileType === 'folder') {
        addItem('New Folder', async () => {
            const name = await promptModal('New Folder', 'Enter folder name:', 'New Folder');
            if (name) {
                await api.post('/files/', { name, type: 'folder', parent_id: fileId });
                Win12.addHistory('create', [{ name, type: 'folder', parent_id: fileId }]);
                refreshCurrentExplorer(container);
            }
        }, '📁');

        addItem('New File', async () => {
            const name = await promptModal('New File', 'Enter file name:', 'untitled.txt');
            if (name) {
                await api.post('/files/', { name, type: 'file', parent_id: fileId, content: '' });
                Win12.addHistory('create', [{ name, type: 'file', parent_id: fileId }]);
                refreshCurrentExplorer(container);
            }
        }, '📄');
    }

    document.body.appendChild(menu);
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

// Helper function: Modal-based prompt
async function promptModal(title, message, defaultValue = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 12px;
            padding: 24px;
            max-width: 380px;
            min-width: 300px;
        `;

        modal.innerHTML = `
            <h3 style="color: #f1f5f9; margin: 0 0 12px 0; font-size: 16px;">${sanitize(title)}</h3>
            <p style="color: #cbd5e1; font-size: 13px; margin: 0 0 16px 0;">${sanitize(message)}</p>
            <input type="text" id="modal-input" value="${sanitize(defaultValue)}" style="
                width: 100%;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 6px;
                color: #f1f5f9;
                box-sizing: border-box;
                margin-bottom: 16px;
            ">
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="modal-cancel" style="
                    padding: 8px 16px;
                    background: rgba(148, 163, 184, 0.1);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 6px;
                    color: #cbd5e1;
                    cursor: pointer;
                ">Cancel</button>
                <button id="modal-ok" style="
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                ">OK</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const input = modal.querySelector('#modal-input');
        input.focus();
        input.select();

        const okBtn = modal.querySelector('#modal-ok');
        const cancelBtn = modal.querySelector('#modal-cancel');

        const handleOk = () => {
            overlay.remove();
            resolve(input.value);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(null);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleOk();
        });
    });
}

async function pasteFilesIntoFolder(targetFolderId, container) {
    if (!Win12.clipboard.files || Win12.clipboard.files.length === 0) {
        await Win12.alert('Paste Failed', 'Clipboard is empty');
        return;
    }

    try {
        const action = Win12.clipboard.action;

        for (const file of Win12.clipboard.files) {
            if (action === 'copy') {
                // Copy: create a duplicate
                const copied = await api.post(`/files/${file.id}/copy`);
                await api.put(`/files/${copied.id}`, { parent_id: targetFolderId });
            } else if (action === 'cut') {
                // Cut: move the file
                await api.put(`/files/${file.id}`, { parent_id: targetFolderId });
            }
        }

        Win12.addHistory('paste', Win12.clipboard.files, { action, targetParentId: targetFolderId });
        Win12.clearClipboard();
        await refreshCurrentExplorer(container);
    } catch (err) {
        console.error('Paste error:', err);
        await Win12.error('Paste Failed', `Could not paste files: ${err.message}`);
    }
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