/**
 * Main process for maps window
 */

const { BrowserWindow, globalShortcut, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("fs");
const screenCapture = require("../screenCapture/screenCapture.js");

const mapScreenshotFolder = path.join(process.resourcesPath, "/screenshots/map/");
const mapsFolder = path.join(process.resourcesPath, "/maps/");

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

  ipcMain.handle("get-maps", () => {
    return getMaps();
  });

  ipcMain.handle("add-map", (_e, name) => {
    return addMap(name);
  });

  ipcMain.handle("delete-map", (_e, name) => {
    return deleteMap(name);
  });

  ipcMain.on("show-dialog", (_e, options) => {
    dialog.showMessageBox(win, options);
  });

  ipcMain.handle("confirm-dialog", (_e, options) => {
    return dialog.showMessageBox(win, options);
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
    fs.mkdirSync(mapScreenshotFolder, {
      recursive: true,
    });
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

/**
 * Return array of maps names
 */
function getMaps() {
  return new Promise((resolve, reject) => {
    fs.readdir(mapsFolder, (err, dir) => {
      if (err) reject(err);

      var fileNames = Array.from(dir, (x) => path.parse(x).name);
      resolve(fileNames);
    });
  });
}

/**
 * Saves new map as a json file
 * @param {string} name
 */
function addMap(name) {
  if (!fs.existsSync(mapsFolder)) {
    fs.mkdirSync(mapsFolder);
    console.log("Maps folder created");
  }

  return new Promise((resolve, reject) => {
    if (name.trim().length === 0) {
      reject("Name is invalid");
      return;
    }

    let filePath = path.join(mapsFolder, name + ".json");

    if (fs.existsSync(filePath)) {
      reject("Map already exists");
    } else {
      fs.writeFile(filePath, "[]", (err) => {
        if (err) {
          console.error(err);
          reject("Error occured while saving the file");
        } else {
          console.log("Map added: " + name);
          resolve(name);
        }
      });
    }
  });
}

/**
 * Deletes map file
 * @param {string} name
 */
function deleteMap(name) {
  return new Promise((resolve, reject) => {
    const path = mapsFolder + name + ".json";
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
      resolve(true);
    } else reject("Map not found");

    // TODO: markers
  });
}

module.exports = {
  createWindow,
};
