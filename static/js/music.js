window.sanitize = function (str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};
class MusicApp {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.audio = new Audio();
        this.currentPlaylistId = null;
        this.playlists = [];
        this.initUI();
        this.loadPlaylists();
        if (win.fileData) {
            this.playFile(win.fileData.id);
        }
    }

    initUI() {
        this.container.style.display = 'flex';
        this.container.style.height = '100%';
        this.container.innerHTML = `
            <div class="music-sidebar" style="width:200px; background:rgba(0,0,0,0.2); padding:12px; overflow-y:auto; border-right:1px solid rgba(255,255,255,0.1);">
                <h4 style="color:#f1f5f9; margin-bottom:8px;">Playlists</h4>
                <div id="playlist-list-${this.win.id}"></div>
                <button id="new-playlist-btn-${this.win.id}" style="margin-top:8px; padding:6px 12px; background:var(--accent); color:#fff; border:none; border-radius:6px; cursor:pointer;">+ New Playlist</button>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color:#f1f5f9;">Music Library</h3>
                    <input type="file" id="upload-music-${this.win.id}" accept="audio/*" style="display:none;">
                    <button id="upload-btn-${this.win.id}" style="padding:6px 12px; background:var(--accent); color:#fff; border:none; border-radius:6px; cursor:pointer;">Upload</button>
                </div>
                <div id="music-file-list-${this.win.id}" style="flex:1; overflow-y:auto; margin-top:8px;"></div>
                <div class="music-controls" style="display:flex; align-items:center; gap:10px; padding:10px 0; border-top:1px solid rgba(255,255,255,0.1);">
                    <button class="prev-btn" style="background:transparent; border:none; color:#fff; font-size:18px;">⏮</button>
                    <button class="play-btn" style="background:transparent; border:none; color:#fff; font-size:18px;">▶️</button>
                    <button class="next-btn" style="background:transparent; border:none; color:#fff; font-size:18px;">⏭</button>
                    <input type="range" id="volume-slider-${this.win.id}" min="0" max="1" step="0.1" value="0.8" style="width:100px;">
                    <span id="current-track-${this.win.id}" style="color:#94a3b8; font-size:12px; flex:1; text-align:center;">No track selected</span>
                </div>
            </div>
        `;

        // Event bindings
        this.playlistList = document.getElementById(`playlist-list-${this.win.id}`);
        this.fileList = document.getElementById(`music-file-list-${this.win.id}`);
        this.volumeSlider = document.getElementById(`volume-slider-${this.win.id}`);
        this.currentTrackLabel = document.getElementById(`current-track-${this.win.id}`);

        document.getElementById(`new-playlist-btn-${this.win.id}`).addEventListener('click', () => this.createPlaylist());
        document.getElementById(`upload-btn-${this.win.id}`).addEventListener('click', () => document.getElementById(`upload-music-${this.win.id}`).click());
        document.getElementById(`upload-music-${this.win.id}`).addEventListener('change', (e) => this.uploadFile(e.target.files[0]));

        this.container.querySelector('.play-btn').addEventListener('click', () => this.togglePlay());
        this.container.querySelector('.prev-btn').addEventListener('click', () => this.prevTrack());
        this.container.querySelector('.next-btn').addEventListener('click', () => this.nextTrack());

        this.volumeSlider.addEventListener('input', () => {
            this.audio.volume = this.volumeSlider.value;
        });
        this.audio.volume = 0.8;

        this.audio.addEventListener('ended', () => this.nextTrack());
    }

    async loadPlaylists() {
        const playlists = await api.get('/music/playlists');
        this.playlists = playlists;
        this.renderPlaylists();
        await this.loadFiles(); // default to all music files
    }

    renderPlaylists() {
        this.playlistList.innerHTML = this.playlists.map(p => `
            <div class="playlist-item" data-id="${p.id}" style="padding:6px 8px; cursor:pointer; color:#cbd5e1; border-radius:4px; margin-bottom:2px; display:flex; justify-content:space-between; align-items:center;">
                <span>${p.name}</span>
                <button class="delete-pl-btn" data-id="${p.id}" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:12px;">✕</button>
            </div>
        `).join('');

        this.playlistList.querySelectorAll('.playlist-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-pl-btn')) return;
                this.openPlaylist(el.dataset.id);
            });
        });
        this.playlistList.querySelectorAll('.delete-pl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePlaylist(btn.dataset.id);
            });
        });
    }

    async openPlaylist(id) {
        this.currentPlaylistId = id;
        const playlist = this.playlists.find(p => p.id === id);
        if (!playlist) return;
        let fileIds = [];
        try {
            fileIds = JSON.parse(playlist.file_ids_json);
        } catch (e) { fileIds = []; }
        await this.loadFiles(fileIds);
    }

    async loadFiles(filterIds = null) {
        const allFiles = await api.get('/files/');
        let musicFiles = allFiles.filter(f => f.type === 'file' && this.isAudioFile(f.name));
        if (filterIds) {
            musicFiles = musicFiles.filter(f => filterIds.includes(f.id));
        }
        this.renderFileList(musicFiles);
    }

    isAudioFile(filename) {
        const audioExt = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.wma'];
        return audioExt.some(ext => filename.toLowerCase().endsWith(ext));
    }

    renderFileList(files) {
        this.fileList.innerHTML = files.map(f => `
            <div class="music-file-item" data-id="${f.id}" style="display:flex; align-items:center; gap:10px; padding:8px; cursor:pointer; color:#cbd5e1; border-radius:6px;">
                <span>🎵</span>
                <span style="flex:1;">${f.name}</span>
                <button class="add-to-pl-btn" data-id="${f.id}" style="background:rgba(255,255,255,0.1); border:none; color:#fff; padding:4px 8px; border-radius:4px; font-size:10px;">+ Playlist</button>
            </div>
        `).join('');

        // Double-click to play
        this.fileList.querySelectorAll('.music-file-item').forEach(el => {
            el.addEventListener('dblclick', () => this.playFile(el.dataset.id));
            el.querySelector('.add-to-pl-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAddToPlaylistMenu(el.dataset.id, e.clientX, e.clientY);
            });
        });
    }

    async playFile(fileId) {
        const file = await api.get(`/files/${fileId}`);
        if (file && file.content) {
            this.audio.src = file.content;
            this.audio.play();
            this.currentTrackLabel.textContent = file.name;
            this.container.querySelector('.play-btn').textContent = '⏸';
        }
    }

    togglePlay() {
        if (this.audio.paused) {
            this.audio.play();
            this.container.querySelector('.play-btn').textContent = '⏸';
        } else {
            this.audio.pause();
            this.container.querySelector('.play-btn').textContent = '▶️';
        }
    }

    prevTrack() { /* placeholder for now */ }
    nextTrack() { /* placeholder */ }

    async createPlaylist() {
        const name = await modal.prompt('Playlist name:', '', 'New Playlist');
        if (!name) return;
        await api.post('/music/playlists', { name, file_ids: [] });
        await this.loadPlaylists();
    }

    async deletePlaylist(id) {
        if (await modal.confirm('Delete this playlist?', 'Confirm Delete')) {
            await api.delete(`/music/playlists/${id}`);
        }
        await this.loadPlaylists();
    }

    showAddToPlaylistMenu(fileId, x, y) {
        // Remove existing menu
        const old = document.getElementById('pl-add-menu');
        if (old) old.remove();

        const menu = document.createElement('div');
        menu.id = 'pl-add-menu';
        menu.style.cssText = `position:fixed; left:${x}px; top:${y}px; background:rgba(30,30,50,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:4px 0; min-width:150px; z-index:8001;`;

        this.playlists.forEach(pl => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:8px 16px; cursor:pointer; color:#cbd5e1;';
            item.textContent = pl.name;
            item.addEventListener('click', async () => {
                let ids = [];
                try { ids = JSON.parse(pl.file_ids_json); } catch (e) { }
                if (!ids.includes(fileId)) {
                    ids.push(fileId);
                    await api.put(`/music/playlists/${pl.id}`, { file_ids: ids });
                    await this.loadPlaylists();
                }
                menu.remove();
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }

    async uploadFile(file) {
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
            await this.loadFiles();
        };
        reader.readAsDataURL(file);
    }
}