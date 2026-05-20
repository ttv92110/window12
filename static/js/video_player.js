class VideoPlayer {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.videoEl = document.createElement('video');
        this.videoEl.controls = true;
        this.videoEl.style.cssText = 'width:100%; height:100%; background:#000;';
        this.container.appendChild(this.videoEl);
        if (win.fileData) {
            this.loadVideo(win.fileData);
        } else {
            // Show file open prompt?
            this.container.innerHTML = '<div style="color:#fff; padding:20px;">Drag a video file here.</div>';
        }
    }

    async loadVideo(file) {
        if (file.content) {
            const blob = await fetch(file.content).then(r => r.blob());
            const url = URL.createObjectURL(blob);
            this.videoEl.src = url;
        }
    }
}