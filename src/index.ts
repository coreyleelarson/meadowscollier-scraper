import "dotenv/config";
import fs from "fs";
import puppeteer from "puppeteer";
import { scrapeSection } from "./utils/scrape";
import { writeToCSV } from "./utils/write";
import { downloadFiles, isFileUrl } from "./utils/file";
import { config } from "./config";

(async () => {
  // Create output directory if it doesn't exist.
  if (!fs.existsSync(config.targetDir))
    await fs.mkdir(config.targetDir, () => {});

  // Open browser.
  const browser = await puppeteer.launch({ headless: true });

  // Compile list page.
  const [articles, keys] = await scrapeSection(browser, config.url);

  // Write data to CSV.
  await writeToCSV(articles, keys);

  // Close browser.
  await browser.close();

  // Collect all file urls to download.
  const fileUrls = articles.reduce<string[]>((acc, article) => {
    if (article.url && isFileUrl(article.url)) {
      return [...acc, article.url];
    }
    return acc;
  }, []);

  // Download all files.
  await downloadFiles(fileUrls);
})();
