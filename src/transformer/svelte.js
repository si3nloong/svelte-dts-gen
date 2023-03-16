import path from "node:path";
import { createEventDispatcher } from "svelte";
import * as ts from "typescript";
import { walk } from "svelte/compiler";
import { toPaskalCase } from "../util.js";
import packageJson from "../../package.json" assert { type: "json" };

const htmlElementMap = {
  a: "HTMLAnchorElement",
  abbr: "HTMLElement",
  address: "HTMLElement",
  area: "HTMLAreaElement",
  article: "HTMLElement",
  aside: "HTMLElement",
  audio: "HTMLAudioElement",
  b: "HTMLElement",
  base: "HTMLBaseElement",
  bdi: "HTMLElement",
  bdo: "HTMLElement",
  blockquote: "HTMLQuoteElement",
  body: "HTMLBodyElement",
  br: "HTMLBRElement",
  button: "HTMLButtonElement",
  canvas: "HTMLCanvasElement",
  caption: "HTMLTableCaptionElement",
  cite: "HTMLElement",
  code: "HTMLElement",
  col: "HTMLTableColElement",
  colgroup: "HTMLTableColElement",
  data: "HTMLDataElement",
  datalist: "HTMLDataListElement",
  dd: "HTMLElement",
  del: "HTMLModElement",
  details: "HTMLDetailsElement",
  dfn: "HTMLElement",
  dialog: "HTMLDialogElement",
  div: "HTMLDivElement",
  dl: "HTMLDListElement",
  dt: "HTMLElement",
  em: "HTMLElement",
  embed: "HTMLEmbedElement",
  fieldset: "HTMLFieldSetElement",
  figcaption: "HTMLElement",
  figure: "HTMLElement",
  footer: "HTMLElement",
  form: "HTMLFormElement",
  h1: "HTMLHeadingElement",
  h2: "HTMLHeadingElement",
  h3: "HTMLHeadingElement",
  h4: "HTMLHeadingElement",
  h5: "HTMLHeadingElement",
  h6: "HTMLHeadingElement",
  head: "HTMLHeadElement",
  header: "HTMLElement",
  hgroup: "HTMLElement",
  hr: "HTMLHRElement",
  html: "HTMLHtmlElement",
  i: "HTMLElement",
  iframe: "HTMLIFrameElement",
  img: "HTMLImageElement",
  input: "HTMLInputElement",
  ins: "HTMLModElement",
  kbd: "HTMLElement",
  label: "HTMLLabelElement",
  legend: "HTMLLegendElement",
  li: "HTMLLIElement",
  link: "HTMLLinkElement",
  main: "HTMLElement",
  map: "HTMLMapElement",
  mark: "HTMLElement",
  menu: "HTMLMenuElement",
  meta: "HTMLMetaElement",
  meter: "HTMLMeterElement",
  nav: "HTMLElement",
  noscript: "HTMLElement",
  object: "HTMLObjectElement",
  ol: "HTMLOListElement",
  optgroup: "HTMLOptGroupElement",
  option: "HTMLOptionElement",
  output: "HTMLOutputElement",
  p: "HTMLParagraphElement",
  picture: "HTMLPictureElement",
  pre: "HTMLPreElement",
  progress: "HTMLProgressElement",
  q: "HTMLQuoteElement",
  rp: "HTMLElement",
  rt: "HTMLElement",
  ruby: "HTMLElement",
  s: "HTMLElement",
  samp: "HTMLElement",
  script: "HTMLScriptElement",
  section: "HTMLElement",
  select: "HTMLSelectElement",
  slot: "HTMLSlotElement",
  small: "HTMLElement",
  source: "HTMLSourceElement",
  span: "HTMLSpanElement",
  strong: "HTMLElement",
  style: "HTMLStyleElement",
  sub: "HTMLElement",
  summary: "HTMLElement",
  sup: "HTMLElement",
  table: "HTMLTableElement",
  tbody: "HTMLTableSectionElement",
  td: "HTMLTableCellElement",
  template: "HTMLTemplateElement",
  textarea: "HTMLTextAreaElement",
  tfoot: "HTMLTableSectionElement",
  th: "HTMLTableCellElement",
  thead: "HTMLTableSectionElement",
  time: "HTMLTimeElement",
  title: "HTMLTitleElement",
  tr: "HTMLTableRowElement",
  track: "HTMLTrackElement",
  u: "HTMLElement",
  ul: "HTMLUListElement",
  var: "HTMLElement",
  video: "HTMLVideoElement",
  wbr: "HTMLElement",
};

