import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const plugins = [nodeResolve(), commonjs(), json()];

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
