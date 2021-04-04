/*
 * Renderer script for map window
 */

const electron = require("electron");
const screenCapture = require("./screenCapture.js");
const desktopCapturer = electron.desktopCapturer;
const mapDrawing = require("./mapDrawing.js");
const { remote } = require("electron");
const { globalShortcut } = remote;
const Konva = require("konva");
const path = require("path");
const $ = require("jquery");
const fs = require("fs");
require("bootstrap");

// Map settings ---------------------------------------------------

// const resourcePath = process.resourcesPath;
const mapJSONFolder = "/maps/"; // Path to map JSON files
const mapMarkersJSONFolder = "/maps/markers/"; // Path to marker JSON files
const mapMarkerIconFolder = "/icons/"; // Path to icons
const mapCropOptions = {
  // Settings for cropping the map screenshot
  x: 65,
  y: 70,
  width: 790,
  height: 425
};

// Window events ------------------------------------------------------

window.addEventListener("load", () => {
  // Check and add folders if they does not exist.
  if (!fs.existsSync(path.join(resourcePath, "/screenshots/"))) {
    fs.mkdirSync(path.join(resourcePath, "/screenshots"));
    console.log("created");
  }
  if (!fs.existsSync(path.join(resourcePath, "/screenshots/map/"))) {
    fs.mkdirSync(path.join(resourcePath, "/screenshots/map"));
    console.log("created");
  }
  if (!fs.existsSync(path.join(resourcePath, "/maps/"))) {
    fs.mkdirSync(path.join(resourcePath, "/maps"));
    console.log("created");
  }
  if (!fs.existsSync(path.join(resourcePath, "/maps/markers/"))) {
    fs.mkdirSync(path.join(resourcePath, "/maps/markers"));
    console.log("created");
  }
  // Add shortcuts
  globalShortcut.register("CommandOrControl+shift+M", () => {
    takeAndSaveScreenshot();
  });
  // Load content
  refreshWindowsList();
  refreshScreenshotList();
  refreshMapLinkList();
  mapDrawing.fitStageIntoParentContainer(
    containerParent,
    {
      width: mapWidth,
      height: mapHeight
    },
    stage
  );
});


