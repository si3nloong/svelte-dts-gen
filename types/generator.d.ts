export default DtsGenerator;
declare class DtsGenerator {
    /**
     *
     * @param {string} input
     * @param {defaultOpts} options
     */
    constructor(input: string, options: {
        outDir: string;
        compact: boolean;
        force: boolean;
    });
    /**
     * @returns {Promise<void>}
     */
    readAll(): Promise<void>;
    write(): Promise<void>;
    #private;
}
