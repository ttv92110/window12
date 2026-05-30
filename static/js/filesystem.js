class VirtualFileSystem {
    constructor (files) {
        this.files = files;                // flat list from API
        this.tree = this.buildTree();      // root node
        this.pathCache = new Map();        // id -> full path array
    }

    // Build a tree from flat list
    buildTree() {
        const tree = { id: 'root', name: 'Root', type: 'folder', children: [] };
        const lookup = new Map();
        lookup.set('root', tree);

        // First pass: create nodes
        this.files.forEach(f => {
            const node = {
                id: f.id,
                name: f.name,
                type: f.type,
                parent_id: f.parent_id || 'root',
                content: f.content || '',
                children: []
            };
            lookup.set(f.id, node);
        });

        // Second pass: attach children
        this.files.forEach(f => {
            const node = lookup.get(f.id);
            const parent = lookup.get(node.parent_id);
            if (parent && parent.type === 'folder') {
                parent.children.push(node);
            }
        });

        return tree;
    }

    // Get children of a folder by its ID (or 'root')
    getFolderContents(folderId = 'root') {
        const node = this.findNodeById(folderId);
        return node ? node.children : [];
    }

    // Find a node by ID in the tree
    findNodeById(id) {
        if (id === 'root') return this.tree;
        const stack = [this.tree];
        while (stack.length) {
            const current = stack.pop();
            if (current.id === id) return current;
            if (current.children) {
                stack.push(...current.children);
            }
        }
        return null;
    }

    // Get breadcrumb trail for a given folder ID
    getBreadcrumbs(folderId) {
        if (folderId === 'root') return [{ id: 'root', name: 'This PC' }];
        const path = this.getPath(folderId);
        return path.map(id => {
            const node = this.findNodeById(id);
            return { id, name: node ? node.name : id };
        });
    }

    // Get full path (array of IDs) from root to the given ID
    getPath(folderId) {
        if (this.pathCache.has(folderId)) return this.pathCache.get(folderId);

        const path = [];
        let currentId = folderId;
        const visited = new Set();
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            path.unshift(currentId);
            const node = this.findNodeById(currentId);
            if (node && node.parent_id) {
                currentId = node.parent_id;
            } else {
                currentId = null;
            }
        }
        // Ensure root is first
        if (path[0] !== 'root') path.unshift('root');
        this.pathCache.set(folderId, path);
        return path;
    }
    // Inside VirtualFileSystem class, after getPath() method

    getFileDetails(fileId) {
        const node = this.findNodeById(fileId);
        if (!node) return null;
        return {
            name: node.name,
            type: node.type,
            size: node.size || '0',
            modified: node.updated_at || node.created_at,
            extension: node.extension || '',
            path: this.getPath(fileId).map(id => {
                const n = this.findNodeById(id);
                return n ? n.name : id;
            }).join('\\')
        };
    } 
    // Refresh the tree from a new flat list
    refresh(files) {
        this.files = files;
        this.tree = this.buildTree();
        this.pathCache.clear();
    }
}