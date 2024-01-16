const name = process.env.SOURCE_NAME;
if (!name) throw new Error("SOURCE_NAME is not defined in .env file.");

const url = process.env.SOURCE_START_URL;
if (!url) throw new Error("SOURCE_START_URL is not defined in .env file.");

const targetDir = process.env.TARGET_DIR;
if (!targetDir) throw new Error("TARGET_DIR is not defined in .env file.");

export const config = { name, url, targetDir };
