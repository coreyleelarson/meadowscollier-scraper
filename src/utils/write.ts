import fs from "fs";
import Papa from "papaparse";
import { config } from "../config";
import { Article } from "../types";

export async function writeToCSV(articles: Article[], keys: string[]) {
  const data = Papa.unparse(articles, {
    quotes: true,
    columns: keys,
  });

  const targetDir = `${config.targetDir}/${config.name}`;

  // Create the target directory if it doesn't exist.
  if (!fs.existsSync(targetDir)) await fs.mkdir(targetDir, () => {});

  // Write the CSV file.
  await fs.writeFile(
    `${targetDir}/${config.name}.csv`,
    data,
    "utf-8",
    () => {}
  );
}
