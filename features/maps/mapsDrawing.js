/**
 * Get Konva Layer with map images from JSON file
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
  try {
    JSON.parse(fs.readFileSync(JSONPath, "utf8")).children.forEach((child) => {
      addMapImageToLayer(settings.mapImageFolderPath + child.attrs.imageId + ".png", { x: child.attrs.x, y: child.attrs.y }, settings.cellSize, newLayer, (image) => {
        addEventsToMapImage(image, newLayer, settings.cellSize, stage, () => {
          imageOnChange();
        });
      });
    });
  } catch (error) {}

  return newLayer;
}

/**
 * Get Konva Layer with map markers from JSON file
 *
 * @param {string} JSONPath -Path to map's marker JSON file
 * @param {*} stage -Konva stage
 * @param {string} mapMarkerIconFolderPath -Settings for the map
 * @param {Function} onChange - Callback function that will be called when something changes on map
 *
 * @returns {*} Konva Layer
 */
function loadMapMarkerLayerFromJSON(JSONPath, stage, mapMarkerIconFolderPath, onChange) {
  let newLayer = new Konva.Layer();
  try {
    JSON.parse(fs.readFileSync(JSONPath, "utf8")).children.forEach((child) => {
      if (child.className === "Image") {
        addMarkerToLayer(mapMarkerIconFolderPath + child.attrs.imageId + ".svg", { x: child.attrs.x, y: child.attrs.y }, newLayer, (image) => {
          addEventsToMapMarker(image, newLayer, stage, () => {
            onChange();
          });
        });
      } else if (child.className === "Text") {
        addTextToLayer(child.attrs.text, { x: child.attrs.x, y: child.attrs.y }, newLayer, (textNode) => {
          addEventsToMapText(textNode, newLayer, stage, () => {
            onChange();
          });
        });
      } else if (child.className === "Arrow" && child.attrs.type === "Arrow") {
        const points = [child.attrs.points[0], child.attrs.points[1], child.attrs.points[2], child.attrs.points[3]];
        addArrowToLayer(points, newLayer, (objects) => {
          // Events
          addEventsToMapArrow(objects, newLayer, stage, () => {
            onChange();
          });
        });
      }
    });
  } catch (error) {}

  return newLayer;
}

module.exports = {
  loadMapLayerFromJSON,
  loadMapMarkerLayerFromJSON,
};
