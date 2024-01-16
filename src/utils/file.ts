import fs from "fs";
import * as https from "https";
import ora from "ora";
import { config } from "../config";

export function isFileUrl(url?: string): boolean {
  if (!url) return false;

  // Define a list of common file extensions
  const fileExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "svg",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "zip",
    "rar",
    "tar",
    "gz",
    "7z",
    "mp3",
    "wav",
    "ogg",
    "flac",
    "mp4",
    "avi",
    "mkv",
    "mov",
    "wmv",
    "mht",
  ];

  // Extract the file extension from the URL
  const urlParts = url.split(".");
  const fileExtension = urlParts[urlParts.length - 1].toLowerCase();

  // Check if the file extension is in the list
  return fileExtensions.includes(fileExtension);
}

export async function downloadFiles(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const spinner = ora(`Downloading ${urls.length} files.`).start();
  let succeeded = 0;
  let failed = 0;

  // Download each file.
  for (const url of urls) {
    try {
      await downloadFile(url);
      succeeded++;
    } catch {
      failed++;
    }
  }

  if (failed === 0) {
    spinner.succeed(`Downloaded ${succeeded} files.`);
  } else {
    spinner.warn(
      `Downloaded ${succeeded} files. Failed to download ${failed} files.`
    );
  }
}

export function downloadFile(url?: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (!url) return resolve();

    const filesDir = `${config.targetDir}/${config.name}/files`;

    // Create the files directory if it doesn't exist.
    if (!(await fs.existsSync(filesDir))) await fs.mkdir(filesDir, () => {});

    // Create a write stream to save the file to.
    const destinationPath = `${filesDir}/${url.split("/").pop() || "file"}`;
    const fileStream = fs.createWriteStream(destinationPath);

    // Download the file.
    https
      .get(url, (response) => {
        // Check if the response status code is OK (200)
        if (response.statusCode !== 200) {
          reject();
          return;
        }

        // Pipe the response stream to the file stream
        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });

        fileStream.on("error", (error) => {
          reject(error);
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}
