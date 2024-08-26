/*
 * Renderer process for maps window
 */

var selectedMap = null;

window.addEventListener("load", async () => {
  // @ts-ignore
  window.electronAPI.shortcut.onTakeScreenshotShortcut(() => {
    document.getElementById("screenshot-button")?.click();
  });

  await refreshSourceList();
  refreshScreenshotList();
  refreshMapList();
});

document.getElementById("refresh-sources-list-button")?.addEventListener("click", async () => {
  await refreshSourceList();
});
document.getElementById("screenshot-button")?.addEventListener("click", () => {
  // @ts-ignore
  let sourceName = document.getElementById("screenshot-source-list")?.value ?? "";

  takeScreenshot(sourceName)
    .then((buffer) => {
      // @ts-ignore
      window.electronAPI.screenshot
        .add(buffer)
        .then(async (screenshotName) => {
          // @ts-ignore
          const screenshotFolder = await window.electronAPI.path.mapScreenshotFolder();
          prependScreenshotToContainer(screenshotName, screenshotFolder);
        })
        .catch((err) => console.error(err));
    })
    .catch((err) => console.error(err));
});
document.getElementById("new-map-button")?.addEventListener("click", (e) => {
  e.preventDefault();

  let mapNameInput = document.getElementById("new-map-name-input");
  // @ts-ignore
  let mapName = mapNameInput?.value ?? "";

  addMap(mapName)
    .then((name) => {
      prependMapToContainer(name);

      if (selectedMap !== name) selectMap(name);

      // @ts-ignore
      mapNameInput.value = "";
    })
    .catch(async (err) => {
      console.error(err);
      // @ts-ignore
      await window.electronAPI.dialog.show({
        type: "error",
        message: err.message,
      });
    });
});

/**
 * Get all available window names and add them to dropdown list
 */
async function refreshSourceList() {
  // @ts-ignore
  let sources = await window.electronAPI.screenshot.getSources();
  let sourceList = document.getElementById("screenshot-source-list");

  if (!sources) {
    console.error("No sources found");
  }

  if (sourceList) {
    sourceList.replaceChildren();

    sources.forEach((source) => {
      var option = document.createElement("option");
      option.setAttribute("value", source.name);
      option.text = source.name;

      sourceList.append(option);
    });
  } else {
    console.error("Screenshot source list not found");
  }
}

/**
 * Append screenshot images from screenshot folder to screenshot list
 */
function refreshScreenshotList() {
  // @ts-ignore
  window.electronAPI.screenshot
    .get()
    .then(async (screenshots) => {
      // @ts-ignore
      const screenshotFolder = await window.electronAPI.path.mapScreenshotFolder();

      screenshots.forEach((screenshotName) => {
        prependScreenshotToContainer(screenshotName, screenshotFolder);
      });
    })
    .catch((err) => console.error(err));
}

/**
 * Appends map buttons to map list
 */
function refreshMapList() {
  // @ts-ignore
  window.electronAPI.map
    .get()
    .then((maps) => {
      maps.forEach((map) => {
        prependMapToContainer(map);
      });
    })
    .catch((err) => console.error(err));
}

/**
 * Scans and saves a screenshot of the selected source as a note
 * @param {string} sourceName
 * @returns {Promise<Buffer>}
 */
