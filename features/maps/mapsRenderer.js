/*
 * Renderer process for maps window
 */

import * as canvasRenderer from "./mapCanvasRenderer.js";

var selectedMapName = null;

window.addEventListener("load", async () => {
  canvasRenderer.init();

  // @ts-ignore
  window.electronAPI.shortcut.onTakeScreenshotShortcut(() => {
    document.getElementById("screenshot-button")?.click();
  });

  await refreshSourceList();
  refreshScreenshotList();
  await refreshMapList();

  // Select first map if exists
  // @ts-ignore
  var initMaps = await window.electronAPI.map.get();

  if (initMaps?.length > 0) {
    selectMap(initMaps.sort()[0]);
  }
});

document.getElementById("refresh-sources-list-button")?.addEventListener("click", async () => {
  await refreshSourceList();
});
document.getElementById("screenshot-button")?.addEventListener("click", () => {
  if (!selectedMapName) return;

  // @ts-ignore
  let sourceName = document.getElementById("screenshot-source-list")?.value ?? "";

  takeScreenshot(sourceName)
    .then((buffer) => {
      // @ts-ignore
      window.electronAPI.screenshot
        .add({ buffer, mapName: selectedMapName })
        .then(async (/** @type {string} */ screenshotName) => {
          // @ts-ignore
          const screenshotFolder = await window.electronAPI.path.mapScreenshotFolder(selectedMapName);
          await prependScreenshotToContainer(screenshotName, screenshotFolder);
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

  if (mapName) {
    addMap(mapName)
      .then((name) => {
        insertMapToContainer(name);

        if (selectedMapName !== name) selectMap(name);

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
  }
});
document.addEventListener(canvasRenderer.mapChangeEvent.type, (e) => {
  // @ts-ignore
  updateMap(e.detail.data.json);
});
document.addEventListener(canvasRenderer.markerChangeEvent.type, (e) => {
  // @ts-ignore
  updateMapMarkers(e.detail.data.json);
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
  document.getElementById("map-screenshot-list")?.replaceChildren();

  if (!selectedMapName) return;

  // @ts-ignore
  window.electronAPI.screenshot
    .get(selectedMapName)
    .then(async (screenshots) => {
      if (!screenshots) return;

      // @ts-ignore
      const screenshotFolder = await window.electronAPI.path.mapScreenshotFolder(selectedMapName);

      screenshots.forEach(async (screenshotName) => {
        await prependScreenshotToContainer(screenshotName, screenshotFolder);
      });
    })
    .catch((err) => console.error(err));
}

/**
 * Appends map buttons to map list
 */
async function refreshMapList() {
  // @ts-ignore
  var maps = await window.electronAPI.map.get();

  if (maps) {
    maps = maps.sort();
    maps.forEach((map) => {
      insertMapToContainer(map);
    });
  }
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
 * Saves map layer to a file
 * @param {string} json - Map data
 */
function updateMap(json) {
  if (!selectedMapName || !json) return;

  // @ts-ignore
  return window.electronAPI.map.update({ name: selectedMapName, json: json });
}

/**
 * Saves map markers to a JSON file
 * @param {string} json - Marker data
 */
function updateMapMarkers(json) {
  if (!selectedMapName || !json) return;

  // @ts-ignore
  return window.electronAPI.map.markers.update({ name: selectedMapName, json: json });
}

/**
 * Appends screenshot to the screenshto list
 * @param {string} screenshotName - Screenshot's file name
 * @param {string} screenshotFolder - Path to screenshot folder
 */
async function prependScreenshotToContainer(screenshotName, screenshotFolder) {
  const screenshotList = document.getElementById("map-screenshot-list");

  // @ts-ignore
  const screenshotPath = await window.electronAPI.path.join([screenshotFolder, `${screenshotName}.png`]);

  if (screenshotList && screenshotPath) {
    let img = document.createElement("img");
    img.src = screenshotPath;
    img.classList.add("pb-1", "pt-1", "mw-100");
    img.id = `screenshot-${screenshotName}`;
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
              .delete({ screenshotName, selectedMapName })
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
function insertMapToContainer(name) {
  let mapLinkContainer = document.getElementById("map-link-list");

  let button = document.createElement("button");
  button.type = "button";
  button.classList.add("list-group-item", "list-group-item-action");
  button.innerText = name;

  button.addEventListener("click", () => {
    selectMap(name);
  });

  // Maps are listed in alphabetical order
  // @ts-ignore
  let index = [...mapLinkContainer?.children].findIndex((x) => x.innerText >= name);

  if (index > -1) {
    mapLinkContainer?.insertBefore(button, mapLinkContainer.childNodes[index]);
  } else {
    mapLinkContainer?.append(button);
  }

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
          deleteMap(name).then(async () => {
            if (selectedMapName === name) {
              // Select first map
              // @ts-ignore
              var initMaps = await window.electronAPI.map.get();
              if (initMaps?.length > 0) {
                selectMap(initMaps.sort()[0]);
              } else selectMap("");
            }

            mapLinkContainer?.removeChild(button);
          });
        }
      });
  });
}

/**
 * Change selected map
 * @param {string} name - Name of the selected map
 */
function selectMap(name) {
  if (selectedMapName === name) return;

  selectedMapName = name;

  let mapLinkContainer = document.getElementById("map-link-list");

  if (mapLinkContainer) {
    mapLinkContainer.querySelector(".active")?.classList.remove("active");

    if (selectedMapName) {
      Array.from(mapLinkContainer.querySelectorAll("button"))
        .find((x) => x.innerText === name)
        ?.classList.add("active");
    }
  }

  // @ts-ignore
  window.electronAPI.map
    .getByName(selectedMapName)
    .then(async ({ map: mapJson, markers: markersJson }) => {
      refreshScreenshotList();
      canvasRenderer.changeMap(selectedMapName, mapJson, markersJson);
    })
    .catch((err) => {
      console.error(err);
      return;
    });
}
