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

// #region : Map settings
// Container that has the Konva container as a child
const containerParent = document.getElementById("stage-parent");
// Path to map screenshots
const mapScreenshotFolder = "./screenshots/map/";
// Path to map JSON files
const mapJSONFolder = "./maps/";
const mapMarkersJSONFolder = "./maps/markers/";
const mapMarkerIconFolder = "./icons/";
// Settings for cropping the map screenshot
const mapCropOptions = {
  x: 65,
  y: 70,
  width: 790,
  height: 425
};
const mapWidth = 704;
const mapHeight = 704;
// Map zooming speed
const mapZoomDelta = 1.1;

// Name of the currently selected map
let selectedMap = "";
// Map grid cell size
let cellSize = { x: 790, y: 425 };
let stage = new Konva.Stage({
  container: "mapContainer",
  scaleX: 0.12,
  scaleY: 0.12,
  width: mapWidth,
  height: mapHeight,
  draggable: false
});
let gridLayer = new Konva.Layer();
let mapLayer = new Konva.Layer();
let markerLayer = new Konva.Layer();
// #endregion

// #region : Init the page

// Window events

// Shortcuts
window.addEventListener("load", () => {
  globalShortcut.register("CommandOrControl+shift+M", () => {
    takeAndSaveScreenshot();
  });
});

window.addEventListener("beforeunload", () => {
  globalShortcut.unregister("CommandOrControl+shift+M", () =>
    takeAndScanThumbnail()
  );
});

$(document).ready(function() {
  $('[data-toggle="tooltip"]').tooltip();
});

