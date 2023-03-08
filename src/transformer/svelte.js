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
   * Svelte file name
   *
   * @type {string}
   */
  #fileName;

  /**
   *
   */
  #componentName;

  /** @type {string} */
  #dir;

  /** @type {string} */
  #moduleName;

  /** @type {import("svelte/types/compiler/interfaces").Ast} */
  #ast;

  /** @type {{ name: string; type: string; isOptional: boolean }[]} */
  #props;

  /** @type {{ name: string; custom: boolean; }[]} */
  #events;

  /** @type {{ name: string; type: string; }[]} */
  #slotProps;

  /**
   * @type {boolean}
   */
  #isDefault;

  /** @type {string[]} */
  #typesForSearch;

  /** @type {string[]} */
  #declarationImports;

  /**
   *
   * @param {string} content
   * @param {string} fileName
   * @param {import("svelte/types/compiler/interfaces").Ast} ast
   * @param {string} dir
   * @param {string} moduleName
   * @param {boolean} isDefault
   */
  constructor(content, fileName, ast, dir, moduleName, isDefault) {
    this.#sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest
    );
    this.#fileName = path.basename(fileName);
    this.#componentName = toPaskalCase(path.basename(fileName));
    this.#ast = ast;
    this.#props = [];
    this.#events = [];
    this.#slotProps = [];
    this.#dir = dir;
    // this.subdir = path.dirname(this.fileName).replace(this.dir, "");
    this.#moduleName = moduleName;
    this.#isDefault = isDefault;
    this.#typesForSearch = [];
    // this.declarationNode = [];
    this.#declarationImports = [];
    console.log("Filename ->", this.#fileName);
    console.log("ModuleName ->", this.#moduleName);
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

      console.log("Declaration ->");
      let type = "any";
      let isOptional = false;

      console.log(declaration.flags, ts.NodeFlags.Const);

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
        switch (declaration.initializer.kind) {
          case ts.SyntaxKind.StringLiteral:
            type = "string";
            break;
          case ts.SyntaxKind.FalseKeyword:
          case ts.SyntaxKind.TrueKeyword:
            type = "boolean";
            break;
        }
        // console.log("Kind ->", declaration.initializer.kind);
      }

      this.#props.push({ name, type, isOptional, readOnly });
    });
  }

  /**
   *
   * @param {ts.VariableStatement} node
   */
  async #compileEvent(node) {
    console.log("EventNode ->", node);
    node.declarationList.declarations.forEach((declaration) => {
      console.log(declaration);
      if (
        declaration.initializer &&
        ts.isCallExpression(declaration.initializer) &&
        declaration.initializer.typeArguments
      ) {
        declaration.initializer.typeArguments.forEach((item) => {
          if (ts.isTypeLiteralNode(item)) {
            item.members.forEach((member) => {
              if (ts.isPropertySignature(member)) {
                const name = member.name.getText(this.sourceFile);
                const type = member.type?.getText(this.sourceFile) || "any";

                if (member.type && ts.isTypeReferenceNode(member.type)) {
                  this.#addTypeForSearch(member.type);
                }

                this.events.push({ name, type });
              }
            });
          }
        });
      }
    });
  }

  #exec() {
    ts.forEachChild(this.#sourceFile, (node /** @type {ts.Node} */) => {
      if (ts.isVariableStatement(node)) {
        // console.log("Node ->", this.#isExportModifier(node), node);
        if (this.#isExportModifier(node)) {
          this.#compileProperty(node);
        } else if (this.#isEventDispatcher(node)) {
          console.log("isEventDispatcher!");
          this.#compileEvent(node);
        }
      }
    });

    this.#typesForSearch.forEach((item) => {
      console.log(item);
    });
    // ts.SyntaxKind[0];
    // console.log(this.#ast.html);

    // if (this.#ast.html.type === "Slot" && node.attributes) {
    //   node.attributes.forEach((item) =>
    //     this.slotProps.push({ name: item.name, type: "any" })
    //   );

    console.log("debug --------------->");
    walk(this.#ast.html, {
      /**
       *
       * @param {import("svelte/types/compiler/interfaces").TemplateNode} node
       * @param {Optional<import("svelte/types/compiler/interfaces").TemplateNode>} parent
       */
      enter: (node, parent) => {
        if (node.type === "EventHandler") {
          console.log(node);
          console.log(node.name);
          if (node.expression) {
            return;
          }
          // If event forwarding, we should push it
          this.#events.push({ name: node.name });
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

  /** @type {Promise<string>} */
  async toString() {
    this.#exec();
    console.log("Properties ->", this.#props);
    const cli = "svelte-dtsgen";
    const version = "1.0.0";
    let template = `//\tCode generated by ${cli}, version ${version}. DO NOT EDIT.`;
    template += `\n//\tsource: ${this.#fileName}`;
    template += `\n\nimport type { SvelteComponentTyped } from "svelte/internal";`;

    // Write properties
    template += `\n\nexport interface ${this.#componentName}Props {`;
    if (this.#props.length > 0) {
      this.#props.forEach((prop) => {
        const propName = prop.isOptional ? `?` + prop.type : prop.type;
        template += `\n\t${prop.name}: ${
          prop.readOnly ? `Readonly<${propName}>` : propName
        };`;
      });
      template += "\n";
    }
    template += `}`;

    // Write events
    template += `\n\nexport interface ${this.#componentName}Events {`;
    if (this.#events.length > 0) {
      this.#events.forEach((event) => {
        template += `\n\t${event.name}?: WindowEventMap["${event.name}"];`;
      });
      template += "\n";
    }
    template += `}`;

    // Write slots
    template += `\n\nexport interface ${this.#componentName}Slots {`;
    this.#slotProps.forEach((prop) => {
      const propName = prop.isOptional ? `?` + prop.type : prop.type;
      template += `\n\t${prop.name}: ${
        prop.readOnly ? `Readonly<${propName}>` : propName
      };`;
    });
    template += `}`;

    template += `\n\ndeclare class ${
      this.#componentName
    }Component extends SvelteComponentTyped<${this.#componentName}Props, ${
      this.#componentName
    }Events, ${this.#componentName}Slots> {`;
    template += `\n}`;
    template += `\nexport default ${this.#componentName}Component;`;
    return template;
  }
}

export default SvelteTransformer;
