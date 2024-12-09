/**
 * Renderer process for notes window
 */

window.addEventListener("load", async () => {
  // @ts-ignore
  window.electronAPI.shortcut.onTakeScreenshotShortcut(() => {
    document.getElementById("screenshot-button")?.click();
  });
  // @ts-ignore
  window.electronAPI.shortcut.onScanScreenshotShortcut(() => {
    document.getElementById("scan-button")?.click();
  });
  // @ts-ignore
  window.electronAPI.update.onScanProgressUpdate((value) => {
    updateScanProgress(value);
  });

  await refreshSourceList();
  await refreshNoteList();
});

document.getElementById("refresh-sources-list-button")?.addEventListener("click", async () => {
  await refreshSourceList();
});
document.getElementById("screenshot-button")?.addEventListener("click", () => {
  // Crop thumbnail if cropping is selected
  // @ts-ignore
  let crop = document.getElementById("crop-toggle")?.hasAttribute("checked") ?? false;
  // @ts-ignore
  let sourceName = document.getElementById("screenshot-source-list")?.value ?? "";

  takeScreenshot(sourceName, crop)
    .then((buffer) => {
      addNote("", buffer)
        .then(async (note) => {
          // @ts-ignore
          const screenshotFolder = await window.electronAPI.path.noteScreenshotFolder();
          // @ts-ignore
          const screenshotPath = note.screenshot !== "" ? await window.electronAPI.path.join([screenshotFolder, `${note.screenshot}.png`]) : "";

          await prependNoteToContainer(note.text, screenshotPath, note.id);
        })
        .catch((err) => console.error(err));
    })
    .catch((err) => console.error(err));
});
document.getElementById("scan-button")?.addEventListener("click", () => {
  // @ts-ignore
  let sourceName = document.getElementById("screenshot-source-list")?.value ?? "";

  takeScreenshot(sourceName, true)
    .then(async (buffer) => {
      updateScanProgress(0);

      let noteText = await scanScreenshot(buffer);

      addNote(noteText, buffer)
        .then(async (note) => {
          updateScanProgress(100);

          // @ts-ignore
          const screenshotFolder = await window.electronAPI.path.noteScreenshotFolder();
          // @ts-ignore
          const screenshotPath = note.screenshot !== "" ? await window.electronAPI.path.join([screenshotFolder, `${note.screenshot}.png`]) : "";

          await prependNoteToContainer(note.text, screenshotPath, note.id);
        })
        .catch((err) => {
          updateScanProgress(100);
          console.error(err);
        });
    })
    .catch((err) => console.error(err));
});
document.getElementById("add-note-button")?.addEventListener("click", () => {
  let noteTextInput = document.getElementById("note-text-input");
  // @ts-ignore
  let noteText = noteTextInput?.value ?? "";

  if (noteText.length > 0) {
    addNote(noteText, null)
      .then(async (note) => {
        // @ts-ignore
        const screenshotFolder = await window.electronAPI.path.noteScreenshotFolder();
        // @ts-ignore
        const screenshotPath = note.screenshot !== "" ? await window.electronAPI.path.join([screenshotFolder, `${note.screenshot}.png`]) : "";

        await prependNoteToContainer(note.text, screenshotPath, note.id);

        // Clear textarea
        if (noteTextInput) {
          // @ts-ignore
          noteTextInput.value = "";
        }
      })
      .catch((err) => console.error(err));
  }
});
document.getElementById("crop-toggle")?.addEventListener("click", () => {
  var toggle = document.getElementById("crop-toggle");

  if (toggle) {
    var wasChecked = toggle.hasAttribute("checked");

    wasChecked ? toggle.removeAttribute("checked") : toggle.setAttribute("checked", "");
    wasChecked ? toggle.classList?.remove("active") : toggle.classList?.add("active");

    var cropIcon = document.getElementById("crop-icon");
    wasChecked ? cropIcon?.classList.add("filter-black") : cropIcon?.classList.remove("filter-black");
  }
});

/**
 * Get all available window names and add them to dropdown list
 */
