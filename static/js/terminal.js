class Terminal {
    constructor (container, win) {
        this.container = container;
        this.win = win;
        this.currentUser = window.currentUser?.full_name || 'User';
        // Navigation state
        this.currentFolderId = 'root';
        this.currentFolderName = 'root';
        this.parentId = null;          // parent of current folder (null for root)
        this.folderStack = [];         // stack of { folderId, folderName, parentId }
        this.commandHistory = [];
        this.historyIndex = -1;

        this.initUI();
        this.focusInput();
    }

    initUI() {
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.padding = '0';
        this.container.style.background = '#0c0c0c';
        this.container.style.color = '#ccc';
        this.container.style.fontFamily = '"Cascadia Code", "Consolas", monospace';
        this.container.style.fontSize = '13px';
        this.container.innerHTML = `
            <div id="terminal-output-${this.win.id}" style="flex:1; overflow-y:auto; padding:12px; white-space:pre-wrap;"></div>
            <div style="display:flex; align-items:center; padding:8px 12px; border-top:1px solid rgba(255,255,255,0.1); background:#111;">
                <span style="color:#0f0; margin-right:4px;">C:\\Users\\${this.currentUser}&gt;</span>
                <input type="text" id="terminal-input-${this.win.id}" style="flex:1; background:transparent; border:none; outline:none; color:#fff; font-family:inherit; font-size:inherit;" autofocus>
            </div>
        `;

        this.outputDiv = document.getElementById(`terminal-output-${this.win.id}`);
        this.inputElement = document.getElementById(`terminal-input-${this.win.id}`);

        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = this.inputElement.value.trim();
                if (cmd) {
                    this.commandHistory.push(cmd);
                    this.historyIndex = this.commandHistory.length;
                    this.appendOutput(`C:\\Users\\${this.currentUser}> ${cmd}`);
                    this.executeCommand(cmd);
                }
                this.inputElement.value = '';
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.inputElement.value = this.commandHistory[this.historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    this.inputElement.value = this.commandHistory[this.historyIndex];
                } else {
                    this.historyIndex = this.commandHistory.length;
                    this.inputElement.value = '';
                }
            }
        });
    }

    appendOutput(text) {
        this.outputDiv.textContent += text + '\n';
        this.outputDiv.scrollTop = this.outputDiv.scrollHeight;
    }

    focusInput() {
        setTimeout(() => this.inputElement?.focus(), 50);
    }

    async executeCommand(rawCmd) {
        const parts = rawCmd.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        try {
            switch (command) {
                case 'help':
                    this.showHelp();
                    break;
                case 'clear':
                    this.outputDiv.textContent = '';
                    break;
                case 'ls':
                    await this.ls();
                    break;
                case 'cd':
                    await this.cd(args[0]);
                    break;
                case 'mkdir':
                    await this.mkdir(args[0]);
                    break;
                case 'touch':
                    await this.touch(args[0]);
                    break;
                case 'rm':
                    await this.rm(args[0]);
                    break;
                case 'cat':
                    await this.cat(args[0]);
                    break;
                case 'pwd':
                    this.appendOutput(this.getCurrentPath());
                    break;
                default:
                    this.appendOutput(`'${command}' is not recognized as a command.`);
            }
        } catch (err) {
            this.appendOutput(`Error: ${err.message}`);
        }
    }

    showHelp() {
        const help = [
            'Available commands:',
            '  help     - Show this help',
            '  clear    - Clear screen',
            '  ls       - List files and folders in current directory',
            '  cd <dir> - Change directory (.. to go up)',
            '  mkdir <name> - Create a new folder',
            '  touch <name> - Create a new empty file',
            '  rm <name>  - Delete a file or empty folder',
            '  cat <name> - Display file contents',
            '  pwd      - Print current directory path',
        ].join('\n');
        this.appendOutput(help);
    }

    async ls() {
        const files = await api.get('/files/');
        const items = files.filter(f => f.parent_id === this.currentFolderId);
        if (items.length === 0) {
            this.appendOutput('(empty)');
        } else {
            const lines = items.map(f => `${f.type === 'folder' ? '📁' : '📄'}  ${f.name}`).join('\n');
            this.appendOutput(lines);
        }
    }

    async cd(target) {
        if (!target) {
            this.appendOutput('cd: missing operand');
            return;
        }
        if (target === '..') {
            if (this.folderStack.length === 0) {
                this.appendOutput('cd: already at root');
            } else {
                const prev = this.folderStack.pop();
                this.currentFolderId = prev.folderId;
                this.currentFolderName = prev.folderName;
                this.parentId = prev.parentId;
            }
            return;
        }

        const files = await api.get('/files/');
        const folder = files.find(f => f.type === 'folder' &&
            f.parent_id === this.currentFolderId &&
            f.name.toLowerCase() === target.toLowerCase());
        if (!folder) {
            this.appendOutput(`cd: no such folder: ${target}`);
            return;
        }
        // Push current state onto stack
        this.folderStack.push({
            folderId: this.currentFolderId,
            folderName: this.currentFolderName,
            parentId: this.parentId
        });
        this.currentFolderId = folder.id;
        this.currentFolderName = folder.name;
        this.parentId = folder.parent_id || 'root';
    }

    getCurrentPath() {
        const pathNames = this.folderStack.map(s => s.folderName).concat(this.currentFolderName);
        // Remove 'root' from display if present, start from meaningful folder
        const displayPath = pathNames.filter(p => p !== 'root');
        return `C:\\${displayPath.join('\\')}`;
    }

    async mkdir(name) {
        if (!name) { this.appendOutput('mkdir: missing folder name'); return; }
        await api.post('/files/', { name, type: 'folder', parent_id: this.currentFolderId });
        this.appendOutput(`Folder created: ${name}`);
    }

    async touch(name) {
        if (!name) { this.appendOutput('touch: missing file name'); return; }
        await api.post('/files/', { name, type: 'file', parent_id: this.currentFolderId, content: '' });
        this.appendOutput(`File created: ${name}`);
    }

    async rm(name) {
        if (!name) { this.appendOutput('rm: missing file/folder name'); return; }
        const files = await api.get('/files/');
        const target = files.find(f => f.parent_id === this.currentFolderId &&
            f.name.toLowerCase() === name.toLowerCase());
        if (!target) {
            this.appendOutput(`rm: cannot remove '${name}': No such file or directory`);
            return;
        }
        await api.delete(`/files/${target.id}`);
        this.appendOutput(`Deleted: ${name}`);
    }

    async cat(name) {
        if (!name) { this.appendOutput('cat: missing file name'); return; }
        const files = await api.get('/files/');
        const target = files.find(f => f.type === 'file' &&
            f.parent_id === this.currentFolderId &&
            f.name.toLowerCase() === name.toLowerCase());
        if (!target) {
            this.appendOutput(`cat: ${name}: No such file`);
            return;
        }
        const fileData = await api.get(`/files/${target.id}`);
        this.appendOutput(fileData.content || '(empty)');
    }
}