/**
 * Functions to scan images with Tesseract
 */

const { createWorker } = require("tesseract.js");

/**
 * Scan given image
 * @param {Buffer} source - Image buffer
 * @param {Function} logger - Callback that is called when scanning progress has been made
 * @returns {Promise<string>} Scanned text
 */
async function scanImage(source, logger) {
  const worker = await createWorker("eng", 1, {
    logger: (m) => logger(m),
    errorHandler: (error) => console.error(error),
  });

  const {
    data: { text },
  } = await worker.recognize(source);

  await worker.terminate();

  return text;
}

module.exports = {
  scanImage,
};
