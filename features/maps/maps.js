/**
 * Main process for maps window
 */

const { BrowserWindow, globalShortcut, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("fs");
const screenCapture = require("../screenCapture/screenCapture.js");

const mapScreenshotFolder = path.join(process.resourcesPath, "/screenshots/map/");
const mapsFolder = path.join(process.resourcesPath, "/maps/");
const mapMarkersFolder = path.join(process.resourcesPath, "/maps/markers/");
const mapIconFolder = path.join(process.cwd(), "/icons/");

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

  ipcMain.handle("get-map-icon-path", () => {
    return mapIconFolder;
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

      var fileNames = Array.from(
        dir.filter((x) => x.includes(".json")),
        (x) => path.parse(x).name
      );
      resolve(fileNames);
    });
  });
}

/**
 * Returns map data
 * @param {string} name
 */
function getMap(name) {
  return new Promise((resolve, reject) => {
    try {
      let mapDataPath = path.join(mapsFolder, name + ".json");
      let mapMarkerDataPath = path.join(mapMarkersFolder, name + "-markers.json");

      let mapJson = JSON.parse(fs.readFileSync(mapDataPath, "utf8"));
      let markerJson = fs.existsSync(mapMarkerDataPath) ? JSON.parse(fs.readFileSync(mapMarkerDataPath, "utf8")) : null;

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
 * Updates map data to a file
 * @param {string} name - Map name
 * @param {string} json - Map data
 */
function updateMap(name, json) {
  return new Promise((resolve, reject) => {
    if (name.trim().length === 0) {
      reject("Name is invalid");
      return;
    }

    let filePath = path.join(mapsFolder, name + ".json");

    fs.writeFile(filePath, json, (err) => {
      if (err) {
        console.error(err);
        reject("Error occured while saving the file");
      } else {
        console.log("Map updated: " + name);
        resolve(name);
      }
    });
  });
}

/**
 * Deletes map file
 * @param {string} name
 */
function deleteMap(name) {
  return new Promise((resolve, reject) => {
    const mapPath = mapsFolder + name + ".json";
    const markersPath = mapMarkersFolder + name + "-markers.json";

    if (fs.existsSync(mapPath)) {
      fs.unlinkSync(mapPath);

      if (fs.existsSync(markersPath)) fs.unlinkSync(markersPath);

      resolve(true);
    } else reject("Map not found");
  });
}

/**
 * Saves map marker data to a file
 * @param {string} name - Map name
 * @param {string} json - Marker data
 */
function updateMapMarkers(name, json) {
  if (!fs.existsSync(mapMarkersFolder)) {
    fs.mkdirSync(mapMarkersFolder);
    console.log("Map marker folder created");
  }

  return new Promise((resolve, reject) => {
    if (name.trim().length === 0) {
      reject("Name is invalid");
      return;
    }

    let filePath = path.join(mapMarkersFolder, name + "-markers.json");

    fs.writeFile(filePath, json, (err) => {
      if (err) {
        console.error(err);
        reject("Error occured while saving the file");
      } else {
        console.log("Map markers updated: " + name);
        resolve(name);
      }
    });
  });
}

module.exports = {
  createWindow,
};
