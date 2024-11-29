/**
 * Map canvas scripts
 */

// Container that has the Konva container as a child
const containerParent = document.getElementById("stage-parent");
const mapOptions = {
  width: 704,
  height: 704,
  zoomDelta: 1.1, // Map zooming speed
  cellSize: { x: 790, y: 425 },
};
// @ts-ignore
const stage = new Konva.Stage({
  container: "mapContainer",
  scaleX: 0.12,
  scaleY: 0.12,
  width: mapOptions.width,
  height: mapOptions.height,
  draggable: false,
});
// @ts-ignore
var gridLayer = new Konva.Layer();
// @ts-ignore
var mapLayer = new Konva.Layer();
// @ts-ignore
var markerLayer = new Konva.Layer();

let dragArgs = {
  itemType: "", // Type of the item that is being dragged
  itemURL: "", // Path to image that is being dragged
};

const mapChangeEvent = new CustomEvent("map-change", { detail: { data: { json: "" } } });
const markerChangeEvent = new CustomEvent("marker-change", { detail: { data: { json: "" } } });

function init() {
  resizeStage();

  // Init the map canvas
  stage.add(mapLayer);
  stage.add(markerLayer);
  stage.add(gridLayer);

  drawGrid(7, 7, mapOptions.cellSize, gridLayer);

  gridLayer.moveToBottom();

  addDragEvents();
  addDropEvents();

  window.addEventListener("resize", () => {
    resizeStage();
  });

  stage.on("wheel", (e) => {
    e.evt.preventDefault();

    let pointerPosition = stage.getPointerPosition();

    if (pointerPosition == null) return;

    // Map zooming
    let oldScale = stage.scaleX();

    var mousePointTo = {
      x: pointerPosition.x / oldScale - stage.x() / oldScale,
      y: pointerPosition.y / oldScale - stage.y() / oldScale,
    };

    var newScale = e.evt.deltaY < 0 ? oldScale * mapOptions.zoomDelta : oldScale / mapOptions.zoomDelta;
    stage.scale({ x: newScale, y: newScale });

    var newPos = {
      x: -(mousePointTo.x - pointerPosition.x / newScale) * newScale,
      y: -(mousePointTo.y - pointerPosition.y / newScale) * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
  });

  stage.on("mousedown", (e) => {
    // Map dragging
    if (e.evt.button === 1) {
      stage.draggable(true);
    } else {
      stage.draggable(false);
    }
  });
}

/**
 * Calculates stage width and height
 */
function resizeStage() {
  if (containerParent) {
    // now we need to fit stage into parent
    var containerWidth = containerParent.offsetWidth;
    // to do this we need to scale the stage
    var scale = containerWidth / mapOptions.width;

    stage.width(mapOptions.width * scale);
    stage.height(mapOptions.height * scale);
    stage.draw();
  }
}

/**
 * Draw grid lines to Konva layer
 *
 * @param {number} rows -Number of rows
 * @param {number} cols -Number of cols
 * @param {{x: number, y: number}} cellSize -X and Y sizes for grid cells
 * @param {*} layer -Konva layer object
 */
function drawGrid(rows, cols, cellSize, layer) {
  for (let i = 0; i <= rows; i++) {
    let positions = {
      startX: 0,
      startY: i * cellSize.y,
      endX: rows * cellSize.x,
      endY: i * cellSize.y,
    };
    layer.add(
      // @ts-ignore
      new Konva.Line({
        points: [positions.startX, positions.startY, positions.endX, positions.endY],
        stroke: "black",
        strokeWidth: 4,
        lineCap: "round",
        lineJoin: "round",
      })
    );
  }

  for (let i = 0; i <= cols; i++) {
    let positions = {
      startX: i * cellSize.x,
      startY: 0,
      endX: i * cellSize.x,
      endY: cols * cellSize.y,
    };
    layer.add(
      // @ts-ignore
      new Konva.Line({
        points: [positions.startX, positions.startY, positions.endX, positions.endY],
        stroke: "black",
        strokeWidth: 4,
        lineCap: "round",
        lineJoin: "round",
      })
    );
  }

  layer.draw();
}

/**
 * Add drag and drop events to screenshot images and map tools
 */
function addDragEvents() {
  let mapToolsContainer = document.getElementById("map-tools-container");
  let mapText = document.getElementById("map-text");
  let mapArrow = document.getElementById("map-arrow");
  let mapScreenshotList = document.getElementById("map-screenshot-list");

  // Map icons
  if (mapToolsContainer) {
    mapToolsContainer.querySelectorAll(".map-icon").forEach((element) => {
      element.addEventListener("dragstart", (e) => {
        dragArgs = {
          itemType: "icon",
          // @ts-ignore
          itemURL: e.target.getAttribute("src")?.toString() ?? "",
        };
      });
    });
  } else {
    console.error("Map tools container was not found");
  }

  // Text
  if (mapText) {
    mapText.addEventListener("dragstart", () => {
      dragArgs = {
        itemType: "text",
        itemURL: "",
      };
    });
  } else {
    console.error("Map text was not found");
  }

  // Arrow
  if (mapArrow) {
    mapArrow.addEventListener("dragstart", () => {
      dragArgs = {
        itemType: "arrow",
        itemURL: "",
      };
    });
  } else {
    console.error("Map arrow was not found");
  }

  // Add image drag and drop to screenshot list
  if (mapScreenshotList) {
    mapScreenshotList.addEventListener("dragstart", (e) => {
      dragArgs = {
        itemType: "image",
        // @ts-ignore
        itemURL: e.target.getAttribute("src")?.toString() ?? "",
      };
    });
  } else {
    console.error("Map screenshot list was not found");
  }
}

/**
 * Add drop events to map canvas
 */
function addDropEvents() {
  let stageContainer = stage.container(); // Konva canvas container

  stageContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  stageContainer.addEventListener("drop", async (e) => {
    e.preventDefault();
    stage.setPointersPositions(e);

    if (dragArgs) {
      switch (dragArgs.itemType) {
        case "image":
          await addImage(alignPositionToGrid(getRelativePointerPosition(mapLayer), mapOptions.cellSize), dragArgs.itemURL, mapLayer);
          onUpdateMap();
          break;
        case "icon":
          const iconPosition = getRelativePointerPosition(markerLayer);
          const iconOffset = 35;
          await addIcon(dragArgs.itemURL, { x: iconPosition.x - iconOffset, y: iconPosition.y - iconOffset }, markerLayer);
          onUpdateMapMarkers();
          break;
        case "text":
          const textInput = document.getElementById("map-text-input");
          // @ts-ignore
          const text = textInput?.value ?? "";
          // @ts-ignore
          textInput.value = "";
          addText(text, getRelativePointerPosition(markerLayer), markerLayer);
          onUpdateMapMarkers();
          break;
        case "arrow":
          const arrowPosition = getRelativePointerPosition(markerLayer);
          const endPointOffset = 200;
          const points = [arrowPosition.x - endPointOffset, arrowPosition.y, arrowPosition.x + endPointOffset, arrowPosition.y];
          addArrow(points, markerLayer);
          onUpdateMapMarkers();
          break;
      }

      dragArgs = {
        itemType: "",
        itemURL: "",
      };
    }
  });
}

/**
 * @param {{x: number, y:number}} position
 * @param {string} imageUrl
 * @param {*} layer - Image layer
 */
async function addImage(position, imageUrl, layer) {
  // @ts-ignore
  var exits = await window.electronAPI.path.exists(imageUrl);

  if (exits) {
    await addMapImageToLayer(imageUrl, position, mapOptions.cellSize, layer, (image) => {
      addEventsToMapImage(image, layer, mapOptions.cellSize, stage, () => {
        onUpdateMap();
      });
    });
  } else console.error("Image was not found: " + imageUrl);
}

/**
 * @param {{x: number;y: number;}} position
 * @param {string} iconUrl
 * @param {*} layer - Icon layer
 */
async function addIcon(iconUrl, position, layer) {
  await addMarkerToLayer(iconUrl, position, layer, (image) => {
    addEventsToMapMarker(image, layer, stage, () => {
      onUpdateMapMarkers();
    });
  });
}

/**
 * @param {string} text
 * @param {{x: number, y:number}} position
 * @param {*} layer - Text layer
 */
function addText(text, position, layer) {
  if (text) {
    addTextToLayer(text.toString(), position, layer, (textNode) => {
      addEventsToMapText(textNode, layer, stage, () => {
        onUpdateMapMarkers();
      });
    });
  }
}

/**
 * @param {number[]} points
 * @param {*} layer - Arrow layer
 */
function addArrow(points, layer) {
  addArrowToLayer(points, layer, (objects) => {
    addEventsToMapArrow(objects, layer, stage, () => {
      onUpdateMapMarkers();
    });
  });
}

/**
 * Add image to Konva Layer
 *
 * @param {string} imagePath -Path to the image
 * @param {{x: number, y: number}} position -Images position in canvas
 * @param {{x: number, y: number}} cellSize -X and Y sizes for grid cells
 * @param {*} layer -Konva layer object
 * @param {Function} callback -Optional, Returns the image object that was created.
 */
async function addMapImageToLayer(imagePath, position, cellSize, layer, callback) {
  let newImg = new Image();
  newImg.src = imagePath;

  // @ts-ignore
  var id = await window.electronAPI.path.getFileName(imagePath);

  // @ts-ignore
  var image = new Konva.Image({
    image: newImg,
    x: position.x,
    y: position.y,
    width: cellSize.x,
    height: cellSize.y,
    draggable: false,
    imageId: id,
  });

  layer.add(image);
  layer.draw();

  callback && callback(image);
}

/**
 * Add events to map image
 *
 * @param {*} image -The image the events will be added to
 * @param {*} layer -Konva layer the image is in
 * @param {{x: number, y:number}} cellSize -Map grid size
 * @param {*} stage -Konva stage the layer is in
 * @param {Function} onChange -Callback for image deletion
 */
function addEventsToMapImage(image, layer, cellSize, stage, onChange) {
  image.on("dragend", function () {
    let mousePos = alignPositionToGrid(getRelativePointerPosition(layer), cellSize);

    image.position({
      x: mousePos.x,
      y: mousePos.y,
    });
    layer.batchDraw();

    onChange && onChange();
  });
  image.on("dragstart", (e) => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      image.stopDrag();
    }
  });
  image.on("mousedown", (e) => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      image.draggable(true);
    } else {
      image.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // @ts-ignore
      window.electronAPI.dialog
        .confirm({
          message: "Delete map image?",
          buttons: ["Yes", "No"],
          type: "question",
        })
        .then((res) => {
          if (res.response === 0) {
            image.destroy();
            layer.draw();

            onChange && onChange();
          }
        });
    }
  });
  image.on("mouseenter", function () {
    stage.container().style.cursor = "move";
  });
  image.on("mouseleave", function () {
    stage.container().style.cursor = "default";
  });
}

