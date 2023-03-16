import path from "node:path";
import fs from "node:fs";

/**
 * Enhance version of `fs.readdirSync` by walk recursively.
 *
 * @param {string} dir
 * @returns {Generator<string, void, unknown>}
 */
export function* walkSync(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      yield* walkSync(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}

/**
 * Convert string to PaskalCase.
 *
 * @param {string} str
 * @returns {string}
 */
export function toPaskalCase(str) {
  // Replace all non-alphanumeric characters with spaces
  str = str.replace(/[^A-Za-z0-9]/g, " ");

  // Convert string to lowercase and split into words
  var words = str.toLowerCase().split(" ");

  // Convert the first letter of each word to uppercase
  for (var i = 0; i < words.length; i++) {
    words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
  }

  // Concatenate the words and return the result
  return words.join("");
}
