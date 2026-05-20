class PaintApp {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.tool = 'brush';          // brush, eraser, rect, circle, line, text
        this.color = '#ffffff';
        this.brushSize = 4;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.snapshot = null;         // for shape preview
        this.initUI();
    }

    initUI() {
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.style.padding = '0';
        this.container.style.background = '#1e1e2e';

        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(0,0,0,0.3); border-bottom:1px solid rgba(255,255,255,0.1); flex-wrap:wrap;';
        toolbar.innerHTML = `
            <button class="tool-btn" data-tool="brush" style="background:var(--accent); color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">🖌️ Brush</button>
            <button class="tool-btn" data-tool="eraser" style="background:transparent; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">🧹 Eraser</button>
            <button class="tool-btn" data-tool="rect" style="background:transparent; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">▭ Rect</button>
            <button class="tool-btn" data-tool="circle" style="background:transparent; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">◯ Circle</button>
            <button class="tool-btn" data-tool="line" style="background:transparent; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">╱ Line</button>
            <button class="tool-btn" data-tool="text" style="background:transparent; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">🔤 Text</button>
            <input type="color" id="color-picker-${this.win.id}" value="${this.color}" style="width:32px; height:32px; border:none; border-radius:4px; cursor:pointer;">
            <input type="range" id="brush-size-${this.win.id}" min="1" max="50" value="${this.brushSize}" style="width:100px;">
            <span id="brush-size-val-${this.win.id}" style="color:#cbd5e1; font-size:12px;">${this.brushSize}px</span>
            <button id="save-btn-${this.win.id}" style="margin-left:auto; background:#10b981; color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer;">💾 Save</button>
            <button id="open-btn-${this.win.id}" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer;">📂 Open</button>
            <button id="clear-btn-${this.win.id}" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer;">🗑️ Clear</button>
        `;
        this.container.appendChild(toolbar);

        // Canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = 'flex:1; overflow:auto; display:flex; align-items:center; justify-content:center; background:#2a2a3e;';
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 500;
        this.canvas.style.cssText = 'background:#fff; box-shadow:0 0 20px rgba(0,0,0,0.5); cursor:crosshair;';
        canvasContainer.appendChild(this.canvas);
        this.container.appendChild(canvasContainer);

        this.ctx = this.canvas.getContext('2d');
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); // white background

        // Event listeners
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        document.addEventListener('touchend', () => this.onMouseUp());

        // Toolbar events
        this.container.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.container.querySelectorAll('.tool-btn').forEach(b => b.style.background = 'transparent');
                btn.style.background = 'var(--accent)';
                this.tool = btn.dataset.tool;
            });
        });

        const colorPicker = document.getElementById(`color-picker-${this.win.id}`);
        colorPicker.addEventListener('input', () => this.color = colorPicker.value);
        const brushSizeInput = document.getElementById(`brush-size-${this.win.id}`);
        brushSizeInput.addEventListener('input', () => {
            this.brushSize = parseInt(brushSizeInput.value);
            document.getElementById(`brush-size-val-${this.win.id}`).textContent = this.brushSize + 'px';
        });

        document.getElementById(`save-btn-${this.win.id}`).addEventListener('click', () => this.saveDrawing());
        document.getElementById(`open-btn-${this.win.id}`).addEventListener('click', () => this.openImage());
        document.getElementById(`clear-btn-${this.win.id}`).addEventListener('click', () => this.clearCanvas());
    }

    // ----- Drawing methods -----
    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;   // canvas physical size vs CSS size
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    getTouchPos(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    onMouseDown(e) {
        this.isDrawing = true;
        const pos = this.getPos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.ctx.beginPath();
        if (this.tool === 'brush' || this.tool === 'eraser') {
            this.ctx.strokeStyle = this.tool === 'eraser' ? '#ffffff' : this.color;
            this.ctx.lineWidth = this.brushSize;
            this.ctx.moveTo(pos.x, pos.y);
        } else if (this.tool === 'text') {
            const text = prompt('Enter text:');
            if (text) {
                this.ctx.font = `${this.brushSize * 3}px sans-serif`;
                this.ctx.fillStyle = this.color;
                this.ctx.fillText(text, pos.x, pos.y);
            }
            this.isDrawing = false;
        } else {
            // For shapes, save current canvas state
            this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    onMouseMove(e) {
        if (!this.isDrawing) return;
        const pos = this.getPos(e);
        if (this.tool === 'brush' || this.tool === 'eraser') {
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        } else if (['rect', 'circle', 'line'].includes(this.tool)) {
            // Restore snapshot and draw preview shape
            if (this.snapshot) this.ctx.putImageData(this.snapshot, 0, 0);
            const w = pos.x - this.startX;
            const h = pos.y - this.startY;
            this.ctx.strokeStyle = this.color;
            this.ctx.lineWidth = this.brushSize;
            this.ctx.fillStyle = this.color;
            if (this.tool === 'rect') {
                this.ctx.beginPath();
                this.ctx.rect(this.startX, this.startY, w, h);
                this.ctx.stroke();
            } else if (this.tool === 'circle') {
                this.ctx.beginPath();
                const radius = Math.sqrt(w * w + h * h) / 2;
                const centerX = this.startX + w / 2;
                const centerY = this.startY + h / 2;
                this.ctx.ellipse(centerX, centerY, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (this.tool === 'line') {
                this.ctx.beginPath();
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
            }
        }
    }

    onMouseUp() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        if (['rect', 'circle', 'line'].includes(this.tool)) {
            // Finalize shape (already drawn in mousemove, but we need to keep it)
            // The last mousemove putImageData and drew; we just need to ensure no extra action.
            // To keep the final shape, we can just redraw once more without restoring snapshot.
            // Actually the last mousemove already drew on top of snapshot; we just need to discard snapshot.
            this.snapshot = null;
        }
        this.ctx.beginPath(); // reset path
    }

    onTouchStart(e) {
        e.preventDefault();
        this.isDrawing = true;
        const pos = this.getTouchPos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        if (this.tool === 'brush' || this.tool === 'eraser') {
            this.ctx.strokeStyle = this.tool === 'eraser' ? '#ffffff' : this.color;
            this.ctx.lineWidth = this.brushSize;
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else if (this.tool === 'text') {
            const text = prompt('Enter text:');
            if (text) {
                this.ctx.font = `${this.brushSize * 3}px sans-serif`;
                this.ctx.fillStyle = this.color;
                this.ctx.fillText(text, pos.x, pos.y);
            }
            this.isDrawing = false;
        } else {
            this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    onTouchMove(e) {
        e.preventDefault();
        if (!this.isDrawing) return;
        const pos = this.getTouchPos(e);
        if (this.tool === 'brush' || this.tool === 'eraser') {
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        } else if (['rect', 'circle', 'line'].includes(this.tool)) {
            if (this.snapshot) this.ctx.putImageData(this.snapshot, 0, 0);
            const w = pos.x - this.startX;
            const h = pos.y - this.startY;
            this.ctx.strokeStyle = this.color;
            this.ctx.lineWidth = this.brushSize;
            if (this.tool === 'rect') {
                this.ctx.beginPath();
                this.ctx.rect(this.startX, this.startY, w, h);
                this.ctx.stroke();
            } else if (this.tool === 'circle') {
                this.ctx.beginPath();
                const radius = Math.sqrt(w * w + h * h) / 2;
                const centerX = this.startX + w / 2;
                const centerY = this.startY + h / 2;
                this.ctx.ellipse(centerX, centerY, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (this.tool === 'line') {
                this.ctx.beginPath();
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
            }
        }
    }

    // ----- Save / Open -----
    async saveDrawing() {
        const name = prompt('Save as (e.g., drawing.png):');
        if (!name) return;
        const dataURL = this.canvas.toDataURL('image/png');
        try {
            await api.post('/files/', {
                name: name,
                type: 'file',
                parent_id: 'root',
                content: dataURL
            });
            alert('Drawing saved!');
        } catch (e) {
            alert('Error saving: ' + e.message);
        }
    }

    async openImage() {
        try {
            const files = await api.get('/files/');
            const imageFiles = files.filter(f => f.type === 'file' && this.isImage(f.name));
            if (imageFiles.length === 0) {
                alert('No image files found.');
                return;
            }
            this.showImagePicker(imageFiles);
        } catch (e) {
            alert('Error loading files.');
        }
    }

    isImage(filename) {
        const ext = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
        return ext.some(e => filename.toLowerCase().endsWith(e));
    }

    showImagePicker(imageFiles) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(20,20,40,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:20px; z-index:9500; width:400px; max-height:400px; overflow-y:auto;';
        modal.innerHTML = '<h3 style="color:#f1f5f9; margin-bottom:12px;">Select an image</h3>';
        imageFiles.forEach(img => {
            const row = document.createElement('div');
            row.textContent = img.name;
            row.style.cssText = 'padding:8px; cursor:pointer; color:#cbd5e1; border-bottom:1px solid rgba(255,255,255,0.05);';
            row.addEventListener('click', async () => {
                const file = await api.get(`/files/${img.id}`);
                if (file && file.content) {
                    this.loadImageFromData(file.content);
                }
                modal.remove();
            });
            modal.appendChild(row);
        });
        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';
        cancel.style.cssText = 'margin-top:12px; background:rgba(255,255,255,0.1); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;';
        cancel.addEventListener('click', () => modal.remove());
        modal.appendChild(cancel);
        document.body.appendChild(modal);
    }

    loadImageFromData(dataURL) {
        const img = new Image();
        img.onload = () => {
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataURL;
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}