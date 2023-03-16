import path from "node:path";
// import { promises as fs } from "node:fs";
import ts from "typescript";

class TypescriptTransformer {
  /** @type {string} */
  #dir;

  /** @type {string} */
  #fileName;

  /** @type {string} */
  #moduleName;

  /** @type {boolean} */
  #isDefault;

  /** @type {string} */
  #declaration;

  /**
   *
   * @param {string} fileName
   * @param {string} dir
   * @param {string} moduleName
   * @param {boolean} isDefault
   */
  constructor(fileName, dir, moduleName, isDefault) {
    this.#fileName = fileName;
    this.#dir = dir;
    //   this.subdir = path.dirname(this.fileName).replace(this.dir, '');
    this.#moduleName = moduleName;
    this.#isDefault = isDefault;
    this.#declaration = "";
  }

  /**
   * @returns {void}
   */
  exec() {
    /** @type {ts.CompilerOptions} */
    const options = {
      declaration: true,
      emitDeclarationOnly: true,
      allowJs: true,
    };
    const host = ts.createCompilerHost(options);
    host.writeFile = (_, contents) => {
      this.#declaration = contents;
    };
    const program = ts.createProgram([this.#fileName], options, host);
    program.emit();
  }

  /**
   * @returns {string}
   */
  toString() {
    // const pathParse = path.parse(this.#fileName);
    let string = ``;
    //   if (this.isDefault) {
    //     string = `declare module '${this.moduleName}' {\n`;
    //   }
    string += this.#declaration;
    //     .replace(/declare /g, '')
    //     .split('\n')
    //     .map((item) => (item !== '' ? `\t${item}` : undefined))
    //     .filter((item) => !!item)
    //     .join('\n');
    //   string += `\n}\n\n`;
    return string;
  }

  // async appendFile(path: string): Promise<void> {
  //   this.exec();
  //   await fs.appendFile(path, this.toString());
  // }

  /**
   * @returns {void}
   */
  destructor() {
    this.#dir = "";
    this.#fileName = "";
    this.#moduleName = "";
    this.#declaration = "";
  }
}

export default TypescriptTransformer;
