const fs = require("node:fs/promises");
const path = require("node:path");
const { loadConfig } = require("./config");
const { slugify } = require("./build-prompt");

const imageExtensionsByPreference = [".webp", ".png", ".jpg", ".jpeg", ".svg"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatHexoDate(date) {
  return [
    date.getUTCFullYear(),
    "-",
    pad(date.getUTCMonth() + 1),
    "-",
    pad(date.getUTCDate()),
    " ",
    pad(date.getUTCHours()),
    ":",
    pad(date.getUTCMinutes()),
    ":",
    pad(date.getUTCSeconds()),
  ].join("");
}

function yamlString(value) {
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yamlList(values = []) {
  if (!values.length) {
    return "";
  }

  return values.map((value) => `  - ${value}`).join("\n");
}

function imageUrlForSourcePath({ siteRoot, sourcePath }) {
  const sourceRoot = path.join(siteRoot, "source");
  const relative = path.relative(sourceRoot, sourcePath).split(path.sep).join("/");
  return `/${relative}`;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findLatestMetadata({ generatedImageDir }) {
  const entries = await fs.readdir(generatedImageDir, { withFileTypes: true });
  const metadataFiles = [];

  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".json") {
      continue;
    }

    const metadataPath = path.join(generatedImageDir, entry.name);
    const stat = await fs.stat(metadataPath);
    metadataFiles.push({ metadataPath, mtimeMs: stat.mtimeMs });
  }

  if (!metadataFiles.length) {
    throw new Error(`No generated image metadata found in ${generatedImageDir}`);
  }

  metadataFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return {
    metadataPath: metadataFiles[0].metadataPath,
  };
}

async function readMetadata(metadataPath) {
  return JSON.parse(await fs.readFile(metadataPath, "utf8"));
}

async function findImageForMetadata(metadataPath) {
  const parsed = path.parse(metadataPath);

  for (const extension of imageExtensionsByPreference) {
    const imagePath = path.join(parsed.dir, `${parsed.name}${extension}`);
    if (await fileExists(imagePath)) {
      return imagePath;
    }
  }

  throw new Error(`No generated image found for metadata ${metadataPath}`);
}

function buildPostMarkdown({ metadata, imageUrl, date }) {
  const title = metadata.title_suggestion || "Daily Image Study";
  const subtitle = metadata.visual_hook || metadata.theme || "";
  const tags = metadata.tags || ["generated-image", "daily-journal"];
  const categories = metadata.categories || ["image-journal"];
  const description = `Generated image journal for ${metadata.theme || title}.`;
  const palette = metadata.palette || [];
  const negativeDetails = metadata.negative_details || [];

  return `---
title: ${yamlString(title)}
subtitle: ${yamlString(subtitle)}
date: ${formatHexoDate(date)}
tags:
${yamlList(tags)}
categories:
${yamlList(categories)}
description: ${yamlString(description)}
cover: ${imageUrl}
---

![${title}](${imageUrl})

${subtitle || "A generated image study for the daily visual journal."}

## Prompt

\`\`\`text
${metadata.prompt || ""}
\`\`\`

## Style Notes

- Theme: ${metadata.theme || "daily image study"}
- Subject: ${metadata.subject_role || "visual subject"}
- Style: ${metadata.style_preset || "generated image"}
- Palette: ${palette.join(", ") || "not specified"}
- Avoided: ${negativeDetails.join(", ") || "not specified"}
`;
}

async function createPost({
  siteRoot,
  generatedImageDir,
  postsDir,
  metadataPath,
  date,
  force = process.env.FORCE_DAILY_POST === "1",
} = loadConfig()) {
  const latest = metadataPath ? { metadataPath } : await findLatestMetadata({ generatedImageDir });
  const metadata = await readMetadata(latest.metadataPath);
  const slug = slugify(metadata.slug_suggestion || metadata.title_suggestion || metadata.theme || "daily-image-study");
  const postPath = path.join(postsDir, `${slug}.md`);

  if ((await fileExists(postPath)) && !force) {
    return {
      created: false,
      skipped: true,
      reason: "post-exists",
      postPath,
      metadataPath: latest.metadataPath,
    };
  }

  const imagePath = await findImageForMetadata(latest.metadataPath);
  const imageUrl = imageUrlForSourcePath({ siteRoot, sourcePath: imagePath });
  const postDate = date || new Date(metadata.generated_at || Date.now());
  const markdown = buildPostMarkdown({
    metadata,
    imageUrl,
    date: postDate,
  });

  await fs.mkdir(postsDir, { recursive: true });
  await fs.writeFile(postPath, markdown, "utf8");

  return {
    created: true,
    postPath,
    imagePath,
    imageUrl,
    metadataPath: latest.metadataPath,
  };
}

async function main() {
  const result = await createPost(loadConfig());

  if (result.created) {
    console.log(`Created post: ${result.postPath}`);
    console.log(`Using image: ${result.imageUrl}`);
  } else {
    console.log(`Skipped post: ${result.postPath} (${result.reason})`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  buildPostMarkdown,
  createPost,
  findImageForMetadata,
  findLatestMetadata,
  formatHexoDate,
  imageUrlForSourcePath,
};
