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
     * @param {Optional<{ each: (v: { output: string[] }) => void }>} opts
     * @returns {Promise<void>}
     */
    run(opts: Optional<{
        each: (v: {
            output: string[];
        }) => void;
    }>): Promise<void>;
    write(): Promise<void>;
    #private;
}
