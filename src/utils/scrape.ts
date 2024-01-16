import ora from "ora";
import type { Browser } from "puppeteer";
import { Article } from "../types";
import { isFileUrl } from "./file";

export async function scrapeSection(
  browser: Browser,
  url: string
): Promise<[Article[], string[]]> {
  const spinner = ora("Scraping pages.").start();

  // Open page.
  const listPage = await browser.newPage();
  await listPage.goto(url);

  const articles: Article[] = [];
  const keys = new Set<string>();

  let count = 0;
  let shouldRun = true;

  while (shouldRun) {
    await listPage.waitForSelector(".pagination-fld");
    spinner.text = `Scraping page ${++count}.`;

    // Grab all article previews.
    const previews = await listPage.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll(".news-block"));
      const data = blocks.map((block) => {
        // Get article date.
        const dateParts = block
          .querySelector(".about-post")
          ?.textContent?.split(" on ");
        const date = dateParts?.[dateParts.length - 1];

        // Get summary.
        const summary =
          (
            block.querySelector("p")?.textContent ||
            block.querySelector("h3")?.textContent
          )
            ?.replace(/&nbsp;/g, " ")
            .replace(/\n/g, "")
            .replace(/\s+/g, " ")
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .split(" [ read ]")[0]
            .trim() || "";

        // Get URL.
        const url = block.querySelector<HTMLAnchorElement>(".read-more")?.href;

        return {
          ...(!!date && { date }),
          ...(!!summary && { summary }),
          ...(!!url && { url }),
        };
      });

      return data;
    });

    // For each article preview, open the article page and scrape the content.
    const currentArticles = await Promise.all(
      previews.map((preview) => scrapeArticle(browser, preview))
    );

    currentArticles.forEach((article) => {
      articles.push(article[0]);
      article[1].forEach((key) => keys.add(key));
    });

    if (await listPage.$(".nextpostslink")) {
      // Click next page button.
      await listPage.click(".nextpostslink");
    } else {
      // Ensure loop ends.
      shouldRun = false;
    }
  }

  spinner.succeed(`Scraped ${articles.length} articles.`);

  // Return all scraped articles.
  return [articles, Array.from(keys)];
}

export async function scrapeArticle(
  browser: Browser,
  preview: Article
): Promise<[Article, string[]]> {
  if (preview.content || !preview.url) return [preview, Object.keys(preview)];

  let article: Article = { ...preview };

  if (!isFileUrl(preview.url)) {
    try {
      // Open article page.
      const articlePage = await browser.newPage();
      await articlePage.goto(preview.url, { waitUntil: "domcontentloaded" });
      await articlePage.waitForSelector(".article-details", { timeout: 5000 });

      // Add redirectedUrl if applicable.
      if (articlePage.url() !== preview.url) {
        article.redirectedUrl = articlePage.url();
      }

      // Scrape article content.
      const processed = await articlePage.evaluate(() => {
        const result: Article = {};

        // Get content and format it into paragraphs.
        const content = document.querySelector(".article-details");

        const processedContent = content?.innerHTML
          ?.replace(/&nbsp;/g, " ")
          .replace(/\n/g, "")
          .replace(/\s+/g, " ")
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .trim();
        // .split("<br>")
        // .filter(Boolean)
        // .map((part) =>
        //   !part.startsWith("<") || part.startsWith("<a ")
        //     ? `<p>${part}</p>`
        //     : part
        // )
        // .join("");

        if (processedContent) result.content = processedContent;

        // Get article title.
        const title =
          (
            document.querySelector(".news-block header h1")?.textContent ||
            document.querySelector<HTMLMetaElement>(
              'head > meta[name="og:title"]'
            )?.content
          )
            ?.replace(/&nbsp;/g, " ")
            .replace(/\n/g, "")
            .replace(/\s+/g, " ")
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .trim() || "";

        if (title) result.title = title;

        // Get article authors.
        const postInfo = document.querySelector(
          ".news-block header .about-post"
        )?.textContent;

        if (postInfo) {
          const names = postInfo
            .match(/(?<=By )(.*)(?= on )/g)?.[0]
            .split(/(?!, \w{2}.), | and /);

          names?.forEach((name, index) => {
            result[`author${index + 1}`] = name;
          });
        }

        // Get related attorneys.
        Array.from(
          document.querySelectorAll(
            ".news-block .related-attorneys .att-info strong"
          )
        ).forEach((attorney, index) => {
          result[`relatedAttorney${index + 1}`] =
            attorney.textContent
              ?.replace(/&nbsp;/g, " ")
              .replace(/\n/g, "")
              .replace(/\s+/g, " ")
              .replace(/[\u2018\u2019]/g, "'")
              .replace(/[\u201C\u201D]/g, '"')
              .trim() || "";
        });

        return result;
      });

      // Merge processed data with preview data.
      article = { ...article, ...processed };
    } catch (error) {
      console.error(`failed ${preview.url}`, error.message);
    }
  }

  // Return article and keys.
  return [article, Object.keys(article)];
}
