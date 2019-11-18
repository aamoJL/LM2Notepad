/**
 * Renderer script for notes window
 */

const electron = require("electron");
const desktopCapturer = electron.desktopCapturer;
const $ = require("jquery");
const { remote } = require("electron");
const { globalShortcut } = remote;
const screenCapture = require("./screenCapture.js");
const scanning = require("./scanning.js");
const path = require("path");
const fs = require("fs");
require("bootstrap");

// Screenshot settings ------------------------------------

const resourcePath = process.resourcesPath;
const noteScreenshotFolder = path.join(resourcePath, "/screenshots/notes/");
const noteTextPath = path.join(resourcePath, "/notes.json");
const mapCropOptions = {
  x: 65,
  y: 70,
  width: 790,
  height: 425
};
const scanCropOptions = {
  x: 100,
  y: 90,
  width: 720,
  height: 350
};

// Window events --------------------------------------------

window.addEventListener("load", () => {
  // Add schortcuts
  globalShortcut.register("CommandOrControl+shift+A", () => {
    scanAndSaveScreenshot();
  });
  globalShortcut.register("CommandOrControl+shift+S", () => {
    saveNote();
  });
  globalShortcut.register("CommandOrControl+shift+X", () => {
    takeAndSaveScreenshot();
  });
});

window.addEventListener("beforeunload", () => {
  // Unregister shortcuts
  globalShortcut.unregister("CommandOrControl+shift+A", () =>
    scanAndSaveScreenshot()
  );
  globalShortcut.unregister("CommandOrControl+shift+S", () => saveNote());
  globalShortcut.unregister("CommandOrControl+shift+X", () =>
    takeAndSaveScreenshot()
  );
});

$(window).on("load", () => {
  // Check paths, create folders if the folders does not exist
  if (!fs.existsSync(path.join(resourcePath, "/screenshots/"))) {
    fs.mkdirSync(path.join(resourcePath, "/screenshots"));
    console.log("created");
  }
  if (!fs.existsSync(path.join(resourcePath, "/screenshots/notes/"))) {
    fs.mkdirSync(path.join(resourcePath, "/screenshots/notes"));
    console.log("created");
  }
  if (!fs.existsSync(path.join(resourcePath, "/notes.json"))) {
    fs.writeFileSync(noteTextPath, "[]");
    console.log("created");
  }
  // Load content
  refreshWindowsList();
  // Activate tooltips
  refreshNoteList(() => {
    $('[data-toggle="tooltip"]').tooltip();
  });
});

// Button events --------------------------------------

$("#screenshot-button").on("click", function() {
  takeAndSaveScreenshot();
});
$("#refresh-windows-list-button").on("click", function() {
  refreshWindowsList();
});
$("#scan-button").on("click", function() {
  scanAndSaveScreenshot();
});
$("#save-scan-button").on("click", function() {
  saveNote();
});

// Content saving functions ---------------------------

/**
 * Take and save a screenshot of the selected window
 */
function takeAndSaveScreenshot() {
  // Get thumbnail image
  let windowList = $("#screenshot-window-list");
  screenCapture.getWindowThumbnail(windowList.val(), function(screenshot) {
    // Crop thumbnail if cropping is selected
    let cropToggle = $("#crop-toggle");
    if (cropToggle.is(":checked")) {
      screenshot = screenCapture.cropImage(screenshot, mapCropOptions).toPNG();
    }
    screenCapture.saveScreenshotToFile(
      screenshot,
      noteScreenshotFolder,
      function(imagePath) {
        scanning.saveScanToJSONFile(
          noteTextPath,
          "",
          path.parse(imagePath).name,
          () => {
            refreshNoteList(() => {
              $('[data-toggle="tooltip"]').tooltip();
            });
          }
        );
      }
    );
  });
}

/**
 * Take a screenshot of the window's thumbnail, scan it and save it
 */
function scanAndSaveScreenshot() {
  // Get thumbnail image
  let windowList = $("#screenshot-window-list");
  screenCapture.getWindowThumbnail(windowList.val(), function(screenshot) {
    // Crop the thumbnail
    screenshot = screenCapture.cropImage(screenshot, scanCropOptions);
    // Reset progressbar
    let progressBar = $("#scan-progress-bar");
    progressBar.css("width", 0 + "%");
    progressBar.html("0%");
    // Scan the thumbnail image
    scanning.scanImage(
      screenshot.toPNG(),
      function(message) {
        if (message.status === "recognizing text") {
          // Update progress
          progressBar.css("width", message.progress * 100 + "%");
          progressBar.html(message.progress * 100 + "%");
        }
      },
      function(result) {
        // Scan complete
        // Save the screenshot
        screenCapture.saveScreenshotToFile(
          screenshot.toPNG(),
          noteScreenshotFolder,
          function(imgPath) {
            scanning.saveScanToJSONFile(
              noteTextPath,
              result.text,
              path.parse(imgPath).name,
              () => {
                refreshNoteList(() => {
                  $('[data-toggle="tooltip"]').tooltip();
                });
              }
            );
          }
        );
      }
    );
  });
}

/**
 * Save the text from note text input
 */