class SvelteTransformer {
  /**
   * @type {ts.sourceFile}
   */
  #sourceFile;

  /**
   * Input file directory
   * @type {string}
   */
  #dir;

  /**
   * Svelte file name
   * @type {string}
   */
  #fileName;

  /**
   * Svelte dts component name
   * @type {string}
   */
  #componentName;

  /** @type {?string} */
  #moduleName;

  /** @type {import("svelte/types/compiler/interfaces").Ast} */
  #ast;

  /** @type {{ name: string; type: string; isOptional: boolean }[]} */
  #props;

  /** @type {Map<string, { name: string; type: string; custom: boolean }[]>} */
  #events;

  /** @type {Map<string, { name: string }[]>} */
  #slots;

  /** @type {ts.ImportDeclaration[]} */
  #typesForSearch;

  /** @type {string[]} */
  #customEventsForSearch;

  /**
   * @type {boolean}
   */
  #isDefault;

  /**
   * @type {string[]}
   */
  #restProps;

  /** @type {string[]} */
  #declarationNodes;

  /** @type {string[]} */
  #declarationImports;

  /**
   *
   * @param {string} content
   * @param {import("svelte/types/compiler/interfaces").Ast} ast
   * @param {string} dir
   * @param {string} fileName
   * @param {string} moduleName
   * @param {boolean} isDefault
   */
  constructor(content, ast, dir, fileName, moduleName, isDefault) {
    this.#sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    this.#fileName = fileName;
    this.#componentName = toPaskalCase(
      path.basename(this.#fileName, path.extname(fileName))
    );
    this.#ast = ast;
    this.#props = [];
    this.#events = new Map();
    this.#slots = new Map();
    this.#dir = dir;
    this.#customEventsForSearch = [];
    this.#typesForSearch = [];
    this.#moduleName = moduleName;
    this.#isDefault = isDefault;
    this.#restProps = [];
    this.#declarationNodes = [];
    this.#declarationImports = [];
  }

  /**
   *
   * @param {ts.VariableStatement} node
   * @returns {boolean}
   */
  #isExportModifier = (node) => {
    if (node.modifiers) {
      return node.modifiers.some(
        (node) => node.kind === ts.SyntaxKind.ExportKeyword
      );
    }

