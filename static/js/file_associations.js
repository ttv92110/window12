// file_associations.js — maps extension → app

const FILE_ASSOCIATIONS = {
    // Images
    ".png": "gallery",
    ".jpg": "gallery",
    ".jpeg": "gallery",
    ".gif": "gallery",
    ".webp": "gallery",
    ".bmp": "gallery",
    ".svg": "gallery",
    // Videos
    ".mp4": "video_player",
    ".webm": "video_player",
    ".mov": "video_player",
    ".avi": "video_player",
    ".mkv": "video_player",
    // Audio
    ".mp3": "music",
    ".wav": "music",
    ".ogg": "music",
    ".flac": "music",
    ".aac": "music",
    // Documents
    ".txt": "notepad",
    ".md": "notepad",
    ".json": "code_editor",
    ".xml": "code_editor",
    ".csv": "notepad",
    // Code
    ".html": "browser",
    ".css": "code_editor",
    ".js": "code_editor",
    ".py": "code_editor",
    ".jsx": "code_editor",
    ".ts": "code_editor",
    ".tsx": "code_editor",
    // PDF
    ".pdf": "pdf_viewer",
    // Archives (later)
    ".zip": "explorer",
    ".rar": "explorer",
    // Paint files
    ".paint": "paint",
    ".draw": "paint",
    ".canvas": "paint",
    // Folder
    "folder": "explorer",
    // Shortcuts (just open target app)
    ".lnk": null  // special handling
};

function getAppForFile(file) {
    if (file.type === 'folder') return 'explorer';
    const ext = getExtension(file.name);
    return FILE_ASSOCIATIONS[ext] || null;
}

function getExtension(filename) {
    const dot = filename.lastIndexOf('.');
    if (dot === -1) return '';
    return filename.substring(dot).toLowerCase();
}