async function refreshSourceList() {
  // @ts-ignore
  let sources = await window.electronAPI.screenshot.getSources();
  let sourceList = document.getElementById("screenshot-source-list");

  if (!sources) {
    console.error("No sources found");
  }

  if (sourceList) {
    sourceList.replaceChildren();

    sources.forEach((source) => {
      var option = document.createElement("option");
      option.setAttribute("value", source.name);
      option.text = source.name;

      sourceList.append(option);
    });
  } else {
    console.error("Screenshot source list not found");
  }
}

/**
 * Prepends all notes to the note container
 */
async function refreshNoteList() {
  // @ts-ignore
  const notes = await window.electronAPI.note.get();
  const container = document.getElementById("notes-container");
  // @ts-ignore
  const screenshotFolder = await window.electronAPI.path.noteScreenshotFolder();

  if (container) {
    for (const note of notes) {
      // @ts-ignore
      const screenshotPath = note.screenshot !== "" ? await window.electronAPI.path.join([screenshotFolder, `${note.screenshot}.png`]) : "";

      await prependNoteToContainer(note.text, screenshotPath, note.id);
    }
  }
}

/**
 * Saves the given note
 * @param {string} text - Note text
 * @param {Buffer | null} [screenshot] - Screenshot file name
 * @returns {Promise<{text: string, screenshot: string, id: number}>}
 */
function addNote(text, screenshot) {
  return new Promise((resolve, reject) => {
    if (typeof text === "string") {
      // @ts-ignore
      window.electronAPI.note
        .add({ text, screenshot })
        .then((note) => {
          resolve(note);
        })
        .catch((err) => {
          console.log(err);
        });
    } else reject("Text is: " + text);
  });
}

/**
 * Updates note
 * @param {number} id - Note id
 * @param {string} text - Note text
 * @param {string} screenshot - Screenshot file name
 */
function updateNote(id, text, screenshot) {
  return new Promise((resolve, reject) => {
    if (typeof text === "string") {
      // @ts-ignore
      window.electronAPI.note
        .update({ id, text, screenshot })
        .then((note) => {
          resolve(note);
        })
        .catch((err) => {
          console.log(err);
        });
    } else reject("Text is: " + text);
  });
}

/**
 * Scans and saves a screenshot of the selected source as a note
 * @param {string} sourceName
 * @param {boolean} [crop]
 * @returns {Promise<Buffer>}
 */