function saveNote() {
  var scanText = $("#scan-text");
  if (scanText.val() !== "") {
    scanning.saveScanToJSONFile(noteTextPath, scanText.val(), "", () => {
      refreshNoteList(() => {
        $('[data-toggle="tooltip"]').tooltip();
      });
    });
    // Clear textarea
    scanText.val("");
  }
}

// Other functions ----------------------------------------

/**
 * Get all available window names and add them to dropdown list
 */
function refreshWindowsList() {
  desktopCapturer.getSources({ types: ["window"] }, (error, sources) => {
    if (error) {
      return console.log(error.message);
    }

    let windowList = $("#screenshot-window-list");
    windowList.empty();

    sources.forEach(source => {
      windowList.append(
        $("<option></option>")
          .attr("value", source.name)
          .text(source.name)
      );
      //console.log(source.name);
    });
  });
}

/**
 * Update note list
 */
function refreshNoteList(callback) {
  var container = $("#json-text-container");
  var currentScrollPosition = container.scrollTop();
  $('[data-toggle="tooltip"]').tooltip("hide");
  // clear the card container
  container.empty();

  if (fs.existsSync(noteTextPath)) {
    $.getJSON(noteTextPath, function(data) {
      // Change data's order so the most recent text is on top
      data = data.reverse();
      // Append the container with cards
      $.each(data, function(index, value) {
        container.append(JSONtoNoteCardElement(value));
        // Add button click events to card buttons
        $(`#remove-card-button-${value.id}`).on("click", function() {
          scanning.deleteScanText(
            noteTextPath,
            value.id,
            noteScreenshotFolder,
            () => {
              refreshNoteList(() => {
                $('[data-toggle="tooltip"]').tooltip();
              });
            }
          );
        });
        $(`#edit-button-${value.id}`).on("click", function() {
          $(`#edit-button-${value.id}`).toggleClass("d-none");
          $(`#cancel-button-${value.id}`).toggleClass("d-none");
          $(`#save-button-${value.id}`).toggleClass("d-none");
          $(`#card-text-${value.id}`).toggleClass("d-none");
          $(`#card-textarea-${value.id}`).toggleClass("d-none");
        });
        $(`#save-button-${value.id}`).on("click", function() {
          $(`#edit-button-${value.id}`).toggleClass("d-none");
          $(`#cancel-button-${value.id}`).toggleClass("d-none");
          $(`#save-button-${value.id}`).toggleClass("d-none");
          $(`#card-text-${value.id}`).toggleClass("d-none");
          $(`#card-textarea-${value.id}`).toggleClass("d-none");
          scanning.editScanText(
            noteTextPath,
            value.id,
            $(`#card-textarea-${value.id}`).val(),
            function() {
              // Update scan card list when the edit has been saved
              refreshNoteList(() => {
                $('[data-toggle="tooltip"]').tooltip();
              });
            }
          );
        });
        $(`#cancel-button-${value.id}`).on("click", function() {
          $(`#edit-button-${value.id}`).toggleClass("d-none");
          $(`#cancel-button-${value.id}`).toggleClass("d-none");
          $(`#save-button-${value.id}`).toggleClass("d-none");
          $(`#card-text-${value.id}`).toggleClass("d-none");
          $(`#card-textarea-${value.id}`).toggleClass("d-none");
        });
      });

      if (callback && callback());

      container.scrollTop(currentScrollPosition);
    });
  }
}

/**
 * Get note card information in HTML element
 *
 * @param {JSON} cardInfo - Scan information in JSON format.
 *
 * @returns {string} HTML element
 */
function JSONtoNoteCardElement(cardInfo) {
  return `<div class="card mb-3">
  <div class="row no-gutters">
    <div class="col-md-7">
      <img
        src="${
          cardInfo.screenshot !== ""
            ? noteScreenshotFolder + cardInfo.screenshot + ".png"
            : ""
        }"
        class="card-img remove-right-radius"
      />
    </div>
    <div class="col-md-5 d-flex">
      <div class="card-body flex-column d-flex">
        <div class="card-text flex-grow-1 mb-3" id="card-text-${cardInfo.id}">
          ${cardInfo.text}
        </div>
        <textarea
          class="form-control flex-grow-1 mb-3 d-none"
          name="card-text"
          id="card-textarea-${cardInfo.id}">${cardInfo.text}</textarea>
        <div class="d-flex">
          <div class="flex-grow-1">
            <button class="btn btn-primary btn-sm" id="edit-button-${
              // Edit
              cardInfo.id
            }" data-toggle="tooltip" title="Edit">
              <img src="icons/edit.svg" alt="edit note" />
            </button>
            <button class="btn btn-warning btn-sm d-none" id="cancel-button-${
              // Cancel
              cardInfo.id
            }" data-toggle="tooltip" title="Cancel">
              <img src="icons/cancel.svg" alt="cancel note changes" />
            </button>
            <button class="btn btn-success btn-sm d-none" id="save-button-${
              // Save
              cardInfo.id
            }" data-toggle="tooltip" title="Save">
            <img src="icons/save.svg" alt="save note changes" />
            </button>
          </div>
          <div class="align-self-end">
            <button class="btn btn-danger btn-sm" id="remove-card-button-${
              // Delete
              cardInfo.id
            }" data-toggle="tooltip" title="Delete">
            <img src="icons/delete.svg" alt="delete note" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>`;
}
