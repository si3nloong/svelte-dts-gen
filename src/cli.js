import { Command, Option } from "commander";
import DtsGenerator from "./generator.js";

(async function () {
  const program = new Command();

  program
    .name("svelte-dts-gen")
    .description("CLI to generate svelte dts files")
    .version("1.0.0");

  program
    .argument("<src>", "source")
    .addOption(new Option("--outDir <output>", "output directory"))
    .addOption(
      new Option("--compact", "output the definition file in compact mode")
    )
    .addOption(
      new Option("-f --force", "force overwrite output file if it exists")
    );

  program.parse(process.argv);

  const options = program.opts();
  console.log("Arguments ->", program.args);
  console.log("Options ->", options);

  const generator = new DtsGenerator(program.args[0], options);
  await generator.readAll();
})();
