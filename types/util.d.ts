/**
 * Enhance version of `fs.readdirSync` by walk recursively.
 *
 * @param {string} dir
 * @returns {Generator<string, void, unknown>}
 */
export function walkSync(dir: string): Generator<string, void, unknown>;
/**
 * Convert string to PaskalCase.
 *
 * @param {string} str
 * @returns {string}
 */
export function toPaskalCase(str: string): string;
