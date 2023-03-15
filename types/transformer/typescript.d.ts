export default TypescriptTransformer;
declare class TypescriptTransformer {
    /**
     *
     * @param {string} fileName
     * @param {string} dir
     * @param {string} moduleName
     * @param {boolean} isDefault
     */
    constructor(fileName: string, dir: string, moduleName: string, isDefault: boolean);
    /**
     * @returns {string}
     */
    toString(): string;
    /**
     * @returns {void}
     */
    destructor(): void;
    #private;
}
