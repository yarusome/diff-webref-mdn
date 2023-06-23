import * as output from "./diff.js";
import * as fs from "node:fs/promises";
import * as utils from "./utils.js";

await fs.mkdir("./build/");

for (const key in output) {
  const obj = output[key];
  if (!utils.isEmpty(obj)) {
    await fs.writeFile(
      `./build/${
        key.replace(/(?=\p{CWL})/gu, "-")
          .toLowerCase()
        }.json`,
      JSON.stringify(obj, null, 2)
    );
  }
}

console.info("Outputs stored in JSON files.");