function takeScreenshot(sourceName) {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    window.electronAPI.screenshot
      .take(sourceName)
      .then((buffer) => {
        resolve(buffer);
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
}

/**
 * @param {string} mapName
 */
function addMap(mapName) {
  // @ts-ignore
  return window.electronAPI.map.add(mapName);
}

/**
 * @param {string} name
 */
function deleteMap(name) {
  // @ts-ignore
  return window.electronAPI.map.delete(name);
}

/**
 * Appends screenshot to the screenshto list
 * @param {string} screenshotName - Screenshot's file name
 * @param {string} screenshotFolder - Path to screenshot folder
 */
function prependScreenshotToContainer(screenshotName, screenshotFolder) {
  const screenshotList = document.getElementById("map-screenshot-list");
  const screenshotPath = screenshotFolder + screenshotName + ".png";

  if (screenshotList) {
    let img = document.createElement("img");
    img.src = screenshotPath;
    img.classList.add("img-thumbnail", "mb-3");
    img.id = "screenshot-" + screenshotName;
    img.setAttribute("draggable", "true");

    screenshotList.prepend(img);

    // Add event to remove the image with right mouse click
    img.addEventListener("contextmenu", () => {
      // @ts-ignore
      window.electronAPI.dialog
        .confirm({
          message: "Delete screenshot?",
          buttons: ["Yes", "No"],
          type: "question",
        })
        .then((res) => {
          if (res.response === 0) {
            // @ts-ignore
            window.electronAPI.screenshot
              .delete(screenshotName)
              .then(() => {
                screenshotList.removeChild(img);
              })
              .catch((err) => {
                console.error(err);
              });
          }
        });
    });
  }
}

/**
 * Prepends map element to the map container
 * @param {string} name
 */
function prependMapToContainer(name) {
  let mapLinkContainer = document.getElementById("map-link-list");

  let button = document.createElement("button");
  button.type = "button";
  button.classList.add("list-group-item", "list-group-item-action");
  button.innerText = escapeHtml(name);

  button.addEventListener("click", () => {
    selectMap(name);
  });

  button.addEventListener("contextmenu", () => {
    // @ts-ignore
    window.electronAPI.dialog
      .confirm({
        message: "Delete map: " + name,
        buttons: ["Yes", "No"],
        type: "question",
      })
      .then((res) => {
        if (res.response === 0) {
          deleteMap(name).then(() => {
            if (selectedMap === name) selectMap("");

            mapLinkContainer?.removeChild(button);
          });
        }
      });
  });

  // @ts-ignore
  let index = [...mapLinkContainer?.children].findIndex((x) => x.innerText >= name);

  if (index > -1) {
    mapLinkContainer?.insertBefore(button, mapLinkContainer.childNodes[index]);
  } else {
    mapLinkContainer?.append(button);
  }
}

/**
 * Change selected map
 * @param {string} name - Name of the selected map
 */
function selectMap(name) {
  if (selectedMap === name) return;

  selectedMap = name;

  let mapLinkContainer = document.getElementById("map-link-list");

  if (mapLinkContainer) {
    mapLinkContainer.querySelector(".active")?.classList.remove("active");

    if (selectedMap) {
      Array.from(mapLinkContainer.querySelectorAll("button"))
        .find((x) => x.innerText === name)
        ?.classList.add("active");
      // TODO: load map
      //   if (mapName !== "") {
      //     loadMap(mapName);
      //     loadMapMarkers(mapName);
      //   }
    }
  }
}

/**
 * Sanitizes string
 *
 * @param {*} unsafe
 * @returns {string}
 */
function escapeHtml(unsafe) {
  return unsafe.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// const containerParent = document.getElementById("stage-parent"); // Container that has the Konva container as a child

// const mapJSONFolder = path.join(resourcePath, "/maps/"); // Path to map JSON files
// const mapMarkersJSONFolder = path.join(resourcePath, "/maps/markers/"); // Path to marker JSON files
// const mapMarkerIconFolder = path.join(__dirname, "/icons/"); // Path to icons

// const mapWidth = 704;
// const mapHeight = 704;
// const mapZoomDelta = 1.1; // Map zooming speed
// const cellSize = { x: 790, y: 425 }; // Map grid's cell size

// // Map variables ------------------------------------------------------

// let selectedMap = ""; // Name of the currently selected map
// const stage = new Konva.Stage({
//   container: "mapContainer",
//   scaleX: 0.12,
//   scaleY: 0.12,
//   width: mapWidth,
//   height: mapHeight,
//   draggable: false,
// });
// let gridLayer = new Konva.Layer();
// let mapLayer = new Konva.Layer();
// let markerLayer = new Konva.Layer();
// let dragItemType = ""; // Type of the item that is being dragged
// let dragItemURL = ""; // Path to image that is being dragged

// // Window events ------------------------------------------------------

// window.addEventListener("load", () => {
//   if (!fs.existsSync(path.join(resourcePath, "/maps/markers/"))) {
//     fs.mkdirSync(path.join(resourcePath, "/maps/markers"));
//     console.log("created");
//   }
//   // Load content
//   mapDrawing.fitStageIntoParentContainer(
//     containerParent,
//     {
//       width: mapWidth,
//       height: mapHeight,
//     },
//     stage
//   );
// });

//   // Init the map canvas
//   stage.add(mapLayer);
//   stage.add(markerLayer);
//   stage.add(gridLayer);
//   mapDrawing.drawGrid(7, 7, cellSize, gridLayer);
//   gridLayer.moveToBottom();

//   // Init drag and drop for screenshots and map tools
//   addDragEvents();
//   addDropEvents();
// });

// $(window).on("resize", () => {
//   // Adapt the stage on any window resize
//   mapDrawing.fitStageIntoParentContainer(
//     containerParent,
//     {
//       width: mapWidth,
//       height: mapHeight,
//     },
//     stage
//   );
// });

// // Konva stage events --------------------------------------------------

// stage.on("wheel", (e) => {
//   e.evt.preventDefault();

//   let pointerPosition = stage.getPointerPosition();

//   if (pointerPosition == null) return;

//   // Map zooming
//   let oldScale = stage.scaleX();

//   var mousePointTo = {
//     x: pointerPosition.x / oldScale - stage.x() / oldScale,
//     y: pointerPosition.y / oldScale - stage.y() / oldScale,
//   };

//   var newScale = e.evt.deltaY < 0 ? oldScale * mapZoomDelta : oldScale / mapZoomDelta;
//   stage.scale({ x: newScale, y: newScale });

//   var newPos = {
//     x: -(mousePointTo.x - pointerPosition.x / newScale) * newScale,
//     y: -(mousePointTo.y - pointerPosition.y / newScale) * newScale,
//   };
//   stage.position(newPos);
//   stage.batchDraw();
// });

// stage.on("mousedown", (e) => {
//   // Map dragging
//   if (e.evt.button === 1) {
//     stage.draggable(true);
//   } else {
//     stage.draggable(false);
//   }
// });

// // Drag and Drop events ------------------------------------------------

// /**
//  * Add drag and drop events to screenshot images and map tools
//  */
// function addDragEvents() {
//   let mapToolsContainer = $("#map-tools-container");
//   let mapText = $("#map-text");
//   let mapArrow = $("#map-arrow");
//   let mapScreenshotList = $("#map-screenshot-list");

//   // Map icons
//   if (mapToolsContainer) {
//     Array.from($(mapToolsContainer).find(".map-icon")).forEach((element) => {
//       $(element).on("dragstart", function (e) {
//         dragItemType = "icon";
//         dragItemURL = e.target.getAttribute("src")?.toString() ?? "";
//       });
//     });
//   } else {
//     console.error("Map tools container was not found");
//   }

//   // Text
//   if (mapText) {
//     $(mapText).on("dragstart", function (e) {
//       dragItemType = "text";
//       dragItemURL = "";
//     });
//   } else {
//     console.error("Map text was not found");
//   }

//   // Arrow
//   if (mapArrow) {
//     $(mapArrow).on("dragstart", function (e) {
//       dragItemType = "arrow";
//       dragItemURL = "";
//     });
//   } else {
//     console.error("Map arrow was not found");
//   }

//   // Add image drag and drop to screenshot list
//   if (mapScreenshotList) {
//     $(mapScreenshotList).on("dragstart", function (e) {
//       dragItemType = "image";
//       dragItemURL = e.target.getAttribute("src")?.toString() ?? "";
//     });
//   } else {
//     console.error("Map screenshot list was not found");
//   }
// }

// /**
//  * Add drop events to map canvas
//  */
// function addDropEvents() {
//   let stageContainer = stage.container(); // Konva canvas container

//   stageContainer.addEventListener("dragover", function (e) {
//     e.preventDefault();
//   });
//   stageContainer.addEventListener("drop", function (e) {
//     e.preventDefault();
//     stage.setPointersPositions(e);
//     if (dragItemType === "image") {
//       let position = mapDrawing.alignPositionToGrid(mapDrawing.getRelativePointerPosition(mapLayer), cellSize);
//       mapDrawing.addMapImageToLayer(dragItemURL, { x: position.x, y: position.y }, cellSize, mapLayer, (image) => {
//         mapDrawing.addEventsToMapImage(image, mapLayer, cellSize, stage, () => {
//           saveMap(selectedMap);
//         });
//         saveMap(selectedMap);
//       });
//     } else if (dragItemType === "icon") {
//       let position = mapDrawing.getRelativePointerPosition(markerLayer);
//       mapDrawing.addMarkerToLayer(dragItemURL, { x: position.x - 35, y: position.y - 35 }, markerLayer, (image) => {
//         mapDrawing.addEventsToMapMarker(image, markerLayer, stage, () => {
//           saveMapMarkers(selectedMap);
//         });
//         saveMapMarkers(selectedMap);
//       });
//     } else if (dragItemType === "text") {
//       let position = mapDrawing.getRelativePointerPosition(markerLayer);
//       // add text to layer
//       var textInput = $("#map-text-input");
//       var text = textInput.val();

//       if (text) {
//         mapDrawing.addTextToLayer(text.toString(), position, markerLayer, (textNode) => {
//           // Events
//           mapDrawing.addEventsToMapText(textNode, markerLayer, stage, () => {
//             saveMapMarkers(selectedMap);
//           });
//           saveMapMarkers(selectedMap);
//         });
//       }

//       textInput.val("");
//     } else if (dragItemType === "arrow") {
//       let position = mapDrawing.getRelativePointerPosition(markerLayer);
//       //add arrow to layer
//       let endPointOffset = 200;
//       let points = [position.x - endPointOffset, position.y, position.x + endPointOffset, position.y];
//       mapDrawing.addArrowToLayer(points, markerLayer, (objects) => {
//         mapDrawing.addEventsToMapArrow(objects, markerLayer, stage, () => {
//           saveMapMarkers(selectedMap);
//         });
//         saveMapMarkers(selectedMap);
//       });
//     }

//     dragItemType = "";
//   });
// }

// // Saving and loading functions -----------------------------------------

// /**
//  * Load map images to stage
//  *
//  * @param {string} mapName -Name of the map
//  */
// function loadMap(mapName) {
//   if (mapName === "") {
//     return alert("No map selected");
//   }
//   let mapPath = mapJSONFolder + mapName + ".json";
//   // Get new map's layer
//   let newMapLayer = mapDrawing.loadMapLayerFromJSON(
//     mapPath,
//     stage,
//     {
//       mapImageFolderPath: mapScreenshotFolder,
//       cellSize: cellSize,
//     },
//     () => {
//       saveMap(mapName);
//     }
//   );
//   // Change the old map layer to new layer
//   mapLayer.destroy();
//   mapLayer = newMapLayer;
//   // Add the new layer to stage
//   stage.add(newMapLayer);
//   // Move the new mapLayer under icon layer
//   mapLayer.moveDown();
// }

// /**
//  * Load map's marker layer
//  *
//  * @param {string} mapName - Name of the map of which marker's will be loaded
//  */
// function loadMapMarkers(mapName) {
//   if (mapName === "") {
//     return alert("No map selected");
//   }
//   let markersPath = mapMarkersJSONFolder + mapName + "-markers.json";
//   let newMarkerLayer = mapDrawing.loadMapMarkerLayerFromJSON(markersPath, stage, mapMarkerIconFolder, () => {
//     saveMapMarkers(mapName);
//   });
//   // Change the old layer to new one
//   markerLayer.destroy();
//   markerLayer = newMarkerLayer;
//   // Add new marker layer to stage
//   stage.add(newMarkerLayer);
//   // Move marker layer to top
//   markerLayer.moveToTop();
// }

// /**
//  * Saves map layer to a file
//  *
//  * @param {string} mapName -Name of the map
//  */
// function saveMap(mapName) {
//   if (mapName === "") {
//     return alert("No map selected");
//   }
//   let mapPath = mapJSONFolder + mapName + ".json";
//   mapDrawing.saveLayerToJSON(mapLayer, mapPath);
// }

// /**
//  * Save map markers to a JSON file
//  *
//  * @param {string} mapName - Name of the map
//  */
// function saveMapMarkers(mapName) {
//   if (mapName === "") {
//     return alert("No map selected");
//   }
//   let markersPath = mapMarkersJSONFolder + mapName + "-markers.json";
//   mapDrawing.saveLayerToJSON(markerLayer, markersPath);
// }
