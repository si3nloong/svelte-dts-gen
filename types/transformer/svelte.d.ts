export default SvelteTransformer;
declare class SvelteTransformer {
    /**
     *
     * @param {string} content
     * @param {string} fileName
     * @param {import("svelte/types/compiler/interfaces").Ast} ast
     * @param {string} dir
     * @param {string} moduleName
     * @param {boolean} isDefault
     */
    constructor(content: string, fileName: string, ast: any, dir: string, moduleName: string, isDefault: boolean);
    /** @type {Promise<string>} */
    toString(): Promise<string>;
    #private;
}
