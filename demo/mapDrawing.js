/*
 * Functions to draw images, texts etc. to Konva canvas.
 */

// Drawing functions -------------------------------------------

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

function getFilename (path) {
  return path.split('/').pop().replace('.png', '');
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
function addMapImageToLayer(imagePath, position, cellSize, layer, callback) {
  let imageId = getFilename(imagePath);
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

/**
 * Add marker icon to Konva Layer
 *
 * @param {string} imagePath -Path to the image
 * @param {{x: number, y: number}} position - Icon's position in canvas
 * @param {*} layer -Konva layer object
 * @param {Function} callback -Optional, returns the image object that was created.
 */
function addMarkerToLayer(imagePath, position, layer, callback) {
  let imageId = getFilename(imagePath);
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
  if (text === "") {
    return;
  }

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
    fontStyle: "bold"
  });

  layer.add(textNode);
  layer.batchDraw();

  if (callback && callback(textNode));
}

/**
 * Add line to Konva layer
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

/**
 * Add arrow object to Konva layer
 *
 * @param {number[]} points - Arrow's starting and ending positions, [x1,y1,x2,y2]
 * @param {*} layer - The Konva layer
 * @param {function} callback - Optional, callback function that takes arrow object list as a parameter
 */
function addArrowToLayer(points, layer, callback) {
  const arrow = new Konva.Arrow({
    type: "Arrow",
    points: points,
    fill: "black",
    stroke: "black",
    strokeWidth: 10,
    pointerAtBeginning: true,
    pointerLength: 40,
    pointerWidth: 40,
    draggable: false
  });

  // Arrow's border
  const arrowStroke = new Konva.Arrow({
    type: "Stroke",
    points: points,
    fill: "white",
    stroke: "white",
    strokeWidth: 5,
    pointerAtBeginning: true,
    pointerLength: 40,
    pointerWidth: 40,
    draggable: false
  });

  const startCircle = new Konva.Circle({
    x: points[0],
    y: points[1],
    radius: 30,
    opacity: 0.1,
    fill: "white",
    stroke: "black",
    strokeWidth: 4,
    draggable: false
  });

  const endCircle = new Konva.Circle({
    x: points[2],
    y: points[3],
    radius: 30,
    fill: "white",
    opacity: 0.1,
    stroke: "black",
    strokeWidth: 4,
    draggable: false
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

  if (callback) {
    objects = {
      arrow: arrow,
      arrowStroke: arrowStroke,
      startCircle: startCircle,
      endCircle: endCircle
    };

    callback(objects);
  }
}

// Event functions ------------------------------------------------

/**
 * Add events to map image
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

/**
 * Add events to map marker
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

/**
 * Add events to map text
 *
 * @param {*} textNode -The text the events will be added to
 * @param {*} layer -Konva layer the image is in
 * @param {*} stage -Konva stage the layer is in
 * @param {Function} onChange -Callback for image deletion
 */
function addEventsToMapText(textNode, layer, stage, onChange) {
  textNode.on("dragend", function() {
    layer.batchDraw();
    if (onChange && onChange());
  });
  textNode.on("dragstart", e => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      textNode.stopDrag();
    }
  });
  textNode.on("mousedown", e => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      textNode.draggable(true);
    } else {
      textNode.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete text
      if (window.confirm("Delete text?")) {
        textNode.destroy();
        layer.draw();

        if (onChange && onChange());
      }
    }
  });
  textNode.on("mouseenter", function() {
    stage.container().style.cursor = "move";
  });
  textNode.on("mouseleave", function() {
    stage.container().style.cursor = "default";
  });
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
    updateArrowPosition(
      arrowObjects.arrow,
      arrowObjects.arrowStroke,
      arrowObjects.startCircle,
      arrowObjects.endCircle
    );
    layer.batchDraw();
    if (onChange && onChange());
  });
  arrowObjects.startCircle.on("dragmove", () => {
    updateArrowPosition(
      arrowObjects.arrow,
      arrowObjects.arrowStroke,
      arrowObjects.startCircle,
      arrowObjects.endCircle
    );
    layer.batchDraw();
  });
  arrowObjects.startCircle.on("dragstart", e => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      arrowObjects.startCircle.stopDrag();
    }
  });
  arrowObjects.startCircle.on("mousedown", e => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      arrowObjects.startCircle.draggable(true);
    } else {
      arrowObjects.startCircle.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete arrow
      if (window.confirm("Delete arrow?")) {
        arrowObjects.arrow.destroy();
        arrowObjects.arrowStroke.destroy();
        arrowObjects.startCircle.destroy();
        arrowObjects.endCircle.destroy();
        layer.batchDraw();

        if (onChange && onChange());
      }
    }
  });
  arrowObjects.endCircle.on("dragend", () => {
    updateArrowPosition(
      arrowObjects.arrow,
      arrowObjects.arrowStroke,
      arrowObjects.startCircle,
      arrowObjects.endCircle
    );
    layer.batchDraw();
    if (onChange && onChange());
  });
  arrowObjects.endCircle.on("dragmove", () => {
    updateArrowPosition(
      arrowObjects.arrow,
      arrowObjects.arrowStroke,
      arrowObjects.startCircle,
      arrowObjects.endCircle
    );
    layer.batchDraw();
  });
  arrowObjects.endCircle.on("dragstart", e => {
    // 4: middle mouse button
    if (e.evt.buttons === 4) {
      arrowObjects.endCircle.stopDrag();
    }
  });
  arrowObjects.endCircle.on("mousedown", e => {
    // 0: left mouse button
    if (e.evt.button === 0) {
      arrowObjects.endCircle.draggable(true);
    } else {
      arrowObjects.endCircle.draggable(false);
    }
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete arrow
      if (window.confirm("Delete arrow?")) {
        arrowObjects.arrow.destroy();
        arrowObjects.arrowStroke.destroy();
        arrowObjects.startCircle.destroy();
        arrowObjects.endCircle.destroy();
        layer.batchDraw();

        if (onChange && onChange());
      }
    }
  });
  arrowObjects.arrow.on("mousedown", e => {
    // 2: right mouse button
    if (e.evt.button === 2) {
      // Delete arrow
      if (window.confirm("Delete arrow?")) {
        arrowObjects.arrow.destroy();
        arrowObjects.arrowStroke.destroy();
        arrowObjects.startCircle.destroy();
        arrowObjects.endCircle.destroy();
        layer.batchDraw();

        if (onChange && onChange());
      }
    }
  });
  arrowObjects.startCircle.on("mouseenter", function() {
    stage.container().style.cursor = "move";
  });
  arrowObjects.startCircle.on("mouseleave", function() {
    stage.container().style.cursor = "default";
  });
  arrowObjects.endCircle.on("mouseenter", function() {
    stage.container().style.cursor = "move";
  });
  arrowObjects.endCircle.on("mouseleave", function() {
    stage.container().style.cursor = "default";
  });
}

