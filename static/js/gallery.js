window.sanitize = function (str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};
class GalleryApp {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.currentImages = [];     // filtered image file objects
        this.currentIndex = 0;
        this.slideshowTimer = null;
        this.initUI();

        if (win.fileData) {
            // Open a specific file immediately
            this.loadImages().then(() => {
                const idx = this.currentImages.findIndex(img => img.id === win.fileData.id);
                if (idx >= 0) this.openPreview(idx);
            });
        } else {
            this.loadImages();
        }
    }

    initUI() {
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.1);">
                <h3 style="color:#f1f5f9; margin:0;">Gallery</h3>
                <div style="display:flex; gap:10px;">
                    <button id="upload-img-btn-${this.win.id}" style="background:var(--accent); color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer;">Upload</button>
                    <button id="slideshow-btn-${this.win.id}" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer;">Slideshow</button>
                </div>
            </div>
            <div id="gallery-grid-${this.win.id}" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-wrap:wrap; gap:10px; align-content:flex-start;"></div>
            <input type="file" id="upload-img-input-${this.win.id}" accept="image/*" style="display:none;">
        `;

        this.grid = document.getElementById(`gallery-grid-${this.win.id}`);

        document.getElementById(`upload-img-btn-${this.win.id}`).addEventListener('click', () => {
            document.getElementById(`upload-img-input-${this.win.id}`).click();
        });
        document.getElementById(`upload-img-input-${this.win.id}`).addEventListener('change', (e) => {
            if (e.target.files[0]) this.uploadImage(e.target.files[0]);
        });
        document.getElementById(`slideshow-btn-${this.win.id}`).addEventListener('click', () => {
            this.startSlideshow();
        });
    }

    isImageFile(filename) {
        const imgExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
        return imgExt.some(ext => filename.toLowerCase().endsWith(ext));
    }

    async loadImages() {
        try {
            const files = await api.get('/files/');
            this.currentImages = files.filter(f => f.type === 'file' && this.isImageFile(f.name));
            this.renderGrid();
        } catch (e) {
            this.grid.innerHTML = '<div style="color:#94a3b8; text-align:center; width:100%; padding:40px;">Failed to load images</div>';
        }
    }

    renderGrid() {
        if (this.currentImages.length === 0) {
            this.grid.innerHTML = '<div style="color:#94a3b8; text-align:center; width:100%; padding:40px;">No images found. Upload some!</div>';
            return;
        }

        this.grid.innerHTML = this.currentImages.map((img, idx) => `
            <div class="gallery-thumb" data-index="${idx}" style="width:120px; height:120px; background:rgba(255,255,255,0.05); border-radius:8px; overflow:hidden; cursor:pointer; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.1);">
                <img src="${img.content}" alt="${sanitize(img.name)}" style="max-width:100%; max-height:100%; object-fit:cover;" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖼️</text></svg>'">
            </div>
        `).join('');

        // Add click listeners
        this.grid.querySelectorAll('.gallery-thumb').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                const idx = parseInt(thumb.dataset.index);
                this.openPreview(idx);
            });
        });
    }

    openPreview(index) {
        this.currentIndex = index;
        this.showFullscreen(index);
    }

    showFullscreen(index) {
        // Remove existing preview
        const existing = document.getElementById('gallery-fullscreen');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'gallery-fullscreen';
        overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.9); z-index:9000; display:flex; align-items:center; justify-content:center; flex-direction:column;';

        const img = this.currentImages[index];
        if (!img) return;

        const imageEl = document.createElement('img');
        imageEl.src = img.content;
        imageEl.style.cssText = 'max-width:90%; max-height:80%; object-fit:contain; border-radius:8px;';
        imageEl.alt = img.name;

        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex; gap:20px; margin-top:15px;';
        controls.innerHTML = `
            <button class="prev-img-btn" style="background:rgba(255,255,255,0.2); border:none; color:#fff; font-size:24px; padding:8px 16px; border-radius:8px; cursor:pointer;">◀</button>
            <span style="color:#fff; align-self:center;">${index + 1} / ${this.currentImages.length}</span>
            <button class="next-img-btn" style="background:rgba(255,255,255,0.2); border:none; color:#fff; font-size:24px; padding:8px 16px; border-radius:8px; cursor:pointer;">▶</button>
            <button class="close-preview-btn" style="background:rgba(255,255,255,0.2); border:none; color:#fff; font-size:20px; padding:8px 16px; border-radius:8px; cursor:pointer;">✕</button>
        `;

        overlay.appendChild(imageEl);
        overlay.appendChild(controls);
        document.body.appendChild(overlay);

        const closePreview = () => overlay.remove();

        controls.querySelector('.close-preview-btn').addEventListener('click', closePreview);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePreview();
        });

        controls.querySelector('.prev-img-btn').addEventListener('click', () => {
            this.currentIndex = (this.currentIndex - 1 + this.currentImages.length) % this.currentImages.length;
            this.updateFullscreenImage(this.currentIndex, imageEl, controls.querySelector('span'));
        });
        controls.querySelector('.next-img-btn').addEventListener('click', () => {
            this.currentIndex = (this.currentIndex + 1) % this.currentImages.length;
            this.updateFullscreenImage(this.currentIndex, imageEl, controls.querySelector('span'));
        });

        // Keyboard navigation
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                closePreview();
                document.removeEventListener('keydown', keyHandler);
            } else if (e.key === 'ArrowRight') {
                this.currentIndex = (this.currentIndex + 1) % this.currentImages.length;
                this.updateFullscreenImage(this.currentIndex, imageEl, controls.querySelector('span'));
            } else if (e.key === 'ArrowLeft') {
                this.currentIndex = (this.currentIndex - 1 + this.currentImages.length) % this.currentImages.length;
                this.updateFullscreenImage(this.currentIndex, imageEl, controls.querySelector('span'));
            }
        };
        document.addEventListener('keydown', keyHandler);
        overlay.addEventListener('remove', () => document.removeEventListener('keydown', keyHandler), { once: true });
    }

    updateFullscreenImage(index, imgElement, counterSpan) {
        const img = this.currentImages[index];
        imgElement.src = img.content;
        imgElement.alt = img.name;
        counterSpan.textContent = `${index + 1} / ${this.currentImages.length}`;
    }

    startSlideshow() {
        if (this.currentImages.length === 0) return;
        if (this.slideshowTimer) {
            clearInterval(this.slideshowTimer);
            this.slideshowTimer = null;
            // Optionally close preview
            const fs = document.getElementById('gallery-fullscreen');
            if (fs) fs.remove();
            return;
        }
        // Open preview if not already open
        const fs = document.getElementById('gallery-fullscreen');
        if (!fs) {
            this.openPreview(0);
        }
        this.slideshowTimer = setInterval(() => {
            this.currentIndex = (this.currentIndex + 1) % this.currentImages.length;
            const fs = document.getElementById('gallery-fullscreen');
            if (fs) {
                const imgEl = fs.querySelector('img');
                const counterSpan = fs.querySelector('span');
                if (imgEl && counterSpan) this.updateFullscreenImage(this.currentIndex, imgEl, counterSpan);
            } else {
                clearInterval(this.slideshowTimer);
                this.slideshowTimer = null;
            }
        }, 3000);
    }

    async uploadImage(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            await api.post('/files/', {
                name: file.name,
                type: 'file',
                parent_id: 'root',
                content: base64
            });
            await this.loadImages();
        };
        reader.readAsDataURL(file);
    }
}