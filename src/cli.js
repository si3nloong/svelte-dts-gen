import { program } from "commander";
import DtsGenerator from "./generator.js";

program.option("--first").option("-s, --separator <char>");

program.parse();

const options = program.opts();
const limit = options.first ? 1 : undefined;
console.log(options);

const generator = new DtsGenerator(
  "./tests/201-createEventDispatcher/*.svelte",
  options
);
generator.readAll();