/**
 * Add marker icon to Konva Layer
 *
 * @param {string} imagePath -Path to the image
 * @param {{x: number, y: number}} position - Icon's position in canvas
 * @param {*} layer -Konva layer object
 * @param {Function} callback -Optional, returns the image object that was created.
 */
async function addMarkerToLayer(imagePath, position, layer, callback) {
  let newImg = new Image();
  newImg.src = imagePath;

  // @ts-ignore
  var id = await window.electronAPI.path.getFileName(imagePath);

  // @ts-ignore
  var image = new Konva.Image({
    image: newImg,
    x: position.x,
    y: position.y,
    width: 70,
    height: 70,
    draggable: false,
    imageId: id,
    opacity: 0.8,
  });

  layer.add(image);
  layer.draw();
  callback && callback(image);
}

/**
 * Add events to map marker
 *
 * @param {*} image -The image the events will be added to
 * @param {*} layer -Konva layer the image is in
 * @param {*} stage -Konva stage the layer is in
 * @param {Function} onChange -Callback for image deletion
 */
function addEventsToMapMarker(image, layer, stage, onChange) {
  image.on("dragend", () => {
    layer.batchDraw();

    onChange && onChange();
  });
  image.on("dragstart", (e) => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      image.stopDrag();
    }
  });
  image.on("mousedown", (e) => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      image.draggable(true);
    } else {
      image.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete image
      // @ts-ignore
      window.electronAPI.dialog
        .confirm({
          message: "Delete marker?",
          buttons: ["Yes", "No"],
          type: "question",
        })
        .then((res) => {
          if (res.response === 0) {
            image.destroy();
            layer.draw();

            onChange && onChange();
          }
        });
    }
  });
  image.on("mouseenter", () => {
    stage.container().style.cursor = "move";
  });
  image.on("mouseleave", () => {
    stage.container().style.cursor = "default";
  });
}

