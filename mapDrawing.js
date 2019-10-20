const Konva = require("konva");
const path = require("path");
const fs = require("fs");

/** Draws grid lines to layer
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
      endY: i * cellSize.y
    };
    addLineToLayer(positions, layer);
  }
  for (let i = 0; i <= cols; i++) {
    let positions = {
      startX: i * cellSize.x,
      startY: 0,
      endX: i * cellSize.x,
      endY: cols * cellSize.y
    };
    addLineToLayer(positions, layer);
  }

  layer.draw();
}

/** Adds image to Konva Layer
 *
 * @param {string} imagePath -Path to the image
 * @param {{x: number, y: number}} position -Images position in canvas
 * @param {{x: number, y: number}} cellSize -X and Y sizes for grid cells
 * @param {*} layer -Konva layer object
 * @param {Function} callback -Optional, Returns the image object that was created.
 */
function addMapImageToLayer(imagePath, position, cellSize, layer, callback) {
  let imageId = path.parse(imagePath).name;
  let newImg = new Image();
  newImg.src = imagePath;

  newImg.onload = function() {
    var image = new Konva.Image({
      image: newImg,
      x: position.x,
      y: position.y,
      width: cellSize.x,
      height: cellSize.y,
      draggable: false,
      imageId: imageId
    });

    layer.add(image);
    layer.draw();

    if (callback !== undefined) {
      callback(image);
    }
  };
}

/** Adds marker image to Konva Layer
 *
 * @param {string} imagePath -Path to the image
 * @param {{x: number, y: number}} position -Images position in canvas
 * @param {*} layer -Konva layer object
 * @param {Function} callback -Optional, Returns the image object that was created.
 */
function addMarkerToLayer(imagePath, position, layer, callback) {
  let imageId = path.parse(imagePath).name;
  let newImg = new Image();
  newImg.src = imagePath;

  newImg.onload = function() {
    var image = new Konva.Image({
      image: newImg,
      x: position.x,
      y: position.y,
      width: 70,
      height: 70,
      draggable: false,
      imageId: imageId,
      opacity: 0.8
    });

    layer.add(image);
    layer.draw();

    if (callback !== undefined) {
      callback(image);
    }
  };
}

/** Adds line to Konva layer
 *
 * @param {{startX: number, startY: number, endX: number, endY: number}} positions -Point positions for the line
 * @param {*} layer -Konva layer object the line will be added.
 */
function addLineToLayer(positions, layer) {
  var line = new Konva.Line({
    points: [
      positions.startX,
      positions.startY,
      positions.endX,
      positions.endY
    ],
    stroke: "black",
    strokeWidth: 4,
    lineCap: "round",
    lineJoin: "round"
  });

  layer.add(line);
}

/** Gets pointer positions that is relative to given node
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

/** Aligns given position to grid
 *
 * @param {{x: number, y: number}} position -Position in canvas
 * @param {{x: number, y: number}} cellSize -X and Y sizes for grid cells
 *
 * @returns {{x: number, y: number}}
 */
function alignPositionToGrid(position, cellSize) {
  let x = parseInt(position.x / cellSize.x) * cellSize.x;
  let y = parseInt(position.y / cellSize.y) * cellSize.y;

  return { x: x, y: y };
}

/** Make the Konva canvas responsive
 *
 */
function fitStageIntoParentContainer(container, mapSize, stage) {
  // now we need to fit stage into parent
  var containerWidth = container.offsetWidth;
  // to do this we need to scale the stage
  var scale = containerWidth / mapSize.width;

  stage.width(mapSize.width * scale);
  stage.height(mapSize.height * scale);
  stage.draw();
}

/** Save Konva layer to json file
 *
 * @param {*} layer -Konva Layer
 * @param {string} path -Path to the json file
 */
function saveLayerToJSON(layer, path) {
  let layerJSON = layer.toJSON();

  fs.writeFile(path, layerJSON, () => {});
}

/** Returns Konva Layer with map images from JSON file
 *
 * @param {string} JSONPath -Path to map's JSON file
 * @param {*} stage -Konva stage
 * @param {{mapImageFolderPath: string, cellSize: {x: number, y: number}}} settings -Settings for the map
 * @param {Function} imageOnChange -Callback for images when the image has been moved or deleted
 *
 * @returns {*} -Konva Layer
 */
