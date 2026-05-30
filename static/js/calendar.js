window.sanitize = function (str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};
class CalendarApp {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.currentDate = new Date();
        this.events = [];
        this.initUI();
        this.loadEvents();
    }

    initUI() {
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.1);">
                <button id="prev-month-${this.win.id}" style="background:transparent; border:none; color:#fff; font-size:18px; cursor:pointer;">◀</button>
                <h3 id="month-year-${this.win.id}" style="color:#f1f5f9; margin:0;"></h3>
                <button id="next-month-${this.win.id}" style="background:transparent; border:none; color:#fff; font-size:18px; cursor:pointer;">▶</button>
                <button id="add-event-btn-${this.win.id}" style="background:var(--accent); color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer;">+ Event</button>
            </div>
            <div id="calendar-grid-${this.win.id}" style="flex:1; display:grid; grid-template-columns:repeat(7,1fr); gap:1px; background:rgba(255,255,255,0.05); padding:1px;"></div>
            <div id="event-modal-${this.win.id}" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(20,20,40,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:20px; z-index:9500; width:350px;"></div>
        `;

        this.monthYearLabel = document.getElementById(`month-year-${this.win.id}`);
        this.grid = document.getElementById(`calendar-grid-${this.win.id}`);
        this.modal = document.getElementById(`event-modal-${this.win.id}`);

        document.getElementById(`prev-month-${this.win.id}`).addEventListener('click', () => this.changeMonth(-1));
        document.getElementById(`next-month-${this.win.id}`).addEventListener('click', () => this.changeMonth(1));
        document.getElementById(`add-event-btn-${this.win.id}`).addEventListener('click', () => this.openEventForm());

        this.renderCalendar();
    }

    async loadEvents() {
        try {
            this.events = await api.get('/calendar/');
            this.renderCalendar();
        } catch (e) {
            console.error('Failed to load events', e);
        }
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        this.monthYearLabel.textContent = `${this.currentDate.toLocaleString('default', { month: 'long' })} ${year}`;

        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Weekday headers
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        this.grid.innerHTML = '';
        daysOfWeek.forEach(d => {
            const header = document.createElement('div');
            header.textContent = d;
            header.style.cssText = 'padding:8px; text-align:center; color:#94a3b8; font-size:12px; background:rgba(0,0,0,0.2);';
            this.grid.appendChild(header);
        });

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.style.background = 'rgba(0,0,0,0.1)';
            this.grid.appendChild(empty);
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.style.cssText = 'min-height:80px; background:rgba(255,255,255,0.03); padding:4px; cursor:pointer; position:relative;';
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cell.innerHTML = `<div style="font-weight:500; color:#cbd5e1; margin-bottom:4px;">${day}</div>`;

            // Display events on this date
            const dayEvents = this.events.filter(e => e.start_datetime.startsWith(dateStr));
            dayEvents.forEach(ev => {
                const evEl = document.createElement('div');
                evEl.textContent = ev.title;
                evEl.style.cssText = 'background:var(--accent); color:#fff; padding:2px 4px; border-radius:4px; font-size:10px; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;';
                evEl.title = ev.description;
                evEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editEvent(ev);
                });
                cell.appendChild(evEl);
            });

            cell.addEventListener('click', () => {
                this.openEventForm(dateStr);
            });
            this.grid.appendChild(cell);
        }
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
    }

    openEventForm(prefillDate = '') {
        this.modal.innerHTML = `
            <h3 style="color:#f1f5f9; margin-bottom:12px;">New Event</h3>
            <input type="text" id="ev-title" placeholder="Title" style="width:100%; padding:8px; margin-bottom:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;">
            <textarea id="ev-desc" placeholder="Description" style="width:100%; padding:8px; margin-bottom:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;" rows="3"></textarea>
            <div style="display:flex; gap:8px; margin-bottom:8px;">
                <input type="datetime-local" id="ev-start" value="${prefillDate ? prefillDate + 'T09:00' : ''}" style="flex:1; padding:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;">
                <input type="datetime-local" id="ev-end" value="${prefillDate ? prefillDate + 'T10:00' : ''}" style="flex:1; padding:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;">
            </div>
            <label style="color:#cbd5e1; display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <input type="checkbox" id="ev-reminder"> Reminder
            </label>
            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button id="cancel-ev-btn" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Cancel</button>
                <button id="save-ev-btn" style="background:var(--accent); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Save</button>
            </div>
        `;
        this.modal.style.display = 'block';

        document.getElementById('cancel-ev-btn').addEventListener('click', () => this.modal.style.display = 'none');
        document.getElementById('save-ev-btn').addEventListener('click', async () => {
            const title = document.getElementById('ev-title').value.trim();
            const description = document.getElementById('ev-desc').value.trim();
            const start = document.getElementById('ev-start').value;
            const end = document.getElementById('ev-end').value;
            const reminder = document.getElementById('ev-reminder').checked;
            if (!title || !start || !end) {
                await modal.alert('Title, start and end are required.', 'Validation Error');
                return;
            }
            await api.post('/calendar/', { title, description, start_datetime: start, end_datetime: end, reminder });
            this.modal.style.display = 'none';
            await this.loadEvents();
        });
    }

    editEvent(event) {
        this.modal.innerHTML = `
            <h3 style="color:#f1f5f9; margin-bottom:12px;">Edit Event</h3>
            <input type="text" id="ev-title" value="${sanitize(event.title)}" style="width:100%; padding:8px; margin-bottom:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;">
            <textarea id="ev-desc" style="width:100%; padding:8px; margin-bottom:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;" rows="3">${sanitize(event.description)}</textarea>
            <div style="display:flex; gap:8px; margin-bottom:8px;">
                <input type="datetime-local" id="ev-start" value="${event.start_datetime}" style="flex:1; padding:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;">
                <input type="datetime-local" id="ev-end" value="${event.end_datetime}" style="flex:1; padding:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;">
            </div>
            <label style="color:#cbd5e1; display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <input type="checkbox" id="ev-reminder" ${event.reminder === 'True' ? 'checked' : ''}> Reminder
            </label>
            <div style="display:flex; justify-content:space-between;">
                <button id="delete-ev-btn" style="background:#ef4444; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Delete</button>
                <div style="display:flex; gap:8px;">
                    <button id="cancel-ev-btn" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Cancel</button>
                    <button id="save-ev-btn" style="background:var(--accent); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Update</button>
                </div>
            </div>
        `;
        this.modal.style.display = 'block';

        document.getElementById('cancel-ev-btn').addEventListener('click', () => this.modal.style.display = 'none');
        document.getElementById('save-ev-btn').addEventListener('click', async () => {
            const title = document.getElementById('ev-title').value.trim();
            const description = document.getElementById('ev-desc').value.trim();
            const start = document.getElementById('ev-start').value;
            const end = document.getElementById('ev-end').value;
            const reminder = document.getElementById('ev-reminder').checked;
            await api.put(`/calendar/${event.id}`, { title, description, start_datetime: start, end_datetime: end, reminder });
            this.modal.style.display = 'none';
            await this.loadEvents();
        });
        document.getElementById('delete-ev-btn').addEventListener('click', async () => {
            if (await modal.confirm('Delete this event?', 'Confirm Delete')) {
                await api.delete(`/calendar/${event.id}`);
            }
        });
    }
}