$(window).on("load", () => {
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

// adapt the stage on any window resize
$(window).on("resize", () => {
  mapDrawing.fitStageIntoParentContainer(
    containerParent,
    {
      width: mapWidth,
      height: mapHeight
    },
    stage
  );
});

// Button functions
$("#refresh-windows-list-button").on("click", function() {
  refreshWindowsList();
});
$("#screenshot-button").on("click", function() {
  takeAndSaveScreenshot();
});
$("#new-map-button").on("click", function(e) {
  e.preventDefault();
  // Get name input
  let newMapNameInput = $("#new-map-name-input");
  addNewMap(newMapNameInput.val());
  // Clear name input
  newMapNameInput.val("");
});

// Stage events
stage.on("wheel", e => {
  e.evt.preventDefault();
  var oldScale = stage.scaleX();

  var mousePointTo = {
    x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
    y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale
  };

  var newScale =
    e.evt.deltaY < 0 ? oldScale * mapZoomDelta : oldScale / mapZoomDelta;
  stage.scale({ x: newScale, y: newScale });

  var newPos = {
    x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
    y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
  };
  stage.position(newPos);
  stage.batchDraw();
});
stage.on("mousedown", e => {
  if (e.evt.button === 1) {
    stage.draggable(true);
  } else {
    stage.draggable(false);
  }
});

// Init the map canvas
stage.add(mapLayer);
stage.add(markerLayer);
stage.add(gridLayer);
mapDrawing.drawGrid(7, 7, cellSize, gridLayer);
gridLayer.moveToBottom();

// Drag and drop for map tools in map tools container
Array.from(
  document
    .getElementById("map-tools-container")
    .getElementsByClassName("map-icon")
).forEach(element => {
  element.addEventListener("dragstart", function(e) {
    dragItemType = "icon";
    dragItemURL = e.target.src;
  });
});

// Drag and drop for text
document.getElementById("map-text").addEventListener("dragstart", function(e) {
  dragItemType = "text";
  dragItemURL = "";
});

document.getElementById("map-arrow").addEventListener("dragstart", function(e) {
  dragItemType = "arrow";
  dragItemURL = "";
});

// Add image drag and drop to screenshot list
document
  .getElementById("map-screenshot-list")
  .addEventListener("dragstart", function(e) {
    dragItemType = "image";
    dragItemURL = e.target.src;
  });

// Konva canvas container
let stageContainer = stage.container();
// Path to image that is being dragged
let dragItemType = "";
let dragItemURL = "";

stageContainer.addEventListener("dragover", function(e) {
  e.preventDefault();
});
stageContainer.addEventListener("drop", function(e) {
  e.preventDefault();
  stage.setPointersPositions(e);
  if (dragItemType === "image") {
    let position = mapDrawing.alignPositionToGrid(
      mapDrawing.getRelativePointerPosition(mapLayer),
      cellSize
    );
    mapDrawing.addMapImageToLayer(
      dragItemURL,
      { x: position.x, y: position.y },
      cellSize,
      mapLayer,
      image => {
        mapDrawing.addEventsToMapImage(image, mapLayer, cellSize, stage, () => {
          saveMap(selectedMap);
        });
        saveMap(selectedMap);
      }
    );
  } else if (dragItemType === "icon") {
    let position = mapDrawing.getRelativePointerPosition(markerLayer);
    mapDrawing.addMarkerToLayer(
      dragItemURL,
      { x: position.x - 35, y: position.y - 35 },
      markerLayer,
      image => {
        mapDrawing.addEventsToMapMarker(image, markerLayer, stage, () => {
          saveMapMarkers(selectedMap);
        });
        saveMapMarkers(selectedMap);
      }
    );
  } else if (dragItemType === "text") {
    let position = mapDrawing.getRelativePointerPosition(markerLayer);
    // add text to layer
    var textInput = $("#map-text-input");
    var text = textInput.val();
    if (text !== "" && text !== null) {
      mapDrawing.addTextToLayer(text, position, markerLayer, textNode => {
        // Events
        mapDrawing.addEventsToMapText(textNode, markerLayer, stage, () => {
          saveMapMarkers(selectedMap);
        });
        saveMapMarkers(selectedMap);
      });
    }
    textInput.val("");
  } else if (dragItemType === "arrow") {
    let position = mapDrawing.getRelativePointerPosition(markerLayer);
    //add arrow to layer
    let endPointOffset = 200;
    let points = [
      position.x - endPointOffset,
      position.y,
      position.x + endPointOffset,
      position.y
    ];
    mapDrawing.addArrowToLayer(points, markerLayer, objects => {
      mapDrawing.addEventsToMapArrow(objects, markerLayer, stage, () => {
        saveMapMarkers(selectedMap);
      });
      saveMapMarkers(selectedMap);
    });
  }
  dragItemType = "";
});

// #endregion

/** Load map images to stage
 *
 * @param {string} mapName -Name of the map
 */
function loadMap(mapName) {
  if (mapName === "") {
    return alert("No map selected");
  }
  let mapPath = mapJSONFolder + mapName + ".json";
  // Get new map layer
  let newMapLayer = mapDrawing.loadMapLayerFromJSON(
    mapPath,
    stage,
    {
      mapImageFolderPath: mapScreenshotFolder,
      cellSize: cellSize
    },
    () => {
      saveMap(mapName);
    }
  );
  // Remove old map layer
  mapLayer.destroy();
  // Add the new layer to stage
  stage.add(newMapLayer);
  mapLayer = newMapLayer;
  // Move the new mapLayer under icon layer
  mapLayer.moveDown();
}

function loadMapMarkers(mapName) {
  if (mapName === "") {
    return alert("No map selected");
  }
  let markersPath = mapMarkersJSONFolder + mapName + "-markers.json";
  let newMarkerLayer = mapDrawing.loadMapMarkerLayerFromJSON(
    markersPath,
    stage,
    mapMarkerIconFolder,
    () => {
      saveMapMarkers(mapName);
    }
  );
  // Remove old marker layer
  markerLayer.destroy();
  // Add new marker layer to stage
  stage.add(newMarkerLayer);
  markerLayer = newMarkerLayer;
  // Move marker layer to top
  markerLayer.moveToTop();
}

/** Saves map layer to a file
 *
 * @param {string} mapName -Name of the map
 */
function saveMap(mapName) {
  if (mapName === "") {
    return alert("No map selected");
  }
  let mapPath = mapJSONFolder + mapName + ".json";
  mapDrawing.saveLayerToJSON(mapLayer, mapPath);
}

function saveMapMarkers(mapName) {
  if (mapName === "") {
    return alert("No map selected");
  }
  let markersPath = mapMarkersJSONFolder + mapName + "-markers.json";
  mapDrawing.saveLayerToJSON(markerLayer, markersPath);
}

/** Gets all available window names and adds them to dropdown list.
 *
 */
function refreshWindowsList() {
  desktopCapturer.getSources({ types: ["window"] }, (error, sources) => {
    if (error) {
      return console.log(error.message);
    }

    let windowList = $("#screenshot-window-list");
    windowList.empty();

    sources.forEach(source => {
      windowList.append(
        $("<option></option>")
          .attr("value", source.name)
          .text(source.name)
      );
      //console.log(source.name);
    });
  });
}

/** Appends screenshot images from screenshot folder to screenshot list
 *
 */
function refreshScreenshotList() {
  let screenshotList = $("#map-screenshot-list");
  screenshotList.empty();
  // Get files in directory
  fs.readdir(mapScreenshotFolder, (err, dir) => {
    $.each(dir, function(index, value) {
      let imgName = path.parse(value).name;
      screenshotList.prepend(`
      <img
        src="./screenshots/map/${value}"
        id="${imgName}"
        class="img-thumbnail mb-3"
        draggable="true"
      />`);
      // Add event to remove the image with right mouse click
      $(`#${imgName}`).on("mousedown", e => {
        if (e.button === 2) {
          screenshotRemoveConfirmation(mapScreenshotFolder + value);
        }
      });
    });
  });
}

/** Appends map links from maps folder to link list
 *
 */
function refreshMapLinkList() {
  let mapLinkList = $("#map-link-list");
  mapLinkList.empty();
  // Get files in directory
  fs.readdir(mapJSONFolder, (err, dir) => {
    $.each(dir, function(index, value) {
      // Only json files are valid maps
      if (path.parse(value).ext !== ".json") {
        return;
      }
      let mapName = path.parse(value).name;
      // Name of the map without spaces for button ID
      var mapNameNoSpaces = mapName.replace(/\s+/g, "-");
      // if no map is selected, select first map in directory
      mapLinkList.append(`
      <button
        id="${mapNameNoSpaces}-button"
        type="button"
        class="list-group-item list-group-item-action"
      >
        ${mapName}
      </button>
      `);
      $(`#${mapNameNoSpaces}-button`).on("click", function() {
        selectMap(mapName);
      });
      if (selectedMap === "" || selectedMap === mapName) {
        selectMap(mapName);
      }
    });
  });
}

/** Changes selected map
 *
 * @param {string} mapName -Name of the selected map
 */
function selectMap(mapName) {
  var mapNameNoSpaces = mapName.replace(/\s+/g, "-");
  if (selectedMap !== "") {
    var selectedMapNameNoSpaces = selectedMap.replace(/\s+/g, "-");
    $(`#${selectedMapNameNoSpaces}-button`).removeClass("active");
  }
  selectedMap = mapName;
  $(`#${mapNameNoSpaces}-button`).addClass("active");

  if (mapName !== "") {
    loadMap(mapName);
    loadMapMarkers(mapName);
  }
}

/** Adds json file for the new map data and refreshes map link list
 *
 * @param {string} mapName -Name of the new map
 */
function addNewMap(mapName) {
  if (mapName === "") {
    alert("Map name can't be empty");
  }
  try {
    if (fs.existsSync(mapJSONFolder + mapName + ".json")) {
      // File exists, give error
      alert("Map already exists");
    } else {
      // File does not exist, make it
      var path = mapJSONFolder + mapName + ".json";
      fs.closeSync(fs.openSync(path, "a"));
      refreshMapLinkList();
    }
  } catch (err) {
    console.error(err);
  }
}

/** Asks user if they want to remove an image,
 * removes the image and refreshes screenshotlist
 *
 * @param {string} path -Full path to image that is asked to be removed
 */
function screenshotRemoveConfirmation(path) {
  if (window.confirm("Delete?")) {
    screenCapture.removeImage(path);
    refreshScreenshotList();
  }
}

/** Takes and saves a screenshot of the selected window
 *
 */
function takeAndSaveScreenshot() {
  // Get thumbnail image
  let windowList = $("#screenshot-window-list");
  screenCapture.getWindowThumbnail(windowList.val(), function(screenshot) {
    screenshot = screenCapture.cropImage(screenshot, mapCropOptions).toPNG();
    screenCapture.saveScreenshotToFile(
      screenshot,
      mapScreenshotFolder,
      function(path) {
        refreshScreenshotList();
      }
    );
  });
}
