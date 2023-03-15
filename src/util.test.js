import { it } from "node:test";
import assert from "node:assert";
import { toPaskalCase } from "./util.js";

it("toPaskalCase", () => {
  assert.deepEqual(toPaskalCase(`ghost`), `Ghost`);
  assert.deepEqual(toPaskalCase(`g_12_joker`), `G12Joker`);
  assert.deepEqual(toPaskalCase(`hello-world`), `HelloWorld`);
  assert.deepEqual(toPaskalCase(`under_score`), `UnderScore`);
});
