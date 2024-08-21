const { app, globalShortcut, ipcMain } = require("electron/main");
const { createWindow: createNotesWindow } = require("./features/notes/notes.js");
const { createWindow: createMapsWindow } = require("./features/maps/maps.js");
const { getSources } = require("./features/screenCapture/screenCapture.js");

app.whenReady().then(() => {
  //createNotesWindow();
  createMapsWindow();

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