    return false;
  };

  /**
   *
   * @param {ts.VariableStatement} node
   * @returns {boolean}
   */
  #isEventDispatcher = (node) => {
    return node.declarationList.declarations.some(
      (item) =>
        ts.isVariableDeclaration(item) &&
        item.initializer &&
        ts.isCallExpression(item.initializer) &&
        item.initializer.expression.getText(this.#sourceFile) ===
          createEventDispatcher.name
    );
  };

  /**
   *
   * @param {ts.TypeReferenceNode} newType
   */
  #addTypeForSearch(newType) {
    const includeType = this.#typesForSearch.some(
      (item) =>
        item.getText(this.#sourceFile) === newType.getText(this.#sourceFile)
    );

    if (!includeType || this.#typesForSearch.length === 0) {
      this.#typesForSearch.push(newType);
    }
  }

  /**
   *
   * @param {ts.ImportDeclaration} node
   * @param {string} name
   */
  #verifyImportDeclaration(node, name) {
    if (
      node.importClause &&
      node.importClause.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const elements = node.importClause.namedBindings.elements;
      const newElements = elements.filter(
        (element) => element.name.getText(this.#sourceFile) === name
      );

      if (newElements.length > 0) {
        const importString = newElements
          .map((item) => item.name.getText(this.#sourceFile))
          .join(", ");

        this.#declarationImports.push(
          `import type { ${importString} } from ${node.moduleSpecifier.getText(
            this.#sourceFile
          )};`
        );
      }
    }
  }

  /**
   *
   * @param {ts.VariableStatement} node
   * @returns {void}
   */
  #compileProperty(node) {
    /*
    Type should be infer from the priority below:
    1. TypeScript type
    2. JS value type
    3. JSDoc @type
    */

    let type = "any";
    const jsDoc = ts.getJSDocType(node);
    if (jsDoc) {
      type = getSyntaxKindString(jsDoc.kind);
    }

    let readOnly = false;
    if (node.declarationList.flags == ts.NodeFlags.Const) {
      readOnly = true;
    }

    node.declarationList.declarations.forEach((declaration) => {
      const name = declaration.name.getText(this.#sourceFile);

      let isOptional = false;
      if (declaration.type) {
        type = declaration.type.getText(this.#sourceFile);

        if (ts.isTypeReferenceNode(declaration.type)) {
          // console.log(declaration.type);
          console.log(declaration.getText(this.#sourceFile));
          this.#addTypeForSearch(declaration.type);
        }

        if (ts.isUnionTypeNode(declaration.type)) {
          const nameValidTypes = declaration.type.types.reduce((acc, type) => {
            const typeForCheck = ts.isLiteralTypeNode(type)
              ? type.literal
              : type;

            if (
              typeForCheck.kind === ts.SyntaxKind.NullKeyword ||
              typeForCheck.kind === ts.SyntaxKind.UndefinedKeyword
            ) {
              isOptional = true;
              return acc;
            }

            return [...acc, type.getText(this.#sourceFile)];
          }, []);

          type = nameValidTypes.join(" | ");
        }
      } else if (declaration.initializer) {
        isOptional = true;
        // If it's a template literal, it's always string
        if (ts.isTemplateLiteral(declaration.initializer)) {
          type = "string";
        } else {
          switch (declaration.initializer.kind) {
            case ts.SyntaxKind.StringLiteral:
              type = "string";
              break;
            case ts.SyntaxKind.FalseKeyword:
            case ts.SyntaxKind.TrueKeyword:
              type = "boolean";
              break;
          }
        }
      }

      this.#props.push({ name, type, isOptional, readOnly });
    });
  }

  /**
   * Compile svelte event dispatcher node.
   * @param {ts.VariableStatement} node
   * @returns {void}
   */
  async #compileEventDispatcher(node) {
    node.declarationList.declarations.forEach((declaration) => {
      if (
        declaration.initializer &&
        ts.isCallExpression(declaration.initializer) &&
        declaration.initializer.typeArguments
      ) {
        declaration.initializer.typeArguments.forEach((arg) => {
          // console.log(ts.isTypeLiteralNode(arg), arg);
          if (ts.isTypeLiteralNode(arg)) {
            arg.members.forEach((member) => {
              if (ts.isPropertySignature(member)) {
                const name = member.name.getText(this.#sourceFile);
                const type = member.type?.getText(this.#sourceFile) || "any";
                if (member.type && ts.isTypeReferenceNode(member.type)) {
                  this.#addTypeForSearch(member.type);
                }
                this.#events.set(name, { type, custom: true });
              }
            });
          }
        });
      } else {
        // If data type is not declared, we will put it to cache and process it later
        this.#customEventsForSearch.push(
          declaration.name.getText(this.#sourceFile)
        );
      }
    });
  }

  /**
   * Compile typescript expiression node.
   * @param {ts.ExpressionStatement} node
   * @returns {void}
   */
  #compileExpression(node) {
    if (ts.isCallExpression(node.expression)) {
      if (node.expression.arguments.length <= 0) {
        return;
      }

      // Event name must be string or identifier or template
      const event = node.expression.arguments[0];
      if (
        !(
          ts.isStringLiteral(event) ||
          ts.isIdentifier(event) ||
          ts.isTemplateExpression(event)
        )
      ) {
        return;
      }

      this.#events.set(event.getText(this.#sourceFile).replaceAll(`"`, ""), {
        custom: true,
      });
    }
  }

  /**
   * Compile svelte event node.
   * @param {import("svelte/types/compiler/interfaces").Attribute} node
   * @returns {void}
   */
  #compileEvent(node) {
    if (node.expression) return;
    // If event forwarding, we should push it
    this.#events.set(node.name, {});
  }

  /**
   * Compile svelte slot node.
   * @param {import("svelte/types/compiler/interfaces").Element} node
   * @returns {void}
   */
  #compileSlot(node) {
    const name = node.attributes.find((v) => v.name === "name");
    if (!name) {
      this.#slots.set("default", { name: "" });
      return;
    }

    this.#slots.set(`${name.value[0].raw}`, {});
  }

  /**
   * @returns {void}
   */
  #exec() {
    ts.forEachChild(this.#sourceFile, (node) => {
      if (
        node.importClause &&
        ts.isImportDeclaration(node) &&
        node.importClause.isTypeOnly
      ) {
        this.#declarationNodes.push(node);
      }

      if (ts.isVariableStatement(node)) {
        if (this.#isExportModifier(node)) {
          this.#compileProperty(node);
        } else if (this.#isEventDispatcher(node)) {
          this.#compileEventDispatcher(node);
        }
      } else if (
        this.#customEventsForSearch.length > 0 &&
        ts.isExpressionStatement(node)
      ) {
        this.#compileExpression(node);
      }
    });

    this.#typesForSearch.forEach((search) => {
      this.#declarationNodes.forEach((node) => {
        this.#verifyImportDeclaration(node, search.getText(this.#sourceFile));
      });
    });

    walk(this.#ast.html, {
      /**
       * @param {import("svelte/types/compiler/interfaces").TemplateNode} node
       * @param {Optional<import("svelte/types/compiler/interfaces").TemplateNode>} parent
       */
      enter: (node, parent) => {
        if (node.type === "EventHandler") {
          this.#compileEvent(node);
        }
        if (node.type === "Slot") {
          this.#compileSlot(node);
        }
        if (node.type === "Element") {
          /** @type {import("svelte/types/compiler/interfaces").Element} */
          let n = node;
          if (
            n.attributes.some(
              (attr) =>
                attr.type === "Spread" && attr.expression.name === "$$restProps"
            )
          ) {
            this.#restProps.push(node.name);
          }
        }
      },
    });
    // }

    // if (node.children) {
    //   node.children.forEach((item) => this.execSlotProperty(item));
    // }
  }

  /**
   *
   * @returns {Promise<string>}
   */
  async toString() {
    this.#exec();
    let template = `// Code generated by ${packageJson.name}, version ${packageJson.version}. DO NOT EDIT.`;
    template += `\n\nimport type { SvelteComponentTyped } from "svelte/internal";`;

    if (this.#declarationImports.length > 0) {
      this.#declarationImports.forEach((declaration) => {
        template += `\n${declaration}`;
      });
    }

    // Write properties
    template += `\n\nexport interface ${this.#componentName}Props `;
    if (this.#restProps.length > 0) {
      template += `extends ${
        this.#restProps[0] in htmlElementMap
          ? htmlElementMap[this.#restProps[0]]
          : "HTMLElement"
      } `;
    } else if (this.#restProps.length > 1) {
      template += `extends HTMLElement `;
    }
    template += "{";
    if (this.#props.length > 0) {
      this.#props
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((prop) => {
          let propName = prop.name;
          let propType = prop.type;
          if (prop.isOptional) {
            propName += "?";
          }
          if (prop.readOnly) {
            propType = `Readonly<${propType}>`;
          }
          template += `\n\t${propName}: ${propType};`;
        });
      template += "\n";
    }
    template += `}`;

    // Write events
    template += `\n\nexport interface ${this.#componentName}Events {`;
    if (this.#events.size > 0) {
      Array.from(this.#events.keys())
        .sort()
        .forEach((k) => {
          const event = this.#events.get(k);
          if (event.custom) {
            template += `\n\t${k}?: CustomEvent<${
              event.type ? event.type : "any"
            }>;`;
          } else {
            template += `\n\t${k}?: WindowEventMap["${k}"];`;
          }
        });
      template += "\n";
    }
    template += `}`;

    // Write slots
    template += `\n\nexport interface ${this.#componentName}Slots {`;
    if (this.#slots.size > 0) {
      Array.from(this.#slots.keys())
        .sort()
        .forEach((k) => {
          template += `\n\t${k}: never;`;
        });
      template += "\n";
    }
    template += `}`;

    template += `\n\ndeclare class ${
      this.#componentName
    } extends SvelteComponentTyped<${this.#componentName}Props, ${
      this.#componentName
    }Events, ${this.#componentName}Slots> {`;
    template += `\n}`;
    template += `\nexport default ${this.#componentName};`;
    return template;
  }

  destructor() {
    this.#sourceFile = null;
    this.#ast = null;
    this.#dir = "";
    this.#props = [];
    this.#events = null;
    this.#slots = null;
    this.#typesForSearch = [];
    this.#customEventsForSearch = [];
    this.#declarationImports = [];
  }
}

/**
 *
 * @param {ts.SyntaxKind} kind
 * @param {ts.TypeNode} node
 * @returns {string}
 */
function getSyntaxKindString(kind, node) {
  switch (kind) {
    case ts.SyntaxKind.StringKeyword:
      return "string";
    case ts.SyntaxKind.BooleanKeyword:
      return "boolean";
    case ts.SyntaxKind.NumberKeyword:
      return "number";
    case ts.SyntaxKind.ArrayType:
      return "[]";
    // Add other cases as needed
    default:
      return ts.SyntaxKind[kind];
  }
}

export default SvelteTransformer;
