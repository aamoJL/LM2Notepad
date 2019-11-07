/*
 * Functions to take screenshots
 */

const electron = require("electron");
const fs = require("fs");
const nativeImage = electron.nativeImage;
const desktopCapturer = electron.desktopCapturer;

// Screenshot settings -----------------------------------------------------

const screenshotOptions = {
  types: ["window"],
  thumbnailSize: {
    width: 960,
    height: 540
  }
};

// Functions ---------------------------------------------------------------

/**
 * Get thumbnail of the given window and send it to callback function if the window source was found
 *
 * @param {string} sourceName -Name of the window the screenshot will be taken
 * @param {function} callback -Function that will be called when the screenshot has been taken
 */
function getWindowThumbnail(sourceName, callback) {
  desktopCapturer.getSources(screenshotOptions, (error, sources) => {
    if (error) {
      return console.log(error.message);
    }

    sources.some(function(source) {
      if (source.name === sourceName) {
        callback(source.thumbnail.toPNG());
      }
    });
  });
}

/**
 * Save the given image buffer to a file.
 * The file's name will be current time's value in milliseconds
 *
 * @param {Buffer} source - PNG Image buffer
 * @param {string} folder - Path to screenshot folder
 * @param {Funciton} callback - Returns the saved image's path as a string when the image has been saved
 */
function saveScreenshotToFile(source, folder, callback) {
  var path = folder + new Date().getTime() + ".png";
  fs.writeFile(path, source, error => {
    if (error) {
      console.log(error.message);
    }
    callback(path);
  });
}

/**
 * Crop given image with the given settings
 *
 * @param {Buffer} source - Image buffer
 * @param {{x: number, y: number, width: number, height: number}} cropOptions - Options for cropping
 *
 * @returns {string} NativeImage buffer
 */
function cropImage(source, cropOptions) {
  var img = nativeImage.createFromBuffer(source);
  return img.crop(cropOptions);
}

/**
 * Delete given image file
 *
 * @param {string} path - Path to the image
 */
function removeImage(path) {
  fs.unlinkSync(path, function(err) {
    if (err) throw err;
    // if no error, file has been deleted successfully
    console.log("File deleted!");
  });
}

module.exports = {
  getWindowThumbnail,
  saveScreenshotToFile,
  cropImage,
  removeImage
};
