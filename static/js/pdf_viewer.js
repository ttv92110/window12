class PDFViewer {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.iframe = document.createElement('iframe');
        this.iframe.style.cssText = 'width:100%; height:100%; border:none;';
        this.container.appendChild(this.iframe);
        if (win.fileData) {
            this.loadPDF(win.fileData);
        }
    }

    async loadPDF(file) {
        if (file.content) {
            // Create blob from base64
            const base64 = file.content.split(',')[1] || file.content;
            const binary = atob(base64);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
            const blob = new Blob([array], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            this.iframe.src = url;
        }
    }
}