/**
 * Add text to Konva Layer
 *
 * @param {string} text -Text that will be added to layer
 * @param {{x: number, y: number}} position -Images position in canvas
 * @param {*} layer -Konva layer object
 * @param {Function} callback -Optional, returns the text object that was created.
 */
function addTextToLayer(text, position, layer, callback) {
  // Don't add the text if it is empty
  if (!text) return;

  // @ts-ignore
  var textNode = new Konva.Text({
    text: text,
    x: position.x,
    y: position.y,
    fontSize: 50,
    draggable: false,
    width: 400,
    fill: "white",
    stroke: "black",
    strokeWidth: 3,
    fontStyle: "bold",
  });

  layer.add(textNode);
  layer.batchDraw();

  callback && callback(textNode);
}

/**
 * Add events to map text
 *
 * @param {*} textNode -The text the events will be added to
 * @param {*} layer -Konva layer the image is in
 * @param {*} stage -Konva stage the layer is in
 * @param {Function} onChange -Callback for image deletion
 */
function addEventsToMapText(textNode, layer, stage, onChange) {
  textNode.on("dragend", () => {
    layer.batchDraw();

    onChange && onChange();
  });
  textNode.on("dragstart", (e) => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      textNode.stopDrag();
    }
  });
  textNode.on("mousedown", (e) => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      textNode.draggable(true);
    } else {
      textNode.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete text
      // @ts-ignore
      window.electronAPI.dialog
        .confirm({
          message: "Delete text?",
          buttons: ["Yes", "No"],
          type: "question",
        })
        .then((res) => {
          if (res.response === 0) {
            textNode.destroy();
            layer.draw();

            onChange && onChange();
          }
        });
    }
  });
  textNode.on("mouseenter", () => {
    stage.container().style.cursor = "move";
  });
  textNode.on("mouseleave", () => {
    stage.container().style.cursor = "default";
  });
}

