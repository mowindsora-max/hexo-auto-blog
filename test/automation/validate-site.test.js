const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  collectPostImageUrls,
  sourcePathForImageUrl,
  validateSite,
} = require("../../automation/validate-site");

function tempSite() {
  const siteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hexo-validate-test-"));
  const postsDir = path.join(siteRoot, "source", "_posts");
  const generatedImageDir = path.join(siteRoot, "source", "images", "generated");
  const publicDir = path.join(siteRoot, "public");
  fs.mkdirSync(postsDir, { recursive: true });
  fs.mkdirSync(generatedImageDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });
  return { siteRoot, postsDir, generatedImageDir, publicDir };
}

function writePost(postsDir, name, imageUrl = "/images/generated/daily.webp") {
  fs.writeFileSync(
    path.join(postsDir, name),
    `---
title: "Daily"
cover: ${imageUrl}
---

![Daily image](${imageUrl})
`,
    "utf8",
  );
}

test("collectPostImageUrls reads cover and markdown image references", async () => {
  const { postsDir } = tempSite();
  writePost(postsDir, "daily.md", "/images/generated/daily.webp");

  const refs = await collectPostImageUrls(postsDir);

  assert.equal(refs.length, 2);
  assert.equal(refs[0].url, "/images/generated/daily.webp");
  assert.equal(refs[1].url, "/images/generated/daily.webp");
});

test("sourcePathForImageUrl maps site-root image URLs to source paths", () => {
  const { siteRoot } = tempSite();

  assert.equal(
    sourcePathForImageUrl({ siteRoot, imageUrl: "/images/generated/daily.webp" }),
    path.join(siteRoot, "source", "images", "generated", "daily.webp"),
  );
});

test("validateSite passes when posts, images, public index, and size limits are valid", async () => {
  const { siteRoot, postsDir, generatedImageDir, publicDir } = tempSite();
  writePost(postsDir, "daily.md", "/images/generated/daily.webp");
  fs.writeFileSync(path.join(generatedImageDir, "daily.webp"), "webp", "utf8");
  fs.writeFileSync(path.join(publicDir, "index.html"), "<!doctype html>", "utf8");

  const result = await validateSite({
    siteRoot,
    postsDir,
    generatedImageDir,
    publicDir,
    maxOptimizedImageBytes: 1024,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.postCount, 1);
});

test("validateSite fails when a post references a missing image", async () => {
  const { siteRoot, postsDir, generatedImageDir, publicDir } = tempSite();
  writePost(postsDir, "daily.md", "/images/generated/missing.webp");
  fs.writeFileSync(path.join(publicDir, "index.html"), "<!doctype html>", "utf8");

  const result = await validateSite({
    siteRoot,
    postsDir,
    generatedImageDir,
    publicDir,
    maxOptimizedImageBytes: 1024,
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Missing image/);
});

test("validateSite fails when public index is missing or optimized image is too large", async () => {
  const { siteRoot, postsDir, generatedImageDir, publicDir } = tempSite();
  writePost(postsDir, "daily.md", "/images/generated/daily.webp");
  fs.writeFileSync(path.join(generatedImageDir, "daily.webp"), "x".repeat(2048), "utf8");

  const result = await validateSite({
    siteRoot,
    postsDir,
    generatedImageDir,
    publicDir,
    maxOptimizedImageBytes: 1024,
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Missing public index/);
  assert.match(result.errors.join("\n"), /exceeds 1.0 KB/);
});
