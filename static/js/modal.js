// modal.js – Windows 11 style draggable modal
class Modal {
    constructor () {
        this.activeModal = null;
        this.zIndex = 10000;
    }

    async show(options) {
        return new Promise((resolve) => {
            // Remove existing modal
            if (this.activeModal) this.activeModal.remove();

            const { title, message, inputs = [], buttons = [] } = options;
            const modalDiv = document.createElement('div');
            modalDiv.className = 'custom-modal';
            modalDiv.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: var(--glass-bg, rgba(30,30,50,0.95));
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 12px;
                width: 420px;
                max-width: 90vw;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                z-index: ${++this.zIndex};
                display: flex;
                flex-direction: column;
                overflow: hidden;
            `;

            // Draggable title bar
            const titleBar = document.createElement('div');
            titleBar.style.cssText = `
                padding: 12px 16px;
                background: rgba(0,0,0,0.3);
                cursor: move;
                user-select: none;
                font-weight: 500;
                color: #f1f5f9;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            titleBar.innerHTML = `<span>${escapeHtml(title)}</span><span style="cursor:pointer;" class="modal-close">✕</span>`;
            modalDiv.appendChild(titleBar);

            // Content area
            const contentDiv = document.createElement('div');
            contentDiv.style.cssText = 'padding: 20px; color: #cbd5e1;';
            if (message) {
                const msgDiv = document.createElement('div');
                msgDiv.textContent = message;
                msgDiv.style.marginBottom = '16px';
                contentDiv.appendChild(msgDiv);
            }

            // Input fields
            const inputsMap = {};
            inputs.forEach(input => {
                const wrapper = document.createElement('div');
                wrapper.style.marginBottom = '12px';
                const label = document.createElement('label');
                label.textContent = input.label;
                label.style.display = 'block';
                label.style.marginBottom = '4px';
                label.style.fontSize = '12px';
                wrapper.appendChild(label);
                let field;
                if (input.type === 'select') {
                    field = document.createElement('select');
                    input.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.label;
                        field.appendChild(option);
                    });
                } else {
                    field = document.createElement('input');
                    field.type = input.type || 'text';
                    field.placeholder = input.placeholder || '';
                    if (input.value) field.value = input.value;
                }
                field.style.cssText = 'width:100%; padding:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px;';
                wrapper.appendChild(field);
                contentDiv.appendChild(wrapper);
                inputsMap[input.name] = field;
            });

            modalDiv.appendChild(contentDiv);

            // Buttons
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1);';
            buttons.forEach(btn => {
                const btnEl = document.createElement('button');
                btnEl.textContent = btn.label;
                btnEl.style.cssText = `
                    padding: 6px 16px;
                    border-radius: 6px;
                    border: none;
                    cursor: pointer;
                    background: ${btn.primary ? 'var(--accent, #60a5fa)' : 'rgba(255,255,255,0.1)'};
                    color: #fff;
                `;
                btnEl.addEventListener('click', () => {
                    const result = {};
                    for (const [name, field] of Object.entries(inputsMap)) {
                        result[name] = field.value;
                    }
                    modalDiv.remove();
                    this.activeModal = null;
                    resolve(btn.value === undefined ? result : btn.value);
                });
                btnContainer.appendChild(btnEl);
            });
            modalDiv.appendChild(btnContainer);

            document.body.appendChild(modalDiv);
            this.activeModal = modalDiv;

            // Dragging logic
            let isDragging = false, offsetX, offsetY;
            titleBar.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('modal-close')) return;
                isDragging = true;
                const rect = modalDiv.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                modalDiv.style.willChange = 'transform';
            });
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                modalDiv.style.left = (e.clientX - offsetX) + 'px';
                modalDiv.style.top = (e.clientY - offsetY) + 'px';
                modalDiv.style.transform = 'none';
            });
            document.addEventListener('mouseup', () => {
                isDragging = false;
                modalDiv.style.willChange = 'auto';
            });

            // Close button
            modalDiv.querySelector('.modal-close').addEventListener('click', () => {
                modalDiv.remove();
                this.activeModal = null;
                resolve(null);
            });

            // Escape key closes
            const onKeyDown = (e) => {
                if (e.key === 'Escape') {
                    modalDiv.remove();
                    document.removeEventListener('keydown', onKeyDown);
                    this.activeModal = null;
                    resolve(null);
                }
            };
            document.addEventListener('keydown', onKeyDown);
        });
    }

    async alert(message, title = 'Notice') {
        return this.show({ title, message, buttons: [{ label: 'OK', value: true, primary: true }] });
    }

    async confirm(message, title = 'Confirm') {
        const result = await this.show({
            title, message,
            buttons: [
                { label: 'No', value: false },
                { label: 'Yes', value: true, primary: true }
            ]
        });
        return result === true;
    }

    async prompt(message, defaultValue = '', title = 'Input') {
        const result = await this.show({
            title, message,
            inputs: [{ name: 'value', label: '', type: 'text', value: defaultValue }],
            buttons: [
                { label: 'Cancel', value: null },
                { label: 'OK', value: true, primary: true }
            ]
        });
        return result ? result.value : null;
    }
}

const modal = new Modal();
window.modal = modal; // replace native calls