/**
 * Add arrow object to Konva layer
 *
 * @param {number[]} points - Arrow's starting and ending positions, [x1,y1,x2,y2]
 * @param {*} layer - The Konva layer
 * @param {function} callback - Optional, callback function that takes arrow object list as a parameter
 */
function addArrowToLayer(points, layer, callback) {
  // @ts-ignore
  const arrow = new Konva.Arrow({
    type: "Arrow",
    points: points,
    fill: "black",
    stroke: "black",
    strokeWidth: 10,
    pointerAtBeginning: true,
    pointerLength: 40,
    pointerWidth: 40,
    draggable: false,
  });

  // Arrow's border
  // @ts-ignore
  const arrowStroke = new Konva.Arrow({
    type: "Stroke",
    points: points,
    fill: "white",
    stroke: "white",
    strokeWidth: 5,
    pointerAtBeginning: true,
    pointerLength: 40,
    pointerWidth: 40,
    draggable: false,
  });

  // @ts-ignore
  const startCircle = new Konva.Circle({
    x: points[0],
    y: points[1],
    radius: 30,
    opacity: 0.1,
    fill: "white",
    stroke: "black",
    strokeWidth: 4,
    draggable: false,
  });

  // @ts-ignore
  const endCircle = new Konva.Circle({
    x: points[2],
    y: points[3],
    radius: 30,
    fill: "white",
    opacity: 0.1,
    stroke: "black",
    strokeWidth: 4,
    draggable: false,
  });

  layer.add(arrow);
  layer.add(startCircle);
  layer.add(endCircle);
  layer.add(arrowStroke);

  // Connector circles will be over the arrow, so they need to be moved
  let connectorPos = getArrowConnectorPoints(startCircle, endCircle, -50);
  startCircle.x(connectorPos[0]);
  startCircle.y(connectorPos[1]);
  endCircle.x(connectorPos[2]);
  endCircle.y(connectorPos[3]);

  updateArrowPosition(arrow, arrowStroke, startCircle, endCircle);
  layer.batchDraw();

  callback &&
    callback({
      arrow: arrow,
      arrowStroke: arrowStroke,
      startCircle: startCircle,
      endCircle: endCircle,
    });
}

