import fs from "fs";
import Papa from "papaparse";
import { Article } from "../types";

export async function writeToCSV(
  name: string,
  articles: Article[],
  keys: string[]
) {
  const data = Papa.unparse(articles, {
    quotes: true,
    columns: keys,
  });

  await fs.writeFile(`out/${name}.csv`, data, "utf-8", () => {});
}
