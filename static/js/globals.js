// globals.js – shared state for the entire OS

window.Win12 = {
    windows: [],
    windowIdCounter: 1,
    highestZIndex: 100,
    activeWindowId: null,
    isLocked: true,
    bootComplete: false,
    isStartMenuOpen: false,
    isWidgetsOpen: false,
    isNotificationsOpen: false,
    explorerState: new Map(),
    workspaces: [],
    currentWorkspaceIndex: 0,
    taskViewActive: false,
    snapEnabled: true,
    SNAP_THRESHOLD: 20,
    currentUser: null,
};