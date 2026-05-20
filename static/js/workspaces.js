// workspaces.js – virtual desktops & task view

function initWorkspaces() {
    if (Win12.workspaces.length === 0) {
        Win12.workspaces.push({
            id: generateId(),
            name: 'Desktop 1',
            windows: []
        });
    }
    switchToWorkspace(0);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function switchToWorkspace(index) {
    if (Win12.workspaces.length === 0) return;
    if (Win12.currentWorkspaceIndex < Win12.workspaces.length) {
        Win12.workspaces[Win12.currentWorkspaceIndex].windows = Win12.windows.map(w => ({ ...w }));
    }
    Win12.currentWorkspaceIndex = index;
    windowsContainer.innerHTML = '';
    Win12.windows = Win12.workspaces[index].windows.map(w => ({ ...w, _el: null }));
    Win12.windows.forEach(w => renderWindow(w));
    updateTaskbarApps();
}

function addWorkspace(name = 'New Desktop') {
    Win12.workspaces.push({ id: generateId(), name, windows: [] });
    switchToWorkspace(Win12.workspaces.length - 1);
    saveWorkspaces();
}

function removeWorkspace(index) {
    if (Win12.workspaces.length <= 1) return;
    Win12.workspaces.splice(index, 1);
    if (Win12.currentWorkspaceIndex >= Win12.workspaces.length) {
        Win12.currentWorkspaceIndex = Win12.workspaces.length - 1;
    }
    switchToWorkspace(Win12.currentWorkspaceIndex);
    saveWorkspaces();
}

async function saveWorkspaces() {
    const data = Win12.workspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        windows: ws.windows.map(w => ({
            id: w.id, appType: w.appType, title: w.title,
            x: w.x, y: w.y, width: w.width, height: w.height,
            isMinimized: w.isMinimized, isMaximized: w.isMaximized, zIndex: w.zIndex
        }))
    }));
    queueSettingsUpdate({
        workspaces: JSON.stringify(data),
        windows_layout: JSON.stringify(data[Win12.currentWorkspaceIndex]?.windows || [])
    });
}

function toggleTaskView() {
    if (Win12.taskViewActive) closeTaskView();
    else showTaskView();
}

function showTaskView() {
    closeTaskView();
    const tv = document.createElement('div');
    tv.id = 'task-view';
    tv.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(20px); z-index:7000; display:flex; flex-wrap:wrap; gap:20px; padding:40px; align-items:flex-start; justify-content:center; overflow:auto;';

    Win12.workspaces.forEach((ws, idx) => {
        const card = document.createElement('div');
        card.style.cssText = 'width:200px; height:150px; background:rgba(255,255,255,0.1); border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; border:2px solid ' + (idx === Win12.currentWorkspaceIndex ? '#60a5fa' : 'transparent');
        card.innerHTML = `<span style="color:#fff;">${ws.name}</span>`;
        card.addEventListener('click', () => {
            switchToWorkspace(idx);
            closeTaskView();
        });
        if (Win12.workspaces.length > 1) {
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '✕';
            closeBtn.style.cssText = 'position:absolute; top:5px; right:5px; background:transparent; border:none; color:#fff; cursor:pointer; font-size:16px;';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeWorkspace(idx);
                closeTaskView();
                showTaskView();
            });
            card.style.position = 'relative';
            card.appendChild(closeBtn);
        }
        tv.appendChild(card);
    });

    const newBtn = document.createElement('div');
    newBtn.style.cssText = 'width:200px; height:150px; background:rgba(255,255,255,0.05); border-radius:12px; display:flex; align-items:center; justify-content:center; cursor:pointer; border:2px dashed rgba(255,255,255,0.3);';
    newBtn.innerHTML = '<span style="color:#fff; font-size:32px;">+</span>';
    newBtn.addEventListener('click', () => {
        addWorkspace(`Desktop ${Win12.workspaces.length + 1}`);
        closeTaskView();
    });
    tv.appendChild(newBtn);
    document.body.appendChild(tv);
    Win12.taskViewActive = true;
}

function closeTaskView() {
    const tv = document.getElementById('task-view');
    if (tv) tv.remove();
    Win12.taskViewActive = false;
}