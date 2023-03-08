import { it } from "node:test";
import assert from "node:assert";
import { toPaskalCase } from "./util.js";

it("toPaskalCase", () => {
  assert.deepEqual(toPaskalCase(`ghost`), `Ghost`);
  assert.deepEqual(toPaskalCase(`hello-world`), `HelloWorld`);
});
