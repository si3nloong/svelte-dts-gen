import path from "node:path";
import fs from "node:fs";
import assert from "node:assert";
import { it } from "node:test";
import DtsGenerator from "../src/generator.js";

it("test cases", async () => {
  const rootDir = path.join(process.cwd(), "test/cases");
  const testCases = fs.readdirSync(rootDir);
  // console.log("Processing folder " + chalk.blue(rootDir));
  while (testCases.length > 0) {
    const testCase = testCases.shift();
    const curDir = path.join(rootDir, testCase);
    const dtsGen = new DtsGenerator(curDir, {});
    await dtsGen.readAll();
    console.log(dtsGen);
    const result = fs
      .readFileSync(path.join(curDir, "result.txt"))
      .toString("utf-8");
    console.log(result);
    assert.deepEqual("", "");
  }
});
