import "dotenv/config";
import puppeteer from "puppeteer";
import { scrapeSection } from "./utils/scrape";
import { writeToCSV } from "./utils/write";

const name = process.env.TARGET_NAME;
if (!name) throw new Error("TARGET_NAME is not defined in .env file.");

const url = process.env.TARGET_START_URL;
if (!url) throw new Error("TARGET_START_URL is not defined in .env file.");

(async () => {
  // Open browser.
  const browser = await puppeteer.launch({ headless: true });

  // Compile list page.
  const [articles, keys] = await scrapeSection(browser, url);

  // Write data to CSV.
  await writeToCSV(name.replace(" ", "-").toLowerCase(), articles, keys);

  // Close browser.
  await browser.close();
})();
