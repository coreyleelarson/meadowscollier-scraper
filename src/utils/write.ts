import fs from "fs";
import Papa from "papaparse";
import { Article } from "../types";

export async function writeToCSV(name: string, articles: Article[]) {
  const data = Papa.unparse(articles, {
    quotes: true,
    columns: [
      "date",
      "title",
      "summary",
      "content",
      "author1",
      "author2",
      "author3",
      "relatedAttorney1",
      "relatedAttorney2",
      "relatedAttorney3",
    ],
  });
  await fs.writeFile(`out/${name}.csv`, data, "utf-8", () => {});
}