/**
 * @param {*} from
 * @param {*} to
 * @param {*} radius
 * @returns
 */
function getArrowConnectorPoints(from, to, radius) {
  const dx = to.x() - from.x();
  const dy = to.y() - from.y();
  let angle = Math.atan2(-dy, dx);

  return [from.x() + -radius * Math.cos(angle + Math.PI), from.y() + radius * Math.sin(angle + Math.PI), to.x() + -radius * Math.cos(angle), to.y() + radius * Math.sin(angle)];
}

/**
 * @param {*} arrow
 * @param {*} stroke
 * @param {*} start
 * @param {*} end
 */
function updateArrowPosition(arrow, stroke, start, end) {
  var points = getArrowConnectorPoints(start, end, 50);
  arrow.points(points);
  stroke.points(points);
}

/**
 * Add map events to map arrow
 *
 * @param {{arrow : *, arrowStroke : *, startCircle : *, endCircle : *}} arrowObjects - Arrow objects
 * @param {*} layer - Arrow's Konva layer
 * @param {*} stage - Konva stage
 * @param {function} onChange - Function that will be called when the arrow changes
 */
function addEventsToMapArrow(arrowObjects, layer, stage, onChange) {
  arrowObjects.startCircle.on("dragend", () => {
    updateArrowPosition(arrowObjects.arrow, arrowObjects.arrowStroke, arrowObjects.startCircle, arrowObjects.endCircle);
    layer.batchDraw();

    onChange && onChange();
  });
  arrowObjects.startCircle.on("dragmove", () => {
    updateArrowPosition(arrowObjects.arrow, arrowObjects.arrowStroke, arrowObjects.startCircle, arrowObjects.endCircle);
    layer.batchDraw();
  });
  arrowObjects.startCircle.on("dragstart", (e) => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      arrowObjects.startCircle.stopDrag();
    }
  });
  arrowObjects.startCircle.on("mousedown", (e) => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      arrowObjects.startCircle.draggable(true);
    } else {
      arrowObjects.startCircle.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete arrow
      // @ts-ignore
      window.electronAPI.dialog
        .confirm({
          message: "Delete arrow?",
          buttons: ["Yes", "No"],
          type: "question",
        })
        .then((res) => {
          if (res.response === 0) {
            arrowObjects.arrow.destroy();
            arrowObjects.arrowStroke.destroy();
            arrowObjects.startCircle.destroy();
            arrowObjects.endCircle.destroy();
            layer.batchDraw();

            onChange && onChange();
          }
        });
    }
  });
  arrowObjects.endCircle.on("dragend", () => {
    updateArrowPosition(arrowObjects.arrow, arrowObjects.arrowStroke, arrowObjects.startCircle, arrowObjects.endCircle);
    layer.batchDraw();

    onChange && onChange();
  });
  arrowObjects.endCircle.on("dragmove", () => {
    updateArrowPosition(arrowObjects.arrow, arrowObjects.arrowStroke, arrowObjects.startCircle, arrowObjects.endCircle);
    layer.batchDraw();
  });
  arrowObjects.endCircle.on("dragstart", (e) => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      arrowObjects.endCircle.stopDrag();
    }
  });
  arrowObjects.endCircle.on("mousedown", (e) => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      arrowObjects.endCircle.draggable(true);
    } else {
      arrowObjects.endCircle.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete arrow
      // @ts-ignore
      window.electronAPI.dialog
        .confirm({
          message: "Delete arrow?",
          buttons: ["Yes", "No"],
          type: "question",
        })
        .then((res) => {
          if (res.response === 0) {
            arrowObjects.arrow.destroy();
            arrowObjects.arrowStroke.destroy();
            arrowObjects.startCircle.destroy();
            arrowObjects.endCircle.destroy();
            layer.batchDraw();

            onChange && onChange();
          }
        });
    }
  });
  arrowObjects.arrow.on("mousedown", (e) => {
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete arrow
      // @ts-ignore
      window.electronAPI.dialog
        .confirm({
          message: "Delete arrow?",
          buttons: ["Yes", "No"],
          type: "question",
        })
        .then((res) => {
          if (res.response === 0) {
            arrowObjects.arrow.destroy();
            arrowObjects.arrowStroke.destroy();
            arrowObjects.startCircle.destroy();
            arrowObjects.endCircle.destroy();
            layer.batchDraw();

            onChange && onChange();
          }
        });
    }
  });
  arrowObjects.startCircle.on("mouseenter", function () {
    stage.container().style.cursor = "move";
  });
  arrowObjects.startCircle.on("mouseleave", function () {
    stage.container().style.cursor = "default";
  });
  arrowObjects.endCircle.on("mouseenter", function () {
    stage.container().style.cursor = "move";
  });
  arrowObjects.endCircle.on("mouseleave", function () {
    stage.container().style.cursor = "default";
  });
}

