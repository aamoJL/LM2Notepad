const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
  shortcut: {
    onTakeScreenshotShortcut: (callback) => ipcRenderer.on("shortcut:take-screenshot", (_e) => callback()),
  },
  screenshot: {
    getSources: () => ipcRenderer.invoke("get-sources"),
    get: () => ipcRenderer.invoke("get-screenshots"),
    take: (source) => ipcRenderer.invoke("maps:take-screenshot", source),
    add: (buffer) => ipcRenderer.invoke("add-screenshot", buffer),
    delete: (name) => ipcRenderer.invoke("delete-screenshot", name),
  },
  map: {
    get: () => ipcRenderer.invoke("get-maps"),
    getByName: (name) => ipcRenderer.invoke("get-map", name),
    add: (name) => ipcRenderer.invoke("add-map", name),
    update: ({ name, json }) => ipcRenderer.invoke("update-map", { name, json }),
    delete: (name) => ipcRenderer.invoke("delete-map", name),
    markers: {
      update: ({ name, json }) => ipcRenderer.invoke("update-markers", { name, json }),
    },
  },
  path: {
    exists: (path) => ipcRenderer.invoke("path-exists", path),
    mapScreenshotFolder: () => ipcRenderer.invoke("get-map-screenshot-path"),
    mapIconFolder: () => ipcRenderer.invoke("get-map-icon-path"),
  },
  dialog: {
    show: (options) => ipcRenderer.send("show-dialog", options),
    confirm: (options) => ipcRenderer.invoke("maps:confirm-dialog", options),
  },
});
