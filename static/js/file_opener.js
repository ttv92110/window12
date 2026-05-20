// file_opener.js — universal file opener

async function openFileById(fileId) {
    try {
        const file = await api.get(`/files/${fileId}`);
        if (!file) throw new Error('File not found');
        openFile(file);
    } catch (e) {
        alert('Could not open file: ' + e.message);
    }
}

function openFile(file) {
    const appType = getAppForFile(file);
    if (!appType) {
        // Unknown extension — show “Open with” dialog (simplified)
        showOpenWithDialog(file);
        return;
    }

    if (appType === 'explorer') {
        // Navigate to folder in existing/new explorer
        openFolderInExplorer(file);
        return;
    }

    // Launch the app with the file
    openApp(appType, { file });
}

function showOpenWithDialog(file) {
    // Simple prompt: list common apps
    const choice = prompt(`Cannot open "${file.name}". Choose app:\n1. Notepad\n2. Browser\n3. Code Editor`, "1");
    if (choice === '1') openApp('notepad', { file });
    else if (choice === '2') openApp('browser', { file });
    else if (choice === '3') openApp('code_editor', { file });
    else alert('No app selected.');
}

function openFolderInExplorer(folder) {
    // Open a new explorer window and navigate to the folder
    const win = openApp('explorer');
    if (win) {
        // After window created, navigate to folder ID
        setTimeout(() => {
            const contentEl = win._el.querySelector('.window-content');
            if (contentEl && contentEl.dataset.windowId) {
                const state = Win12.explorerState.get(contentEl.dataset.windowId);
                if (state && state.vfs) {
                    renderExplorerView(contentEl, state.vfs, folder.id);
                }
            }
        }, 200);
    }
}