/**
 * Align given position to grid
 *
 * @param {{x: number, y: number}} position - Position on canvas
 * @param {{x: number, y: number}} cellSize - Grid's cell size
 *
 * @returns {{x: number, y: number}}
 */
function alignPositionToGrid(position, cellSize) {
  return {
    x: position.x > 0 ? Math.trunc(position.x / cellSize.x) * cellSize.x : Math.trunc(Math.floor(position.x / cellSize.x)) * cellSize.x,
    y: position.y > 0 ? Math.trunc(position.y / cellSize.y) * cellSize.y : Math.trunc(Math.floor(position.y / cellSize.y)) * cellSize.y,
  };
}

/**
 * Get pointer positions that is relative to given node
 *
 * @param {*} node -Konva object
 */
function getRelativePointerPosition(node) {
  var transform = node.getAbsoluteTransform().copy();
  // to detect relative position we need to invert transform
  transform.invert();

  // get pointer (say mouse or touch) position
  var pos = node.getStage().getPointerPosition();

  return transform.point(pos);
}

/**
 * Load map images to stage
 * @param {any} mapJson
 * @param {any} markerJson
 */
async function changeMap(mapJson, markerJson) {
  // @ts-ignore
  var newMapLayer = new Konva.Layer();
  // @ts-ignore
  var newMarkerlayer = new Konva.Layer();

  if (mapJson) {
    // @ts-ignore
    let mapImageFolderPath = await window.electronAPI.path.mapScreenshotFolder();

    mapJson.children?.forEach((child) => {
      addImage({ x: child.attrs.x, y: child.attrs.y }, mapImageFolderPath + child.attrs.imageId + ".png", newMapLayer);
    });

    if (markerJson) {
      // @ts-ignore
      let mapIconFolderPath = await window.electronAPI.path.mapIconFolder();

      markerJson?.children?.forEach(async (child) => {
        switch (child.className) {
          case "Image":
            await addIcon(mapIconFolderPath + child.attrs.imageId + ".svg", { x: child.attrs.x, y: child.attrs.y }, newMarkerlayer);
            break;
          case "Text":
            addText(child.attrs.text, { x: child.attrs.x, y: child.attrs.y }, newMarkerlayer);
            break;
          case "Arrow":
            if (child.attrs.type === "Arrow") {
              const points = [child.attrs.points[0], child.attrs.points[1], child.attrs.points[2], child.attrs.points[3]];
              addArrow(points, newMarkerlayer);
            }
            break;
        }
      });
    }
  } else {
    console.error("map is null");
  }

  // Change the old layers to new layers
  mapLayer.destroy();
  markerLayer.destroy();

  mapLayer = newMapLayer;
  markerLayer = newMarkerlayer;

  // Add the new layer to stage
  stage.add(newMapLayer);
  stage.add(newMarkerlayer);

  // Move the new mapLayer under icon layer
  mapLayer.moveDown();
  markerLayer.moveToTop();
  gridLayer.moveToBottom();
}

/**
 * Dispatches marker changed event
 */
function onUpdateMapMarkers() {
  markerChangeEvent.detail.data = {
    json: markerLayer.toJSON(),
  };
  document.dispatchEvent(markerChangeEvent);
}

/**
 * Dispatches map changed event
 */
function onUpdateMap() {
  mapChangeEvent.detail.data = {
    json: mapLayer.toJSON(),
  };
  document.dispatchEvent(mapChangeEvent);
}

export { init, changeMap, mapChangeEvent, markerChangeEvent };
