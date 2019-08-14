const $ = require("jquery");
const Tesseract = require("tesseract.js");
const fs = require("fs");

// Path for the json file that contains scan texts and screenshot paths
const jsonPath = "./notes.json";

/** Scans given image
 *
 * @param {Buffer} source -Image buffer
 * @param {Function} progressCallback -Callback that is called when scanning progress has been made
 * @param {Function} resultCallback -Callback that is called when the scan is completed
 *
 * @returns {number} Progress percent
 * @returns {Object} {text: string} TesseractJob
 */
function scanImage(source, progressCallback, resultCallback) {
  Tesseract.recognize(source, {})
    .progress(message => {
      progressCallback(message);
    })
    .catch(error => {
      console.log(error.message);
    })
    .then(function(result) {
      resultCallback(result);
    });
}

/** Saves scanned text to json file with the scan's screenshot path
 *
 * @param {string} text -Scanned text
 * @param {string} screenshotName -Name of the scanned image
 * @param {Function} callback -Callback that will be called when the scan has been saved
 */
function saveScanToJSONFile(text, screenshotName, callback) {
  $.getJSON(jsonPath, function(data) {
    var newId = data.length == 0 ? 0 : data[data.length - 1].id + 1;
    var newScanObject = {
      id: newId,
      text: text,
      screenshot: screenshotName
    };

    // Save to JSON file
    data.push(newScanObject);
    var newJSON = JSON.stringify(data);
    fs.writeFile(jsonPath, newJSON, function() {
      callback();
    });
  });
}

/** Edits and saves exisiting scan's text
 *
 * @param {number} id -Scan's id number
 * @param {string} text -New text for the scan
 * @param {Function} callback -Callback that is called when the save has been completed
 */
function editScanText(id, newText, callback) {
  $.getJSON(jsonPath, function(data) {
    // Find text in json with the given id
    $.each(data, function(i, value) {
      if (value.id === id) {
        // text object found, change the text
        value.text = newText;
        // Save to JSON file
        var newJSON = JSON.stringify(data);
        fs.writeFile(jsonPath, newJSON, function() {
          callback();
        });
        // break from the loop
        return false;
      }
    });
  });
}

/** Removes scanned text from the JSON file
 *
 * @param {number} id - Scan text's id that is integer,
 * @param {function} callback - Callback that is called when the text has been removed
 */
function deleteScanText(id, imageFolder, callback) {
  $.getJSON(jsonPath, function(data) {
    var index = -1;
    $.each(data, function(i, value) {
      if (value.id === id) {
        index = i;
      }
    });
    if (index !== -1) {
      // Remove image if the scan has an image
      let scan = data[index];
      if (scan.screenshot !== "") {
        removeImage(imageFolder + scan.screenshot + ".png");
      }
      // Remove scan from json
      data.splice(index, 1);
      var newJSON = JSON.stringify(data);
      fs.writeFile(jsonPath, newJSON, function() {
        callback();
      });
    }
  });
}

function removeImage(path) {
  fs.unlinkSync(path, function(err) {
    if (err) throw err;
  });
}

module.exports = {
  scanImage,
  saveScanToJSONFile,
  deleteScanText,
  editScanText
};
