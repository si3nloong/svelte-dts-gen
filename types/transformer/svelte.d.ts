export default SvelteTransformer;
declare class SvelteTransformer {
    /**
     *
     * @param {string} content
     * @param {import("svelte/types/compiler/interfaces").Ast} ast
     * @param {string} dir
     * @param {string} fileName
     * @param {string} moduleName
     * @param {boolean} isDefault
     */
    constructor(content: string, ast: any, dir: string, fileName: string, moduleName: string, isDefault: boolean);
    /**
     *
     * @returns {Promise<string>}
     */
    toString(): Promise<string>;
    destructor(): void;
    #private;
}