// Other functions -------------------------------------------------------

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
 * Align given position to grid
 *
 * @param {{x: number, y: number}} position - Position on canvas
 * @param {{x: number, y: number}} cellSize - Grid's cell size
 *
 * @returns {{x: number, y: number}}
 */
function alignPositionToGrid(position, cellSize) {
  let x = parseInt(position.x / cellSize.x) * cellSize.x;
  let y = parseInt(position.y / cellSize.y) * cellSize.y;

  return { x: x, y: y };
}

/**
 * Make the Konva canvas responsive
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

/**
 * Update arrow's position
 *
 * @param {*} arrow - Konva arrow object
 * @param {*} stroke - Konva arrow object that is used as a border for the arrow
 * @param {*} start - Konva object used as a starting point for the arrow
 * @param {*} end - Konva object used as a ending point for the arrow
 */
function updateArrowPosition(arrow, stroke, start, end) {
  var points = getArrowConnectorPoints(start, end, 50);
  arrow.points(points);
  stroke.points(points);
}

/**
 * Get point positions for arrow
 *
 * @param {*} from - Konva object
 * @param {*} to - Konva object
 */
function getArrowConnectorPoints(from, to, radius) {
  const dx = to.x() - from.x();
  const dy = to.y() - from.y();
  let angle = Math.atan2(-dy, dx);

  return [
    from.x() + -radius * Math.cos(angle + Math.PI),
    from.y() + radius * Math.sin(angle + Math.PI),
    to.x() + -radius * Math.cos(angle),
    to.y() + radius * Math.sin(angle)
  ];
}
