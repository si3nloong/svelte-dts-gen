import path from "node:path";
import { createEventDispatcher } from "svelte";
import ts from "typescript";
import { walk } from "svelte/compiler";
import { toPaskalCase } from "../util.js";

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

  /** @type {string[]} */
  #typesForSearch;

  /** @type {string[]} */
  #customEventsForSearch;

  /**
   * @type {boolean}
   */
  #isDefault;

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
      ts.ScriptTarget.Latest
    );
    this.#fileName = fileName;
    this.#componentName = toPaskalCase(
      fileName.replace(path.extname(fileName), "")
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
        (node /** @type {ts.Node} */) =>
          node.kind === ts.SyntaxKind.ExportKeyword
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
    const includeType = this.#typesForSearch.map(
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
        (element) => element.name.getText(this.sourceFile) === name
      );

      if (newElements.length > 0) {
        const importString = newElements
          .map((item) => item.name.getText(this.#sourceFile))
          .join(", ");

        this.declarationImport.push(
          `import { ${importString} } from ${node.moduleSpecifier.getText(
            this.sourceFile
          )};`
        );
      }
    }
  }

  /**
   *
   * @param {ts.VariableStatement} node
   */
  #compileProperty(node) {
    if (node.jsDoc) {
      // /** @type {ts.JsDoc[]} */
      // node.jsDoc.forEach((jsDoc /** @type {ts.JsDoc} */) => {
      //   console.log(jsDoc.comment);
      // });
    }
    // console.log("Kind ->", node.kind);
    // console.log("JsDoc ->", node.jsDoc);
    let readOnly = false;
    if (node.declarationList.flags == ts.NodeFlags.Const) {
      readOnly = true;
    }

    node.declarationList.declarations.forEach((declaration) => {
      const name = declaration.name.getText(this.#sourceFile);

      let type = "any",
        isOptional = false;

      console.log(declaration);

      if (declaration.type) {
        type = declaration.type.getText(this.#sourceFile);

        if (ts.isTypeReferenceNode(declaration.type)) {
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
        console.log(declaration.initializer);
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
   *
   * @param {ts.VariableStatement} node
   */
  async #compileEventDispatcher(node) {
    node.declarationList.declarations.forEach((declaration) => {
      if (
        declaration.initializer &&
        ts.isCallExpression(declaration.initializer) &&
        declaration.initializer.typeArguments
      ) {
        declaration.initializer.typeArguments.forEach((arg) => {
          console.log(ts.isTypeLiteralNode(arg), arg);
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
   *
   * @param {ts.ExpressionStatement} node
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
   *
   * @param {import("svelte/types/compiler/interfaces").Attribute} node
   */
  #compileEvent(node) {
    if (node.expression) return;
    // If event forwarding, we should push it
    this.#events.set(node.name, {});
  }

  /**
   *
   * @param {import("svelte/types/compiler/interfaces").Element} node
   */
  #compileSlot(node) {
    const name = node.attributes.find((v) => v.name === "name");
    if (!name) {
      this.#slots.set("default", { name: "" });
      return;
    }

    this.#slots.set(`${name.value[0].raw}`, {});
  }

  #exec() {
    ts.forEachChild(this.#sourceFile, (node) => {
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

    this.#typesForSearch.forEach((item) => {
      // console.log(item);
    });

    walk(this.#ast.html, {
      /**
       *
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
        // console.log(node.type, node.type === "EventHandler");
        // console.log("Node ->", node);
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
    const cli = "svelte-dts-gen";
    const version = "1.0.0";
    let template = `//\tCode generated by ${cli}, version ${version}. DO NOT EDIT.`;
    // template += `\n//\tsource: ${this.#fileName}`;
    template += `\n\nimport type { SvelteComponentTyped } from "svelte/internal";`;

    // Write properties
    template += `\n\nexport interface ${this.#componentName}Props {`;
    if (this.#props.length > 0) {
      this.#props.forEach((prop) => {
        template += `\n\t${prop.name}${prop.isOptional ? "?" : ""}: ${
          prop.readOnly ? `Readonly<${prop.type}>` : prop.type
        };`;
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

export default SvelteTransformer;
