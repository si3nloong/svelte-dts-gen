export default [
  {
    input: "src/index.js",
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
  {
    input: "src/cli.js",
    output: [
      {
        file: "dist/cli/index.js",
        format: "cjs",
      },
    ],
  },
];
