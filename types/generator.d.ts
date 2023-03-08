export default DtsGenerator;
declare class DtsGenerator {
    /**
     *
     * @param {string} input
     * @param {*} options
     */
    constructor(input: string, options: any);
    /**
     * @returns {Promise<void>}
     */
    readAll(): Promise<void>;
    write(): Promise<void>;
    #private;
}
