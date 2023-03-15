import path from "node:path";
import fs from "node:fs";
import assert from "node:assert";
import test from "node:test";
import DtsGenerator from "../src/generator.js";
import { walkSync } from "../src/util.js";

test("test cases", async () => {
  const rootDir = path.join(process.cwd(), "test/cases");
  for (const filePath of walkSync(rootDir)) {
    const pathParser = path.parse(filePath);
    if (![".svelte"].includes(pathParser.ext)) {
      continue;
    }

    const dtsGen = new DtsGenerator(filePath, {
      force: true,
    });
    await dtsGen.run({
      /** @param {{ input: string; outputs: string[] }} */
      each: async ({ input, outputs }) => {
        while (outputs.length > 0) {
          const output = outputs[0];
          const pathParser = path.parse(input);
          /** @type {string[]} */
          const result = await Promise.all([
            fs.promises.readFile(output),
            fs.promises.readFile(
              path.join(pathParser.dir, `${pathParser.base}.txt`)
            ),
          ]).then((p) => p.map((v) => v.toString("utf-8")));
          assert.deepEqual(result[0], result[1]);
          outputs.shift();
        }
      },
    });
  }
});
