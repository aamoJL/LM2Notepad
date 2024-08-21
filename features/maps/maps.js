const { BrowserWindow, globalShortcut, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("fs");
const screenCapture = require("../screenCapture/screenCapture.js");

const mapScreenshotFolder = path.join(process.resourcesPath, "/screenshots/map/");

/**
 * Creates window for maps
 */
function createWindow() {
  let win = new BrowserWindow({
    width: 1800,
    height: 880,
    webPreferences: {
      preload: path.join(__dirname, "mapsPreload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "maps.html"));

  win.on("ready-to-show", () => {
    globalShortcut.register("CommandOrControl+shift+M", () => {
      win.webContents.postMessage("shortcut:take-screenshot", null);
    });
  });

  win.on("closed", () => {
    globalShortcut.unregister("CommandOrControl+shift+M");
    // TODO: remove handlers
    ipcMain.removeHandler("get-map-screenshot-path");
    ipcMain.removeHandler("get-screenshots");
    ipcMain.removeHandler("take-screenshot");
    ipcMain.removeHandler("add-screenshot");
    ipcMain.removeHandler("delete-screenshot");
  });

  ipcMain.handle("get-map-screenshot-path", () => {
    return mapScreenshotFolder;
  });

  ipcMain.handle("get-screenshots", () => {
    return getScreenshots();
  });

  ipcMain.handle("take-screenshot", (_e, source) => {
    return takeScreenshot(source);
  });

  ipcMain.handle("add-screenshot", (_e, buffer) => {
    return addScreenshot(buffer);
  });

  ipcMain.handle("delete-screenshot", (_e, name) => {
    return deleteScreenshot(name);
  });
}

/**
 * Returns array of screenshot file names
 */
function getScreenshots() {
  return new Promise((resolve, reject) => {
    fs.readdir(mapScreenshotFolder, (err, dir) => {
      if (err) reject(err);

      var fileNames = Array.from(dir, (x) => path.parse(x).name);
      resolve(fileNames);
    });
  });
}

/**
 * @param {string} source Source name
 * @returns {Promise<Buffer>} screenshot buffer
 */
function takeScreenshot(source) {
  return new Promise((resolve, reject) => {
    if (!source) {
      reject("Source name is undefined");
    }

    console.log("Taking screenshot. source: " + source + "...");

    screenCapture
      .getWindowThumbnail(source)
      .then((screenshot) => {
        screenshot = screenCapture
          .cropImage(screenshot, {
            x: 65,
            y: 70,
            width: 790,
            height: 425,
          })
          .toPNG();

        resolve(screenshot);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 * Saves screeshot in to a file
 * @param {Buffer} buffer - Screenshot buffer
 */
function addScreenshot(buffer) {
  if (!fs.existsSync(mapScreenshotFolder)) {
    fs.mkdirSync(mapScreenshotFolder);
    console.log("screenshot folder created");
  }

  return new Promise((resolve, reject) => {
    if (buffer) {
      let screenshotFileName = new Date().getTime().toString();
      let path = mapScreenshotFolder + screenshotFileName + ".png";

      fs.writeFileSync(path, buffer);
      console.log(screenshotFileName + ".png saved.");

      resolve(screenshotFileName);
    } else {
      reject("Buffer can't be:" + buffer);
    }
  });
}

/**
 * Deletes screenshot file
 * @param {string} name - Screenshot name
 * @returns
 */
function deleteScreenshot(name) {
  return new Promise((resolve, reject) => {
    const path = mapScreenshotFolder + name + ".png";
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
      resolve(true);
    } else reject("Screenshot not found");
  });
}

module.exports = {
  createWindow,
};
