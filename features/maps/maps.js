/**
 * Main process for maps window
 */

const { BrowserWindow, globalShortcut, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("fs");
const screenCapture = require("../screenCapture/screenCapture.js");
const { mkdirSync } = require("node:fs");

const mapsFolder = path.join(process.resourcesPath, "maps");
const mapIconFolder = path.join(__dirname, "..", "..", "assets", "icons");
const markersSuffix = "-markers";
const screenshotFolderName = "screenshots";

/**
 * Creates window for maps
 */
function createWindow() {
  initDirectories();

  let win = new BrowserWindow({
    width: 1800,
    height: 880,
    webPreferences: {
      preload: path.join(__dirname, "mapsPreload.js"),
      disableDialogs: true,
    },
    show: false,
  });

  win.removeMenu();

  win.loadFile(path.join(__dirname, "maps.html"));

  win.once("ready-to-show", () => {
    globalShortcut.register("CommandOrControl+shift+M", () => {
      win.webContents.postMessage("shortcut:take-screenshot", null);
    });

    win.show();
  });

  win.on("closed", () => {
    globalShortcut.unregister("CommandOrControl+shift+M");
  });

  ipcMain.handle("get-map-screenshot-path", (_e, mapName) => {
    return path.join(mapsFolder, mapName, screenshotFolderName);
  });

  ipcMain.handle("get-map-icon-path", () => {
    return mapIconFolder;
  });

  ipcMain.handle("path-exists", (_e, path) => {
    return pathExists(path);
  });

  ipcMain.handle("get-file-name", (_e, path) => {
    return getFileName(path);
  });

  ipcMain.handle("path-join", (_e, args) => {
    return path.join(...args);
  });

  ipcMain.handle("get-screenshots", (_e, mapName) => {
    return getScreenshots(mapName);
  });

  ipcMain.handle("maps:take-screenshot", (_e, source) => {
    return takeScreenshot(source);
  });

  ipcMain.handle("add-screenshot", (_e, { buffer, mapName }) => {
    return addScreenshot(buffer, mapName);
  });

  ipcMain.handle("delete-screenshot", (_e, { screenshotName, mapName }) => {
    return deleteScreenshot(screenshotName, mapName);
  });

  ipcMain.handle("get-maps", () => {
    return getMaps();
  });

  ipcMain.handle("get-map", (_e, name) => {
    return getMap(name);
  });

  ipcMain.handle("add-map", (_e, name) => {
    return addMap(name);
  });

  ipcMain.handle("update-map", (_e, { name, json }) => {
    return updateMap(name, json);
  });

  ipcMain.handle("delete-map", (_e, name) => {
    return deleteMap(name);
  });

  ipcMain.handle("update-markers", (_e, { name, json }) => {
    return updateMapMarkers(name, json);
  });

  ipcMain.on("show-dialog", (_e, options) => {
    showDialog(win, options);
  });

  ipcMain.handle("maps:confirm-dialog", (_e, options) => {
    return showDialog(win, options);
  });
}

/**
 * Creates needed folders and files
 */
function initDirectories() {
  if (!fs.existsSync(mapsFolder)) {
    fs.mkdirSync(mapsFolder);
    console.log("Maps folder created");
  }
}

/**
 * @param {string} path
 */
function pathExists(path) {
  return fs.existsSync(path);
}

/**
 * @param {string} filePath
 */
function getFileName(filePath) {
  return path.parse(filePath).name;
}

/**
 * Returns array of screenshot file names
 * @param {string} mapName
 */
function getScreenshots(mapName) {
  return new Promise((resolve, reject) => {
    if (!validateMapName(mapName)) {
      reject("Invalid name");
      return;
    }

    const dirPath = path.join(mapsFolder, mapName, screenshotFolderName);

    if (fs.existsSync(dirPath)) {
      fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
        if (err) reject(err);
        else {
          resolve(files.filter((x) => x.isFile()).map((x) => getFileName(x.name)));
        }
      });
    } else {
      resolve(null);
    }
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
 * @param {string} mapName
 */
function addScreenshot(buffer, mapName) {
  return new Promise((resolve, reject) => {
    if (!validateMapName(mapName)) {
      reject("Invalid name");
      return;
    }

    if (buffer) {
      const screenshotFileName = new Date().getTime().toString();
      const screenshotFolder = path.join(mapsFolder, mapName, screenshotFolderName);
      const filePath = path.join(mapsFolder, mapName, screenshotFolderName, `${screenshotFileName}.png`);

      mkdirSync(screenshotFolder, { recursive: true });

      fs.writeFileSync(filePath, buffer);
      console.log(screenshotFileName + ".png saved.");

      resolve(screenshotFileName);
    } else {
      reject("Buffer can't be:" + buffer);
    }
  });
}

/**
 * Deletes screenshot file
 * @param {string} screenshotName
 * @param {string} mapName
 * @returns
 */
function deleteScreenshot(screenshotName, mapName) {
  return new Promise((resolve, reject) => {
    if (!validateMapName(mapName)) {
      reject("Invalid name");
      return;
    }

    const filePath = path.join(mapsFolder, mapName, screenshotFolderName, `${screenshotName}.png`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      resolve(true);
    } else reject("Screenshot not found");
  });
}

/**
 * Return array of maps names
 */
function getMaps() {
  return new Promise((resolve, reject) => {
    fs.readdir(mapsFolder, { withFileTypes: true }, (err, files) => {
      if (err) reject(err);
      else {
        // Maps are on their of directories inside the maps directory
        resolve(files.filter((x) => x.isDirectory()).map((x) => x.name));
      }
    });
  });
}

/**
 * Returns map data
 * @param {string} name
 */
function getMap(name) {
  return new Promise((resolve, reject) => {
    if (!validateMapName(name)) {
      reject("Invalid name");
      return;
    }

    try {
      const mapDataPath = path.join(mapsFolder, name, `${name}.json`);
      const mapMarkerDataPath = path.join(mapsFolder, name, `${name}${markersSuffix}.json`);

      const mapJson = JSON.parse(fs.readFileSync(mapDataPath, "utf8"));
      const markerJson = fs.existsSync(mapMarkerDataPath) ? JSON.parse(fs.readFileSync(mapMarkerDataPath, "utf8")) : null;

      resolve({ map: mapJson, markers: markerJson });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Saves new map as a json file
 * @param {string} name
 */
function addMap(name) {
  return new Promise((resolve, reject) => {
    if (!validateMapName(name)) {
      reject("Name is invalid");
      return;
    }

    const mapFolderPath = path.join(mapsFolder, name);
    const filePath = path.join(mapFolderPath, `${name}.json`);

    mkdirSync(mapFolderPath, { recursive: true });

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
 * Updates map data to a file
 * @param {string} name - Map name
 * @param {string} json - Map data
 */
function updateMap(name, json) {
  return new Promise((resolve, reject) => {
    if (!validateMapName(name)) {
      reject("Name is invalid");
      return;
    }

    const filePath = path.join(mapsFolder, name, `${name}.json`);

    if (fs.existsSync(filePath)) {
      fs.writeFile(filePath, json, (err) => {
        if (err) {
          console.error(err);
          reject("Error occured while saving the file");
        } else {
          console.log("Map updated: " + name);
          resolve(name);
        }
      });
    } else {
      reject("Map file was not found");
    }
  });
}

/**
 * Deletes map file
 * @param {string} name
 */
function deleteMap(name) {
  return new Promise((resolve, reject) => {
    if (!validateMapName(name)) return;

    const mapFolderPath = path.join(mapsFolder, name);

    fs.rmSync(mapFolderPath, { recursive: true, force: true });

    resolve(true);
  });
}

/**
 * Saves map marker data to a file
 * @param {string} name - Map name
 * @param {string} json - Marker data
 */
function updateMapMarkers(name, json) {
  return new Promise((resolve, reject) => {
    if (!validateMapName(name)) {
      reject("Name is invalid");
      return;
    }

    const folderPath = path.join(mapsFolder, name);
    const filePath = path.join(folderPath, `${name}${markersSuffix}.json`);

    mkdirSync(folderPath, { recursive: true });

    if (fs.existsSync(folderPath)) {
      fs.writeFile(filePath, json, (err) => {
        if (err) {
          console.error(err);
          reject("Error occured while saving the file");
        } else {
          console.log("Map markers updated: " + name);
          resolve(name);
        }
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * @param {BrowserWindow} win
 * @param {Electron.MessageBoxOptions} options
 * @returns
 */
function showDialog(win, options) {
  return dialog.showMessageBox(win, options);
}

/**
 * Returns true, if the given name is valid
 * @param {string} name
 */
function validateMapName(name) {
  return name && name.length > 0 ? true : false;
}

module.exports = {
  createWindow,
};
