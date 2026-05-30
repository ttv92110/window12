// static/js/modal.js
class WinModal {
    constructor () {
        this.modal = null;
        this.resolve = null;
    }

    show(options) {
        return new Promise((resolve) => {
            this.resolve = resolve;
            this.render(options);
        });
    }

    render({ title, message, inputs = [], buttons = [] }) {
        this.close();
        this.modal = document.createElement('div');
        this.modal.className = 'win-modal';
        this.modal.innerHTML = `
            <div class="win-modal-content">
                <div class="win-modal-titlebar">${title}<span class="win-modal-close">✕</span></div>
                <div class="win-modal-body">${message || ''}</div>
                <div class="win-modal-inputs"></div>
                <div class="win-modal-buttons"></div>
            </div>
        `;
        document.body.appendChild(this.modal);

        const inputsDiv = this.modal.querySelector('.win-modal-inputs');
        inputs.forEach(inp => {
            if (inp.type === 'text') {
                const el = document.createElement('input');
                el.type = 'text';
                el.placeholder = inp.placeholder || '';
                el.value = inp.value || '';
                inputsDiv.appendChild(el);
            } else if (inp.type === 'checkbox') {
                const label = document.createElement('label');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                label.appendChild(cb);
                label.appendChild(document.createTextNode(inp.label || ''));
                inputsDiv.appendChild(label);
            }
        });

        const btnsDiv = this.modal.querySelector('.win-modal-buttons');
        buttons.forEach(btn => {
            const btnEl = document.createElement('button');
            btnEl.textContent = btn.text;
            if (btn.primary) btnEl.classList.add('primary');
            btnEl.addEventListener('click', () => {
                const values = {};
                const allInputs = this.modal.querySelectorAll('input');
                inputs.forEach((inp, idx) => {
                    if (allInputs[idx]) {
                        values[inp.name || idx] = allInputs[idx].type === 'checkbox' ? allInputs[idx].checked : allInputs[idx].value;
                    }
                });
                this.close();
                this.resolve({ button: btn.value, values });
            });
            btnsDiv.appendChild(btnEl);
        });

        this.modal.querySelector('.win-modal-close').addEventListener('click', () => this.close());
        this.makeDraggable();
    }

    makeDraggable() {
        const titlebar = this.modal.querySelector('.win-modal-titlebar');
        let offsetX, offsetY, startX, startY;
        titlebar.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
            offsetX = this.modal.offsetLeft;
            offsetY = this.modal.offsetTop;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
        const onMove = (e) => {
            this.modal.style.left = (offsetX + (e.clientX - startX)) + 'px';
            this.modal.style.top = (offsetY + (e.clientY - startY)) + 'px';
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }

    close() {
        if (this.modal) this.modal.remove();
        this.modal = null;
    }
}

const modal = new WinModal();
window.modal = modal;