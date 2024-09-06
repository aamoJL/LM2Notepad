/*
 * Functions to take screenshots
 */

const { nativeImage, desktopCapturer } = require("electron");
const fs = require("fs");

/**
 * Returns array of capture sources
 * @returns {Promise<Electron.DesktopCapturerSource[]>}
 */
function getSources() {
  return new Promise((resolve, reject) => {
    desktopCapturer
      .getSources({ types: ["window"] })
      .then((sources) => {
        resolve(sources);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 * Get thumbnail of the given window and send it to callback function if the window source was found
 *
 * @param {string} sourceName -Name of the window the screenshot will be taken
 */
async function getWindowThumbnail(sourceName) {
  return new Promise((resolve, reject) => {
    desktopCapturer
      .getSources({
        types: ["window"],
        thumbnailSize: {
          width: 960,
          height: 540,
        },
      })
      .then((sources) => {
        sources.some(function (source) {
          if (source.name === sourceName) {
            resolve(source.thumbnail.toPNG());
            return;
          }
        });
        throw new Error("Source was not found");
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 * Crop given image with the given settings
 *
 * @param {Buffer} source - Image buffer
 * @param {{x: number, y: number, width: number, height: number}} cropOptions - Options for cropping
 *
 * @returns {Electron.NativeImage} NativeImage buffer
 */
function cropImage(source, cropOptions) {
  var img = nativeImage.createFromBuffer(source);
  return img.crop(cropOptions);
}

module.exports = {
  getWindowThumbnail,
  cropImage,
  getSources,
};
