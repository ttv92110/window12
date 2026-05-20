class CodeEditor {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.textarea = document.createElement('textarea');
        this.textarea.style.cssText = 'width:100%; height:100%; background:#1e1e2e; color:#e2e8f0; font-family:monospace; padding:16px; border:none; resize:none; outline:none;';
        this.container.appendChild(this.textarea);
        if (win.fileData) {
            this.loadFile(win.fileData);
        }
        // Add save functionality later
    }

    async loadFile(file) {
        if (file.content) {
            this.textarea.value = file.content;
        }
    }
}