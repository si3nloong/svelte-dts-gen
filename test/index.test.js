import path from "node:path";
import fs from "node:fs";
import assert from "node:assert";
import test from "node:test";
import DtsGenerator from "../src/generator.js";

/**
 *
 * @param {string} dir
 */
function* walkSync(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      yield* walkSync(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}

test("test cases", async () => {
  const rootDir = path.join(process.cwd(), "test/cases");
  for (const filePath of walkSync(rootDir)) {
    const pathParser = path.parse(filePath);
    if (![".svelte"].includes(pathParser.ext)) {
      continue;
    }

    const dtsGen = new DtsGenerator(filePath, {
      outDir: "dist",
    });
    await dtsGen.readAll();

    const result = fs
      .readFileSync(path.join(pathParser.dir, `${pathParser.base}.txt`))
      .toString("utf-8");
    console.log(result);
    // assert.deepEqual(result, "");
  }
});
