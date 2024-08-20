const { app, globalShortcut, ipcMain } = require("electron/main");
const { createNotesWindow } = require("./features/notes/notes.js");
const { getSources } = require("./features/screenCapture/screenCapture.js");

app.whenReady().then(() => {
  createNotesWindow();
  //createWindow({ width: 1800, height: 880 }, "map.html");

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  ipcMain.handle("get-sources", () => {
    return getSources();
  });
});
