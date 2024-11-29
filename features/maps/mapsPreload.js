const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
  shortcut: {
    onTakeScreenshotShortcut: (callback) => ipcRenderer.on("shortcut:take-screenshot", (_e) => callback()),
  },
  screenshot: {
    getSources: () => ipcRenderer.invoke("get-sources"),
    get: (mapName) => ipcRenderer.invoke("get-screenshots", mapName),
    take: (source) => ipcRenderer.invoke("maps:take-screenshot", source),
    add: ({ buffer, mapName }) => ipcRenderer.invoke("add-screenshot", { buffer, mapName }),
    delete: ({ screenshotName, mapName }) => ipcRenderer.invoke("delete-screenshot", { screenshotName, mapName }),
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
    mapScreenshotFolder: (mapName) => ipcRenderer.invoke("get-map-screenshot-path", mapName),
    mapIconFolder: () => ipcRenderer.invoke("get-map-icon-path"),
    getFileName: (path) => ipcRenderer.invoke("get-file-name", path),
    join: (args) => ipcRenderer.invoke("path-join", args),
  },
  dialog: {
    show: (options) => ipcRenderer.send("show-dialog", options),
    confirm: (options) => ipcRenderer.invoke("maps:confirm-dialog", options),
  },
});
