import path from "node:path";
import fs from "node:fs";
import ts from "typescript";
// import preprocess from "svelte-preprocess";
import {
  preprocess as sveltePreprocess,
  compile as svelteCompile,
} from "svelte/compiler";
import { walkSync } from "./util.js";
import SvelteTransformer from "./transformer/svelte.js";
import TypescriptTransformer from "./transformer/typescript.js";

const defaultOpts = {
  outDir: "",
  compact: false,
  force: false,
};

class DtsGenerator {
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

  /** @type {boolean} */
  #overwrite;

  /**
   *
   * @param {string} input
   * @param {defaultOpts} options
   */
  constructor(input, options) {
    this.#init(input, Object.assign(defaultOpts, options));
  }

  /**
   *
   * @param {string} input
   * @param {defaultOpts} options
   * @returns {void}
   */
  #init(input, options) {
    this.#input = path.isAbsolute(input)
      ? input
      : path.join(process.cwd(), input);
    this.#dir = path.dirname(this.#input);
    // Output and input folder will be similar
    this.#output = options.outDir || this.#dir;
    this.#extensions = options.extensions || [".svelte", ".ts", ".js"];
    this.#overwrite =
      typeof options.force === "boolean" ? options.force : false;
  }

  /**
   * @param {Optional<{ each: (v: { output: string[] }) => void }>} opts
   * @returns {Promise<void>}
   */
  async run(opts) {
    opts = Object.assign({ each: () => {} }, opts);
    let files = function* () {
      yield this.#input;
    }.bind(this)();
    if (fs.lstatSync(this.#input).isDirectory()) {
      files = walkSync(this.#input);
    }
    for (const file of files) {
      // console.log("File ->", file);
      const pathParser = path.parse(file);

      if ([".test.", ".spec."].includes(pathParser.base)) {
        continue;
      }

      if (!this.#extensions.includes(pathParser.ext)) {
        continue;
      }

      if (/.*\.d\.ts$/gi.test(pathParser.base)) {
        continue;
      }

      const outputs = await this.#readFile(file);
      await opts.each({ input: file, outputs });
    }
  }

  /**
   *
   * @param {string} filename
   * @returns {Promise<string[]>}
   */
  async #readFile(filename) {
    const extension = path.extname(filename);

    let result = [];
    switch (extension) {
      case ".svelte":
        result = await this.#readSvelteFile(filename);
        break;
      case ".ts":
        result = await this.#readTypeScriptFile(filename);
        break;
      // case (".js", ".cjs", ".mjs"):
      // break;
    }

    return result;
  }

  /**
   * Read `.svelte` file and transpile it
   *
   * @param {string} filename
   * @returns {Promise<string[]>}
   */
  async #readSvelteFile(filename) {
    const fileContent = await fs.promises.readFile(filename, {
      encoding: "utf-8",
    });

    let scriptTsContent = "";
    const resultPreprocess = await sveltePreprocess(
      fileContent,
      // sveltePreprocess(),
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
    transformer.exec();
    return await this.#write(filename, await transformer.toString(), true);
  }

  /**
   *
   * @param {string} filename
   * @returns {Promise<string[]>}
   */
  async #readTypeScriptFile(filename) {
    const transformer = new TypescriptTransformer(filename, this.#dir);
    transformer.exec();
    return await this.#write(filename, await transformer.toString());
  }

  /**
   *
   * @param {string} filename
   * @param {string} content
   * @returns
   */
  async #write(filename, content, hasExtension = false) {
    // const pathParser = path.parse(filename);
    // Construct the output file name, should be end with `.d.ts`
    const outDir = path.join(
      this.#output,
      path.relative(this.#dir, path.dirname(filename))
    );
    let basename = path.basename(filename, path.extname(filename));
    if (hasExtension) {
      basename = path.basename(filename);
    }
    fs.mkdirSync(outDir, { recursive: true });
    const outputFile = path.join(outDir, `${basename}.d.ts`);
    if (!this.#overwrite && fs.existsSync(outputFile)) {
      return [];
    }
    fs.writeFileSync(outputFile, content);
    return [outputFile];
  }
}

export default DtsGenerator;
