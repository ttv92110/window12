// static/js/explorer-ui.js
// Toolbar, view mode toggles, sorting for File Explorer

let currentViewMode = 'icons'; // 'icons', 'details', 'list'
let currentSortBy = 'name';    // 'name', 'size', 'modified'
let currentSortOrder = 'asc';

function renderExplorerToolbar(container, onBack, onForward, onUp, onAddressGo, onViewChange) {
    const toolbar = document.createElement('div');
    toolbar.className = 'explorer-toolbar';
    toolbar.innerHTML = `
        <button class="tool-btn back" title="Back">◀</button>
        <button class="tool-btn forward" title="Forward">▶</button>
        <button class="tool-btn up" title="Up">▲</button>
        <input type="text" class="address-bar" placeholder="Path">
        <button class="tool-btn view-icons" title="Icons view">🖼️</button>
        <button class="tool-btn view-details" title="Details view">📋</button>
        <button class="tool-btn view-list" title="List view">☰</button>
    `;
    container.prepend(toolbar);

    toolbar.querySelector('.back').addEventListener('click', onBack);
    toolbar.querySelector('.forward').addEventListener('click', onForward);
    toolbar.querySelector('.up').addEventListener('click', onUp);
    const addrBar = toolbar.querySelector('.address-bar');
    addrBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') onAddressGo(addrBar.value);
    });
    toolbar.querySelector('.view-icons').addEventListener('click', () => onViewChange('icons'));
    toolbar.querySelector('.view-details').addEventListener('click', () => onViewChange('details'));
    toolbar.querySelector('.view-list').addEventListener('click', () => onViewChange('list'));

    return toolbar;
}

function applyViewMode(container, mode, items, sortBy = currentSortBy, sortOrder = currentSortOrder) {
    currentViewMode = mode;
    const filesDiv = container.querySelector('.explorer-files');
    if (!filesDiv) return;

    // Sorting
    const sorted = [...items].sort((a, b) => {
        let valA, valB;
        if (sortBy === 'name') { valA = a.name; valB = b.name; }
        else if (sortBy === 'size') { valA = parseInt(a.size) || 0; valB = parseInt(b.size) || 0; }
        else if (sortBy === 'modified') { valA = new Date(a.modified || 0); valB = new Date(b.modified || 0); }
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    filesDiv.className = `explorer-files ${mode}-view`;
    if (mode === 'details') {
        filesDiv.innerHTML = `
            <div class="details-header">
                <span class="sortable" data-sort="name">Name</span>
                <span class="sortable" data-sort="size">Size</span>
                <span class="sortable" data-sort="modified">Modified</span>
            </div>
            ${sorted.map(item => `
                <div class="explorer-file" data-id="${item.id}" data-type="${item.type}">
                    <span class="file-name">${item.type === 'folder' ? '📁' : '📄'} ${escapeHtml(item.name)}</span>
                    <span class="file-size">${item.size || '—'}</span>
                    <span class="file-modified">${item.modified ? new Date(item.modified).toLocaleString() : '—'}</span>
                </div>
            `).join('')}
        `;
        // Attach sort listeners
        filesDiv.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sort;
                if (currentSortBy === sortKey) {
                    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSortBy = sortKey;
                    currentSortOrder = 'asc';
                }
                applyViewMode(container, mode, items, currentSortBy, currentSortOrder);
            });
        });
    } else {
        // icons or list view
        filesDiv.innerHTML = sorted.map(item => `
            <div class="explorer-file" data-id="${item.id}" data-type="${item.type}">
                <div class="file-icon">${item.type === 'folder' ? '📁' : '📄'}</div>
                <div class="file-name">${escapeHtml(item.name)}</div>
                ${mode === 'list' ? `<div class="file-size">${item.size || '—'}</div>` : ''}
            </div>
        `).join('');
    }
}