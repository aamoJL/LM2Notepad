const electron = require("electron");
const desktopCapturer = electron.desktopCapturer;
const $ = require("jquery");
const { remote } = require("electron");
const { globalShortcut } = remote;
const screenCapture = require("./screenCapture.js");
const scanning = require("./scanning.js");
const path = require("path");

// #region Screenshot options --------------------------

const noteScreenshotFolder = "./screenshots/notes/";
const noteTextPath = "./notes.json";
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

// #endregion

// #region Init page

window.addEventListener("load", () => {
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
  globalShortcut.unregister("CommandOrControl+shift+A", () =>
    scanAndSaveScreenshot()
  );
  globalShortcut.unregister("CommandOrControl+shift+S", () => saveNote());
  globalShortcut.unregister("CommandOrControl+shift+X", () =>
    takeAndSaveScreenshot()
  );
});

$(window).on("load", () => {
  refreshWindowsList();
  //updateScreenshotImage();
  refreshScanCardList();
});

// Button clicks -------------------------

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

// #endregion

/** Takes and saves a screenshot of the selected window
 *
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
        scanning.saveScanToJSONFile("", path.parse(imagePath).name, () => {
          refreshScanCardList();
        });
      }
    );
  });
}

/** Takes a screenshot of the window's thumbnail, scans it and saves it
 *
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
              result.text,
              path.parse(imgPath).name,
              () => {
                refreshScanCardList();
              }
            );
          }
        );
      }
    );
  });
}

/** Saves text from textarea to a file without image and updates scan card list
 *
 */
function saveNote() {
  var scanText = $("#scan-text");
  if (scanText.val() !== "") {
    scanning.saveScanToJSONFile(scanText.val(), "", () =>
      refreshScanCardList()
    );
    // Clear textarea
    scanText.val("");
  }
}

/** Gets all available window names and adds them to dropdown list.
 *
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

/** Updates list that displays scan cards
 *
 */
function refreshScanCardList() {
  var container = $("#json-text-container");
  var currentScrollPosition = container.scrollTop();
  // clear the card container
  container.empty();

  $.getJSON(noteTextPath, function(data) {
    // Change data's order so the most recent text is on top
    data = data.reverse();
    // Append the container with cards
    $.each(data, function(index, value) {
      container.append(JSONtoScanCardElement(value));
      // Add button click events to card buttons
      $(`#remove-card-button-${value.id}`).on("click", function() {
        scanning.deleteScanText(value.id, noteScreenshotFolder, () =>
          refreshScanCardList()
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
          value.id,
          $(`#card-textarea-${value.id}`).val(),
          function() {
            // Update scan card list when the edit has been saved
            refreshScanCardList();
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

    container.scrollTop(currentScrollPosition);
  });
}

/** Get card information in HTML element.
 *
 * @param {JSON} cardInfo - Scan information in JSON format.
 *
 * @returns {string} HTML element
 */
function JSONtoScanCardElement(cardInfo) {
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
              cardInfo.id
            }">
              <img src="icons/edit.svg" alt="edit note" />
            </button>
            <button class="btn btn-warning btn-sm d-none" id="cancel-button-${
              cardInfo.id
            }">
              <img src="icons/cancel.svg" alt="cancel note changes" />
            </button>
            <button class="btn btn-success btn-sm d-none" id="save-button-${
              cardInfo.id
            }">
            <img src="icons/save.svg" alt="save note changes" />
            </button>
          </div>
          <div class="align-self-end">
            <button class="btn btn-danger btn-sm" id="remove-card-button-${
              cardInfo.id
            }">
            <img src="icons/delete.svg" alt="delete note" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>`;
}