function takeScreenshot(sourceName, crop) {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    window.electronAPI.screenshot
      .takeScreenshot({ source: sourceName, crop: crop })
      .then((buffer) => {
        resolve(buffer);
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
}

/**
 * Returns the text scanned from the given screenshot
 * @param {Buffer} buffer - Screenshot buffer
 */
async function scanScreenshot(buffer) {
  // @ts-ignore
  let scanText = await window.electronAPI.screenshot.scanScreenshot(buffer);
  return scanText;
}

/**
 * Prepends note element to the note container
 * @param {string} text
 * @param {string} screenshotPath
 * @param {number} id
 */
async function prependNoteToContainer(text, screenshotPath, id) {
  const container = document.getElementById("notes-container");
  const cardElement = createNoteCardElement(text, screenshotPath, id);

  if (cardElement && container) {
    container.prepend(cardElement);
    addButtonEventsToCardElement(id, {
      onRemove: async () => {
        // @ts-ignore
        window.electronAPI.dialog
          .confirm({
            message: "Delete note?",
            buttons: ["Yes", "No"],
            type: "question",
          })
          .then(async (res) => {
            if (res.response === 0) {
              // @ts-ignore
              var response = await window.electronAPI.note.delete(id);
              if (response === true) container.removeChild(cardElement);
            }
          });
      },
      onUpdate: async (text) => {
        // @ts-ignore
        window.electronAPI.note
          .update({ id, text })
          .then((note) => {
            let textElement = document.querySelector(`#card-text-${note.id}`);
            if (textElement) {
              textElement.textContent = note.text;
            }
          })
          .catch((err) => console.error(err));
      },
    });
  }
}

/**
 * Returns card element of the given note
 * @param {string} screenshotPath
 * @param {string} text
 * @param {number} id
 * @returns {ChildNode | null}
 */
function createNoteCardElement(text, screenshotPath, id) {
  const iconPath = "../../assets/icons";

  const templateData = `<div class="card mb-1 rounded-0" id="note-container-${id}">
  <div class="row no-gutters">
    <div class="col-md-7">
      <img src="${screenshotPath}" class="card-img rounded-0" />
    </div>
    <div class="col-md-5 d-flex">
      <div class="card-body flex-column d-flex">
        <div class="card-text flex-grow-1 mb-3" id="card-text-${id}">
          ${escapeHtml(text)}
        </div>
        <textarea
          class="form-control flex-grow-1 mb-3 d-none resize-none rounded-0"
          name="card-text"
          id="card-textarea-${id}">${escapeHtml(text)}</textarea>
        <div class="d-flex">
          <div class="flex-grow-1">
            <button class="btn btn-secondary btn-sm" id="edit-button-${id}" title="Edit">
              <img src="${iconPath}/edit.svg" alt="edit note" />
            </button>
            <div class="btn-group">
              <button class="btn btn-warning btn-sm d-none" id="cancel-button-${id}" title="Cancel">
                <img src="${iconPath}/cancel.svg" alt="cancel note changes" />
              </button>
              <button class="btn btn-success btn-sm d-none" id="save-button-${id}" title="Save">
                <img src="${iconPath}/save.svg" alt="save note changes" />
              </button>
            </div>
          </div>
          <div class="align-self-end">
            <button class="btn btn-danger btn-sm" id="remove-card-button-${id}" title="Delete">
            <img src="${iconPath}/delete.svg" alt="delete note" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>`;

  let cardTemplate = document.createElement("template");
  cardTemplate.innerHTML = templateData;

  return cardTemplate.content.firstChild;
}

/**
 * Adds button event to a note card
 * @param {number} noteId
 * @param {{onRemove: function, onUpdate: function}} events
 */
function addButtonEventsToCardElement(noteId, events) {
  function toggleElementVisibility() {
    noteContainer?.querySelector(`#edit-button-${noteId}`)?.classList.toggle("d-none");
    noteContainer?.querySelector(`#cancel-button-${noteId}`)?.classList.toggle("d-none");
    noteContainer?.querySelector(`#save-button-${noteId}`)?.classList.toggle("d-none");
    noteContainer?.querySelector(`#card-text-${noteId}`)?.classList.toggle("d-none");
    noteContainer?.querySelector(`#card-textarea-${noteId}`)?.classList.toggle("d-none");
  }

  let noteContainer = document.getElementById(`note-container-${noteId}`);

  // Button events
  noteContainer?.querySelector(`#remove-card-button-${noteId}`)?.addEventListener("click", () => {
    events.onRemove();
  });
  noteContainer?.querySelector(`#edit-button-${noteId}`)?.addEventListener("click", () => {
    let textArea = noteContainer?.querySelector(`#card-textarea-${noteId}`);
    if (textArea) {
      // @ts-ignore
      let noteText = noteContainer?.querySelector(`#card-text-${noteId}`)?.innerText ?? "";
      // @ts-ignore
      textArea.value = noteText;
    }
    toggleElementVisibility();
  });
  noteContainer?.querySelector(`#save-button-${noteId}`)?.addEventListener("click", () => {
    // @ts-ignore
    let text = noteContainer?.querySelector(`#card-textarea-${noteId}`)?.value ?? "";

    events.onUpdate(text);

    toggleElementVisibility();
  });
  noteContainer?.querySelector(`#cancel-button-${noteId}`)?.addEventListener("click", () => {
    toggleElementVisibility();
  });
}

/**
 * Updates progress value to the scan progress bar element
 * @param {number} value - Progress percent
 */
function updateScanProgress(value) {
  let progressBar = document.getElementById("scan-progress-bar");

  if (progressBar) {
    progressBar.style.width = value + "%";
    progressBar.innerHTML = value + "%";
  }
}

/**
 * Sanitizes string
 *
 * @param {*} unsafe
 * @returns {string}
 */
function escapeHtml(unsafe) {
  return unsafe.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
