const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
  shortcut: {
    onTakeScreenshotShortcut: (callback) => ipcRenderer.on("shortcut:take-screenshot", (_e) => callback()),
  },
  screenshot: {
    getSources: () => ipcRenderer.invoke("get-sources"),
    get: () => ipcRenderer.invoke("get-screenshots"),
    take: (source) => ipcRenderer.invoke("take-screenshot", source),
    add: (buffer) => ipcRenderer.invoke("add-screenshot", buffer),
    delete: (name) => ipcRenderer.invoke("delete-screenshot", name),
  },
  map: {
    get: () => ipcRenderer.invoke("get-maps"),
    add: (name) => ipcRenderer.invoke("add-map", name),
    delete: (name) => ipcRenderer.invoke("delete-map", name),
  },
  path: {
    mapScreenshotFolder: () => ipcRenderer.invoke("get-map-screenshot-path"),
  },
  dialog: {
    show: (options) => ipcRenderer.send("show-dialog", options),
    confirm: (options) => ipcRenderer.invoke("confirm-dialog", options),
  },
});
