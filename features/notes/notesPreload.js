const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
  shortcut: {
    onTakeScreenshotShortcut: (callback) => ipcRenderer.on("shortcut:take-screenshot", (_e) => callback()),
    onScanScreenshotShortcut: (callback) => ipcRenderer.on("shortcut:scan-screenshot", (_e) => callback()),
  },
  note: {
    get: () => ipcRenderer.invoke("get-notes"),
    add: ({ text, screenshot }) => ipcRenderer.invoke("add-note", { text: text, screenshot: screenshot }),
    delete: (id) => ipcRenderer.invoke("delete-note", id),
    update: ({ id, text }) => ipcRenderer.invoke("update-note", { id, text }),
  },
  screenshot: {
    getSources: () => ipcRenderer.invoke("get-sources"),
    takeScreenshot: ({ source, crop }) => ipcRenderer.invoke("take-screenshot", { source: source, crop: crop }),
    scanScreenshot: (buffer) => ipcRenderer.invoke("scan-screenshot", buffer),
  },
  update: {
    onScanProgressUpdate: (callback) => ipcRenderer.on("scan-progress-update", (_e, value) => callback(value)),
  },
  path: {
    noteScreenshotFolder: () => ipcRenderer.invoke("get-note-screenshot-path"),
  },
});