function loadMapLayerFromJSON(JSONPath, stage, settings, imageOnChange) {
  let newLayer = new Konva.Layer();
  let jsonString = fs.readFileSync(JSONPath);
  try {
    let children = JSON.parse(jsonString).children;
    children.forEach(child => {
      addMapImageToLayer(
        settings.mapImageFolderPath + child.attrs.imageId + ".png",
        { x: child.attrs.x, y: child.attrs.y },
        settings.cellSize,
        newLayer,
        image => {
          addEventsToMapImage(image, newLayer, settings.cellSize, stage, () => {
            imageOnChange();
          });
        }
      );
    });
  } catch (error) {}
  return newLayer;
}

/** Returns Konva Layer with map markers from JSON file
 *
 * @param {string} JSONPath -Path to map's marker JSON file
 * @param {*} stage -Konva stage
 * @param {mapMarkerIconFolderPath: string} mapMarkerIconFolderPath -Settings for the map
 * @param {Function} imageOnChange -Callback for images when the image has been moved or deleted
 *
 * @returns {*} -Konva Layer
 */
function loadMapMarkerLayerFromJSON(
  JSONPath,
  stage,
  mapMarkerIconFolderPath,
  imageOnChange
) {
  let newLayer = new Konva.Layer();
  try {
    let jsonString = fs.readFileSync(JSONPath);
    let children = JSON.parse(jsonString).children;
    children.forEach(child => {
      addMarkerToLayer(
        mapMarkerIconFolderPath + child.attrs.imageId + ".svg",
        { x: child.attrs.x, y: child.attrs.y },
        newLayer,
        image => {
          addEventsToMapMarker(image, newLayer, stage, () => {
            imageOnChange();
          });
        }
      );
    });
  } catch (error) {}
  return newLayer;
}

/** Adds events to map image
 *
 * @param {Image} image -The image the events will be added to
 * @param {*} layer -Konva layer the image is in
 * @param {{x: number, y:number}} cellSize -Map grid size
 * @param {*} stage -Konva stage the layer is in
 * @param {Function} onChange -Callback for image deletion
 */
function addEventsToMapImage(image, layer, cellSize, stage, onChange) {
  image.on("dragend", function() {
    let mousePos = alignPositionToGrid(
      getRelativePointerPosition(layer),
      cellSize
    );

    image.position({
      x: mousePos.x,
      y: mousePos.y
    });
    layer.batchDraw();
    if (onChange && onChange());
  });
  image.on("dragstart", e => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      image.stopDrag();
    }
  });
  image.on("mousedown", e => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      image.draggable(true);
    } else {
      image.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete image
      if (window.confirm("Delete map image?")) {
        image.destroy();
        layer.draw();

        if (onChange && onChange());
      }
    }
  });
  image.on("mouseenter", function() {
    stage.container().style.cursor = "move";
  });
  image.on("mouseleave", function() {
    stage.container().style.cursor = "default";
  });
}

/** Adds events to map marker
 *
 * @param {Image} image -The image the events will be added to
 * @param {*} layer -Konva layer the image is in
 * @param {*} stage -Konva stage the layer is in
 * @param {Function} onChange -Callback for image deletion
 */
function addEventsToMapMarker(image, layer, stage, onChange) {
  image.on("dragend", function() {
    layer.batchDraw();
    if (onChange && onChange());
  });
  image.on("dragstart", e => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      image.stopDrag();
    }
  });
  image.on("mousedown", e => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      image.draggable(true);
    } else {
      image.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete image
      if (window.confirm("Delete marker?")) {
        image.destroy();
        layer.draw();

        if (onChange && onChange());
      }
    }
  });
  image.on("mouseenter", function() {
    stage.container().style.cursor = "move";
  });
  image.on("mouseleave", function() {
    stage.container().style.cursor = "default";
  });
}

module.exports = {
  drawGrid,
  addMapImageToLayer,
  addLineToLayer,
  getRelativePointerPosition,
  alignPositionToGrid,
  fitStageIntoParentContainer,
  saveLayerToJSON,
  loadMapLayerFromJSON,
  addEventsToMapImage,
  addMarkerToLayer,
  loadMapMarkerLayerFromJSON,
  addEventsToMapMarker
};
