import ora from "ora";
import type { Browser } from "puppeteer";
import { Article } from "../types";

export async function scrapeSection(
  browser: Browser,
  url: string
): Promise<[Article[], string[]]> {
  const spinner = ora(`Scraping ${url}`).start();

  // Open page.
  const listPage = await browser.newPage();
  await listPage.goto(url);

  const articles: Article[] = [];
  const keys = new Set<string>();

  let count = 0;
  let shouldRun = true;
  while (shouldRun) {
    await listPage.waitForSelector(".pagination-fld");
    spinner.text = `Scraping page ${++count} from ${url}`;

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
            ?.replace(/\n/g, "")
            .replace(/\s+/g, " ")
            .replace("&nbsp;", " ")
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2122]/g, "™")
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

  spinner.succeed(`Scraped ${articles.length} articles from ${url}`);

  // Return all scraped articles.
  return [articles, Array.from(keys)];
}

export async function scrapeArticle(
  browser: Browser,
  preview: Article
): Promise<[Article, string[]]> {
  if (preview.content || !preview.url) return [preview, Object.keys(preview)];

  try {
    // Open article page.
    const articlePage = await browser.newPage();
    await articlePage.goto(preview.url, { waitUntil: "domcontentloaded" });
    await articlePage.waitForSelector(".article-details");

    // Scrape article content.
    const [article, keys] = await articlePage.evaluate((preview) => {
      const article: Article = { ...preview };

      // Get content and format it into paragraphs.
      const content = document
        .querySelector(".article-details")
        ?.innerHTML?.split("<br>")
        .filter(Boolean)
        .map(
          (part) =>
            part
              ?.replace(/\n/g, "")
              .replace(/\s+/g, " ")
              .replace("&nbsp;", " ")
              .replace(/[\u2018\u2019]/g, "'")
              .replace(/[\u201C\u201D]/g, '"')
              .trim() || ""
        )
        .map((part) =>
          !part.startsWith("<") || part.startsWith("<a ")
            ? `<p>${part}</p>`
            : part
        )
        .join("");

      if (content) article.content = content;

      // Get article title.
      const title =
        (
          document.querySelector(".news-block header h1")?.textContent ||
          document.querySelector<HTMLMetaElement>(
            'head > meta[name="og:title"]'
          )?.content
        )
          ?.replace(/\n/g, "")
          .replace(/\s+/g, " ")
          .replace("&nbsp;", " ")
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .trim() || "";

      if (title) article.title = title;

      // Get article authors.
      const postInfo = document.querySelector(
        ".news-block header .about-post"
      )?.textContent;

      if (postInfo) {
        const names = postInfo
          .match(/(?<=By )(.*)(?= on )/g)?.[0]
          .split(/(?!, \w{2}.), | and /);

        names?.forEach((name, index) => {
          article[`author${index + 1}`] = name;
        });
      }

      // Get related attorneys.
      Array.from(
        document.querySelectorAll(
          ".news-block .related-attorneys .att-info strong"
        )
      ).forEach((attorney, index) => {
        article[`relatedAttorney${index + 1}`] =
          attorney.textContent
            ?.replace(/\n/g, "")
            .replace(/\s+/g, " ")
            .replace("&nbsp;", " ")
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .trim() || "";
      });

      return [article, Object.keys(article)] as const;
    }, preview);

    // Return scraped article
    return [article, keys];
  } catch (error) {
    return [preview, Object.keys(preview)];
  }
}
