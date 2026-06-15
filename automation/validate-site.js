const fs = require("node:fs/promises");
const path = require("node:path");
const { loadConfig } = require("./config");

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listMarkdownFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractCoverUrls(markdown) {
  const urls = [];
  const frontMatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!frontMatterMatch) {
    return urls;
  }

  for (const line of frontMatterMatch[1].split(/\r?\n/)) {
    const match = line.match(/^cover:\s*(.+?)\s*$/);
    if (match && match[1]) {
      const value = match[1].trim().replace(/^["']|["']$/g, "");
      if (value) {
        urls.push(value);
      }
    }
  }

  return urls;
}

function extractMarkdownImageUrls(markdown) {
  const urls = [];
  const imagePattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;

  while ((match = imagePattern.exec(markdown)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

async function collectPostImageUrls(postsDir) {
  const posts = await listMarkdownFiles(postsDir);
  const refs = [];

  for (const postPath of posts) {
    const markdown = await fs.readFile(postPath, "utf8");
    const urls = [...extractCoverUrls(markdown), ...extractMarkdownImageUrls(markdown)];

    for (const url of urls) {
      refs.push({
        postPath,
        url,
      });
    }
  }

  return refs;
}

function sourcePathForImageUrl({ siteRoot, imageUrl }) {
  if (!imageUrl.startsWith("/") || imageUrl.startsWith("//")) {
    return null;
  }

  const cleanUrl = imageUrl.split(/[?#]/, 1)[0].replace(/^\/+/, "");
  return path.join(siteRoot, "source", ...cleanUrl.split("/"));
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function validateImageReferences({ siteRoot, postsDir }) {
  const errors = [];
  const refs = await collectPostImageUrls(postsDir);

  for (const ref of refs) {
    const imagePath = sourcePathForImageUrl({ siteRoot, imageUrl: ref.url });
    if (!imagePath) {
      continue;
    }

    if (!(await pathExists(imagePath))) {
      errors.push(`Missing image ${ref.url} referenced by ${path.relative(siteRoot, ref.postPath)}`);
    }
  }

  return {
    refs,
    errors,
  };
}

async function validateOptimizedImageSizes({ generatedImageDir, maxOptimizedImageBytes }) {
  const entries = await fs.readdir(generatedImageDir, { withFileTypes: true });
  const errors = [];

  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".webp") {
      continue;
    }

    const imagePath = path.join(generatedImageDir, entry.name);
    const stat = await fs.stat(imagePath);
    if (stat.size > maxOptimizedImageBytes) {
      errors.push(
        `${path.relative(path.dirname(generatedImageDir), imagePath)} exceeds ${formatBytes(maxOptimizedImageBytes)} (${formatBytes(stat.size)})`,
      );
    }
  }

  return errors;
}

async function validateSite(config = loadConfig()) {
  const {
    siteRoot,
    postsDir,
    generatedImageDir,
    publicDir,
    maxOptimizedImageBytes,
  } = config;
  const errors = [];

  const posts = (await pathExists(postsDir)) ? await listMarkdownFiles(postsDir) : [];
  if (posts.length === 0) {
    errors.push(`No posts found in ${postsDir}`);
  }

  const indexPath = path.join(publicDir, "index.html");
  if (!(await pathExists(indexPath))) {
    errors.push(`Missing public index: ${indexPath}`);
  }

  if (await pathExists(postsDir)) {
    const imageValidation = await validateImageReferences({ siteRoot, postsDir });
    errors.push(...imageValidation.errors);
  }

  if (await pathExists(generatedImageDir)) {
    errors.push(
      ...(await validateOptimizedImageSizes({
        generatedImageDir,
        maxOptimizedImageBytes,
      })),
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    postCount: posts.length,
  };
}

async function main() {
  const result = await validateSite(loadConfig());

  if (result.valid) {
    console.log(`Site validation passed (${result.postCount} posts checked).`);
    return;
  }

  console.error("Site validation failed:");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  collectPostImageUrls,
  extractCoverUrls,
  extractMarkdownImageUrls,
  formatBytes,
  sourcePathForImageUrl,
  validateSite,
};
