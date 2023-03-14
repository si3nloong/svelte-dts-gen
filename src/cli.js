import { Command, Option } from "commander";
import DtsGenerator from "./generator.js";

const program = new Command();

program
  .name("svelte-dtsgen")
  .description("CLI to generate svelte dts files")
  .version("1.0.0");

program
  .argument("<src>", "source")
  .addOption(new Option("-s, --outDir", "output directory"));

program.parse(process.argv);

const options = program.opts();
console.log("Arguments ->", program.args);
// const limit = options.first ? 1 : undefined;
console.log("Options ->", options);

const generator = new DtsGenerator(
  "./test/cases/201-createEventDispatcher/*.svelte",
  options
);
generator.readAll();
