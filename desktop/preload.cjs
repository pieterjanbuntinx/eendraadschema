// Preload script: exposes a minimal, safe bridge between the web app and the Electron main process.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("edsDesktop", {
    isDesktop: true,
    /** Returns the .eds file the app was started with (or null), only once. */
    getPendingFile: () => ipcRenderer.invoke("eds:get-pending-file"),
    /** Called when a .eds file is opened while the app is already running. */
    onOpenFile: (callback) => ipcRenderer.on("eds:open-file", (_event, file) => callback(file))
});
