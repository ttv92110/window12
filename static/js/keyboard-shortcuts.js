// keyboard-shortcuts.js – Global keyboard event handlers for system operations

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only trigger shortcuts when not typing in an input field
        const isInputElement = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
        
        // Ctrl+C - Copy
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isInputElement) {
            e.preventDefault();
            handleCopyShortcut();
        }
        
        // Ctrl+X - Cut
        if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !isInputElement) {
            e.preventDefault();
            handleCutShortcut();
        }
        
        // Ctrl+V - Paste
        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isInputElement) {
            e.preventDefault();
            handlePasteShortcut();
        }
        
        // Ctrl+Z - Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isInputElement) {
            e.preventDefault();
            handleUndoShortcut();
        }
        
        // Ctrl+Y - Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z')) && !isInputElement) {
            e.preventDefault();
            handleRedoShortcut();
        }
        
        // Alt+Tab - Switch windows (basic implementation)
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            handleWindowSwitchShortcut(e.shiftKey);
        }
    });
}

function handleCopyShortcut() {
    const activeWindow = getActiveExplorerWindow();
    if (!activeWindow) {
        Win12.alert('Copy', 'No active file explorer window');
        return;
    }
    
    const selectedFiles = getSelectedFilesFromExplorer(activeWindow);
    if (selectedFiles.length === 0) {
        Win12.alert('Copy', 'No files selected');
        return;
    }
    
    Win12.copyToClipboard(selectedFiles);
}

function handleCutShortcut() {
    const activeWindow = getActiveExplorerWindow();
    if (!activeWindow) {
        Win12.alert('Cut', 'No active file explorer window');
        return;
    }
    
    const selectedFiles = getSelectedFilesFromExplorer(activeWindow);
    if (selectedFiles.length === 0) {
        Win12.alert('Cut', 'No files selected');
        return;
    }
    
    Win12.cutToClipboard(selectedFiles);
}

function handlePasteShortcut() {
    const activeWindow = getActiveExplorerWindow();
    if (!activeWindow) {
        Win12.alert('Paste', 'No active file explorer window');
        return;
    }
    
    if (Win12.clipboard.files.length === 0) {
        Win12.alert('Paste', 'Clipboard is empty');
        return;
    }
    
    // Paste into current folder
    const state = Win12.explorerState.get(activeWindow.id);
    if (state) {
        pasteFilesIntoFolder(state.currentFolderId, activeWindow._el.querySelector('.window-content'));
    }
}

function handleUndoShortcut() {
    if (!Win12.canUndo()) {
        Win12.alert('Undo', 'Nothing to undo');
        return;
    }
    
    const historyItem = Win12.historyStack[Win12.historyIndex];
    Win12.historyIndex--;
    
    console.log(`↶ Undoing: ${historyItem.action}`);
    // Implementation: call rollback function based on historyItem.action
}

function handleRedoShortcut() {
    if (!Win12.canRedo()) {
        Win12.alert('Redo', 'Nothing to redo');
        return;
    }
    
    Win12.historyIndex++;
    const historyItem = Win12.historyStack[Win12.historyIndex];
    
    console.log(`↷ Redoing: ${historyItem.action}`);
    // Implementation: call replay function based on historyItem.action
}

function handleWindowSwitchShortcut(shiftKey) {
    if (Win12.windows.length === 0) return;
    
    const currentIndex = Win12.windows.findIndex(w => w.id === Win12.activeWindowId);
    let nextIndex;
    
    if (shiftKey) {
        // Shift+Tab - go backwards
        nextIndex = currentIndex <= 0 ? Win12.windows.length - 1 : currentIndex - 1;
    } else {
        // Tab - go forwards
        nextIndex = currentIndex >= Win12.windows.length - 1 ? 0 : currentIndex + 1;
    }
    
    if (nextIndex >= 0 && nextIndex < Win12.windows.length) {
        const nextWindow = Win12.windows[nextIndex];
        if (nextWindow.isMinimized) {
            restoreWindow(nextWindow.id);
        } else {
            bringToFront(nextWindow.id);
        }
    }
}

function getActiveExplorerWindow() {
    if (!Win12.activeWindowId) return null;
    const win = Win12.windows.find(w => w.id === Win12.activeWindowId && w.appType === 'explorer');
    return win || null;
}

function getSelectedFilesFromExplorer(window) {
    // This would need to be implemented based on actual selection state
    // For now, returns empty array - can be enhanced with file selection UI
    return [];
}

// Initialize shortcuts when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupKeyboardShortcuts);
} else {
    setupKeyboardShortcuts();
}
