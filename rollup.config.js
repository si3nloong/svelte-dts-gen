import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const plugins = [nodeResolve(), json()];

export default [
  {
    input: "src/index.js",
    plugins,
    output: [
      {
        file: "dist/index.mjs",
        format: "esm",
      },
      {
        file: "dist/index.js",
        format: "cjs",
      },
    ],
  },
  // {
  //   input: "src/cli.js",
  //   plugins,
  //   output: [
  //     {
  //       file: "dist/cli/index.js",
  //       format: "cjs",
  //     },
  //   ],
  // },
];
