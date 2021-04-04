const containerParent = document.getElementById("stage-parent");
const mapScreenshotFolder = "screenshots/map/"; // Path to map screenshots
const mapWidth = 704;
const mapHeight = 704;
const mapZoomDelta = 1.1; // Map zooming speed
const cellSize = { x: 790, y: 425 }; // Map grid's cell size

let selectedMap = ""; // Name of the currently selected map
const stage = new Konva.Stage({
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
let dragItemType = ""; // Type of the item that is being dragged
let dragItemURL = ""; // Path to image that is being dragged

window.addEventListener("load", () =>{
  fitStageIntoParentContainer(
    containerParent,
    {
      width: mapWidth,
      height: mapHeight
    },
    stage
    );
});

$(document).ready(function() {
  // Activate tooltips
  $('[data-toggle="tooltip"]').tooltip();

  // Init the map canvas
  stage.add(mapLayer);
  stage.add(markerLayer);
  stage.add(gridLayer);
  drawGrid(7, 7, cellSize, gridLayer);
  gridLayer.moveToBottom();

  // Init drag and drop for screenshots and map tools
  addDragEvents();
  addDropEvents();
});

$(window).on("resize", () => {
  // Adapt the stage on any window resize
  fitStageIntoParentContainer(
    containerParent,
    {
      width: mapWidth,
      height: mapHeight
    },
    stage
  );
});

function addDragEvents() {
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
  document
    .getElementById("map-text")
    .addEventListener("dragstart", function(e) {
      dragItemType = "text";
      dragItemURL = "";
    });

  document
    .getElementById("map-arrow")
    .addEventListener("dragstart", function(e) {
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
}
function addDropEvents() {
  let stageContainer = stage.container(); // Konva canvas container

  stageContainer.addEventListener("dragover", function(e) {
    e.preventDefault();
  });
  stageContainer.addEventListener("drop", function(e) {
    e.preventDefault();
    stage.setPointersPositions(e);
    if (dragItemType === "image") {
      let position = alignPositionToGrid(
        getRelativePointerPosition(mapLayer),
        cellSize
      );
      addMapImageToLayer(
        dragItemURL,
        { x: position.x, y: position.y },
        cellSize,
        mapLayer,
        image => {
          addEventsToMapImage(
            image,
            mapLayer,
            cellSize,
            stage,
            () => {
              //saveMap(selectedMap);
            }
          );
          //saveMap(selectedMap);
        }
      );
    } else if (dragItemType === "icon") {
      let position = getRelativePointerPosition(markerLayer);
      addMarkerToLayer(
        dragItemURL,
        { x: position.x - 35, y: position.y - 35 },
        markerLayer,
        image => {
          addEventsToMapMarker(image, markerLayer, stage, () => {
            //saveMapMarkers(selectedMap);
          });
          //saveMapMarkers(selectedMap);
        }
      );
    } else if (dragItemType === "text") {
      let position = getRelativePointerPosition(markerLayer);
      // add text to layer
      var textInput = $("#map-text-input");
      var text = textInput.val();
      if (text !== "" && text !== null) {
        addTextToLayer(text, position, markerLayer, textNode => {
          // Events
          addEventsToMapText(textNode, markerLayer, stage, () => {
            //saveMapMarkers(selectedMap);
          });
          //saveMapMarkers(selectedMap);
        });
      }
      textInput.val("");
    } else if (dragItemType === "arrow") {
      let position = getRelativePointerPosition(markerLayer);
      //add arrow to layer
      let endPointOffset = 200;
      let points = [
        position.x - endPointOffset,
        position.y,
        position.x + endPointOffset,
        position.y
      ];
      addArrowToLayer(points, markerLayer, objects => {
        addEventsToMapArrow(objects, markerLayer, stage, () => {
          //saveMapMarkers(selectedMap);
        });
        //saveMapMarkers(selectedMap);
      });
    }
    dragItemType = "";
  });
}

stage.on("wheel", e => {
  e.evt.preventDefault();
  // Map zooming
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
  // Map dragging
  if (e.evt.button === 1) {
    stage.draggable(true);
  } else {
    stage.draggable(false);
  }
});