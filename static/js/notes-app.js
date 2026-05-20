// notes-app.js – Notes window

async function loadNotesIntoWindow(container) {
    try {
        const notes = await api.get('/notes/');
        container.innerHTML = renderNotesHTML(notes);
        attachNotesEvents(container);
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;">Notes unavailable</div>';
    }
}

function renderNotesHTML(notes) {
    return notes.map(n => `
        <div class="note-item" data-id="${n.id}">
            <input class="note-title" value="${escapeHtml(n.title)}" style="width:100%;background:transparent;border:none;color:#fff;font-weight:bold;margin-bottom:4px;">
            <textarea class="note-body" style="width:100%;background:rgba(0,0,0,0.2);border:none;color:#e2e8f0;padding:8px;border-radius:8px;">${escapeHtml(n.body)}</textarea>
            <button class="delete-note" style="background:#ef4444;color:#fff;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;">Delete</button>
            <hr style="border-color:rgba(255,255,255,0.1); margin:12px 0;">
        </div>
    `).join('') + `<button id="new-note-btn" style="background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">+ New Note</button>`;
}

function attachNotesEvents(container) {
    const saveNote = async (el) => {
        const noteDiv = el.closest('.note-item');
        const id = noteDiv.dataset.id;
        const title = noteDiv.querySelector('.note-title').value;
        const body = noteDiv.querySelector('.note-body').value;
        await api.put(`/notes/${id}`, { title, body });
    };
    container.querySelectorAll('.note-title, .note-body').forEach(el => {
        el.addEventListener('input', debounce((e) => saveNote(e.target), 800));
    });
    container.querySelectorAll('.delete-note').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.closest('.note-item').dataset.id;
            await api.delete(`/notes/${id}`);
            loadNotesIntoWindow(container);
        });
    });
    const newBtn = container.querySelector('#new-note-btn');
    if (newBtn) newBtn.addEventListener('click', async () => {
        await api.post('/notes/', { title: 'New Note', body: '' });
        loadNotesIntoWindow(container);
    });
}