/**
 * Main process for notes window
 */

const { BrowserWindow, globalShortcut, ipcMain, dialog } = require("electron/main");
const path = require("node:path");
const fs = require("fs");
const screenCapture = require("../screenCapture/screenCapture.js");
const { scanImage } = require("../scanning/scanning.js");

const notesDirectoryPath = path.join(process.resourcesPath, "notes");
const notesFilePath = path.join(notesDirectoryPath, "notes.json");
const noteScreenshotFolder = path.join(notesDirectoryPath, "screenshots");

/**
 * Creates window for notes
 */
function createWindow() {
  initDirectories();

  let win = new BrowserWindow({
    width: 1200,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, "notesPreload.js"),
      disableDialogs: true,
    },
    show: false,
  });

  win.removeMenu();

  win.loadFile(path.join(__dirname, "notes.html"));

  win.once("ready-to-show", () => {
    globalShortcut.register("CommandOrControl+shift+X", () => {
      win.webContents.postMessage("shortcut:take-screenshot", null);
    });
    globalShortcut.register("CommandOrControl+shift+A", () => {
      win.webContents.postMessage("shortcut:scan-screenshot", null);
    });

    win.show();
  });

  win.on("closed", () => {
    globalShortcut.unregister("CommandOrControl+shift+A");
    globalShortcut.unregister("CommandOrControl+shift+S");
    globalShortcut.unregister("CommandOrControl+shift+X");
  });

  ipcMain.handle("get-note-screenshot-path", () => {
    return noteScreenshotFolder;
  });

  ipcMain.handle("notes:path-join", (_e, args) => {
    return path.join(...args);
  });

  ipcMain.handle("add-note", (_e, note) => {
    return addNote(note.text, note.screenshot);
  });

  ipcMain.handle("get-notes", () => {
    return getNotes();
  });

  ipcMain.handle("delete-note", (_e, id) => {
    return deleteNote(id);
  });

  ipcMain.handle("update-note", (_e, { id, text }) => {
    return updateNote(id, text);
  });

  ipcMain.handle("notes:take-screenshot", (_e, args) => {
    return takeScreenshot(args.source, args.crop);
  });

  ipcMain.handle("scan-screenshot", (_e, buffer) => {
    return scanScreenshot(buffer, (log) => {
      if (log.status === "recognizing text") {
        win.webContents.postMessage("scan-progress-update", (log.progress * 100).toFixed(0));
      }
    });
  });

  ipcMain.handle("notes:confirm-dialog", (_e, options) => {
    return showDialog(win, options);
  });
}

/**
 * Creates needed folders and files
 */
function initDirectories() {
  if (!fs.existsSync(notesDirectoryPath)) {
    fs.mkdirSync(notesDirectoryPath, { recursive: true });
    console.log("Notes directory created");
  }

  if (!fs.existsSync(noteScreenshotFolder)) {
    fs.mkdirSync(noteScreenshotFolder, { recursive: true });
    console.log("Note screenshot folder created");
  }
}

/**
 * Returns notes file as a json object
 * @returns {Object} notes as a json object
 */
function getNotes() {
  if (!fs.existsSync(notesFilePath)) {
    fs.writeFileSync(notesFilePath, "[]");
  }

  return JSON.parse(fs.readFileSync(notesFilePath, "utf8"));
}

/**
 * Saves note to a file
 * @param {string} noteText
 * @param {Buffer} [screenshotBuffer]
 */
function addNote(noteText, screenshotBuffer) {
  return new Promise((resolve, reject) => {
    let json = getNotes();
    let screenshotFileName = screenshotBuffer ? new Date().getTime().toString() : "";

    if (screenshotBuffer) {
      let screenshotPath = path.join(noteScreenshotFolder, `${screenshotFileName}.png`);
      fs.writeFileSync(screenshotPath, screenshotBuffer);
      console.log(screenshotFileName + ".png saved.");
    }

    let newNoteObject = {
      id: json.length == 0 ? 0 : json[json.length - 1].id + 1,
      text: noteText,
      screenshot: screenshotFileName,
    };

    json.push(newNoteObject);

    fs.writeFile(notesFilePath, JSON.stringify(json), (err) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log("Note added");
        resolve(newNoteObject);
      }
    });
  });
}

/**
 * Deletes the note with the given id
 * @param {number} id
 */
function deleteNote(id) {
  let json = getNotes();

  return new Promise((resolve, reject) => {
    let index = json.findIndex((x) => x.id === id);

    if (index !== -1) {
      let note = json[index];

      // remove screenshot if exists
      if (note.screenshot !== "") {
        let screenshotPath = path.join(noteScreenshotFolder, `${note.screenshot}.png`);

        if (fs.existsSync(screenshotPath)) fs.unlinkSync(screenshotPath);
      }

      json.splice(index, 1);

      fs.writeFile(notesFilePath, JSON.stringify(json), (err) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          console.log("Note deleted");
          resolve(true);
        }
      });
    }
  });
}

/**
 * Updates note's text
 * @param {number} id
 * @param {string} text
 */
function updateNote(id, text) {
  return new Promise((resolve, reject) => {
    let json = getNotes();
    let index = json.findIndex((x) => x.id === id);

    if (index !== -1) {
      let note = json[index];

      note.text = text;

      fs.writeFile(notesFilePath, JSON.stringify(json), (err) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          console.log("Note updated");
          resolve(note);
        }
      });
    } else {
      reject(`Note with id ${id} does not exist`);
    }
  });
}

/**
 * @param {string} source Source name
 * @param {boolean} [crop]
 *
 * @returns {Promise<Buffer>} screenshot buffer
 */
function takeScreenshot(source, crop) {
  return new Promise((resolve, reject) => {
    if (!source) {
      reject("Source name is undefined");
    }

    console.log("Taking screenshot. source: " + source + "...");

    screenCapture
      .getWindowThumbnail(source)
      .then((screenshot) => {
        if (crop) {
          screenshot = screenCapture
            .cropImage(screenshot, {
              x: 65,
              y: 70,
              width: 790,
              height: 425,
            })
            .toPNG();
        }

        resolve(screenshot);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 * Scans text from a screenshot
 * @param {Buffer} buffer - Screenshot buffer
 * @param {(arg0: Tesseract.LoggerMessage) => any} logger - Scan logger function
 */
function scanScreenshot(buffer, logger) {
  return scanImage(buffer, logger);
}

/**
 * @param {BrowserWindow} win
 * @param {Electron.MessageBoxOptions} options
 * @returns
 */
function showDialog(win, options) {
  return dialog.showMessageBox(win, options);
}

module.exports = {
  createWindow,
};
