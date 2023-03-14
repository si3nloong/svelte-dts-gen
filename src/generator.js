import path from "node:path";
import fs from "node:fs";
import ts from "typescript";
import { preprocess, compile as svelteCompile } from "svelte/compiler";
import SvelteTransformer from "./transformer/svelte.js";

const defaultOpts = {
  outDir: "",
  compact: false,
  force: false,
};

class DtsGenerator {
  /**
   * Lazy initialise callback
   * @type {Promise<void>}
   */
  #initCallback;

  /**
   * Valid file extensions
   * @type {string[]}
   */
  #extensions;

  /** @type {string} */
  #dir;

  /** @type {string} */
  #input;

  /** @type {string} */
  #output;

  /**
   *
   * @param {string} input
   * @param {defaultOpts} options
   */
  constructor(input, options) {
    this.#initCallback = this.#init(input, Object.assign(defaultOpts, options));
  }

  /**
   *
   * @param {string} input
   * @param {defaultOpts} options
   * @returns {Promise<void>}
   */
  async #init(input, options) {
    /** @type {{ default: { types: string }}} */
    // const packageJson = await import(path.join(process.cwd(), "package.json"), {
    //   assert: { type: "json" },
    // });
    // console.log(packageJson);
    this.#input = path.isAbsolute(input)
      ? input
      : path.join(process.cwd(), input);
    this.#dir = path.dirname(this.#input);
    // this.#output = options.output || packageJson.default.types;
    this.#output = options.outDir || "";
    this.#extensions = options.extensions || [".svelte", ".ts", ".js"];
  }

  /**
   * @returns {Promise<void>}
   */
  async readAll() {
    await this.#initCallback;
    console.log("Dir ->", this.#dir);
    const files = await fs.promises.readdir(this.#dir, ["node_modules"]);
    while (files.length > 0) {
      const file = files[0];
      console.log("File ->", file);
      await this.#readFile(path.join(this.#dir, file));
      files.shift();
    }
  }

  /**
   *
   * @param {string} filename
   * @returns {Promise<void>}
   */
  async #readFile(filename) {
    const pathParser = path.parse(filename);
    const extension = path.extname(filename);

    if ([".test.", ".spec."].includes(pathParser.base)) {
      return;
    }

    if (!this.#extensions.includes(pathParser.ext)) {
      return;
    }

    switch (extension) {
      case ".svelte":
        this.#readSvelteFile(filename);
      case ".ts":
      case (".js", ".cjs", ".mjs"):
    }
  }

  /**
   * Read `.svelte` file and transpile it
   *
   * @param {string} filename
   * @returns {Promise<void>}
   */
  async #readSvelteFile(filename) {
    const fileContent = await fs.promises.readFile(filename, {
      encoding: "utf-8",
    });

    let scriptTsContent = "";
    const resultPreprocess = await preprocess(
      fileContent,
      [
        {
          script: ({ content }) => {
            scriptTsContent = content;

            const resultTranspile = ts.transpileModule(content, {
              compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ESNext,
                allowJs: true,
                moduleResolution: ts.ModuleResolutionKind.NodeJs,
                strict: true,
              },
            });

            return { code: resultTranspile.outputText };
            // return { code: content };
          },
        },
      ],
      { filename }
    );

    const compiled = svelteCompile(resultPreprocess.code, {
      filename,
    });
    const pathParser = path.parse(filename);
    const transformer = new SvelteTransformer(
      scriptTsContent,
      compiled.ast,
      this.#dir,
      pathParser.base
    );

    const typesPath = path.join(
      process.cwd(),
      this.#output,
      this.#dir.replace(process.cwd(), "")
    );
    fs.mkdirSync(typesPath, { recursive: true });
    // Construct the output file name, should be end with `.d.ts`
    const outputFile = path.join(typesPath, `${pathParser.base}.d.ts`);
    fs.writeFileSync(outputFile, await transformer.toString());
  }

  async write() {
    const typesPath = path.join(
      process.cwd(),
      this.#output,
      this.#dir.replace(process.cwd(), "")
    );
    fs.mkdirSync(typesPath, { recursive: true });
  }
}

export default DtsGenerator;
