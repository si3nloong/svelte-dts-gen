import { Command, Option } from "commander";
import DtsGenerator from "./generator.js";
import packageJson from "../package.json" assert { type: "json" };

(async function () {
  const program = new Command();

  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version);

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

  try {
    /** @type {{ default: { types: string }}} */
    const { default: pkg } = await import(
      path.join(process.cwd(), "package.json"),
      {
        assert: { type: "json" },
      }
    );
    console.log(pkg);
  } catch (e) {}
  console.log("Arguments ->", program.args);
  console.log("Options ->", options);

  const dtsgen = new DtsGenerator(program.args[0], options);
  await dtsgen.run();
})();
