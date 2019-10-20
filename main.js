const { app, BrowserWindow } = require("electron");

function createWindow(resolution, file) {
  let win = new BrowserWindow({
    width: resolution.width,
    height: resolution.height
  });

  win.loadFile(file);

  // win.webContents.openDevTools();
  win.on("closed", () => {
    win = null;
  });
}

app.on("ready", () => {
  // Notes
  createWindow({ width: 1200, height: 750 }, "index.html");
  // Map
  createWindow({ width: 1800, height: 880 }, "map.html");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});
