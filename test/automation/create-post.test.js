const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createPost,
  findLatestMetadata,
  formatHexoDate,
  imageUrlForSourcePath,
} = require("../../automation/create-post");

function tempSite() {
  const siteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hexo-post-test-"));
  const generatedImageDir = path.join(siteRoot, "source", "images", "generated");
  const postsDir = path.join(siteRoot, "source", "_posts");
  fs.mkdirSync(generatedImageDir, { recursive: true });
  fs.mkdirSync(postsDir, { recursive: true });
  return { siteRoot, generatedImageDir, postsDir };
}

function writeMetadata(generatedImageDir, name, overrides = {}) {
  const metadataPath = path.join(generatedImageDir, `${name}.json`);
  fs.writeFileSync(
    metadataPath,
    `${JSON.stringify(
      {
        title_suggestion: "Daily Creativity Image Study",
        slug_suggestion: "daily-creativity-image-study",
        theme: "daily creativity image study",
        subject_role: "adult visual field researcher",
        visual_hook: "An everyday object anchors the visual story.",
        style_preset: "cinematic-editorial-realism",
        palette: ["muted coastal blue", "warm paper white"],
        tags: ["generated-image", "daily-journal"],
        categories: ["image-journal"],
        negative_details: ["watermarks", "random logos"],
        prompt: "Subject and role:\nA detailed prompt.\n\nConstraints / avoid:\nwatermarks",
        generated_at: "2026-06-12T09:30:00.000Z",
        ...overrides,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return metadataPath;
}

test("formatHexoDate returns a Hexo-friendly timestamp", () => {
  assert.equal(formatHexoDate(new Date("2026-06-12T09:30:05.000Z")), "2026-06-12 09:30:05");
});

test("imageUrlForSourcePath maps source image paths to root-relative URLs", () => {
  const { siteRoot, generatedImageDir } = tempSite();
  const sourcePath = path.join(generatedImageDir, "daily-image.webp");

  assert.equal(imageUrlForSourcePath({ siteRoot, sourcePath }), "/images/generated/daily-image.webp");
});

test("findLatestMetadata selects the newest generated metadata file", async () => {
  const { generatedImageDir } = tempSite();
  const older = writeMetadata(generatedImageDir, "2026-06-11-old");
  const newer = writeMetadata(generatedImageDir, "2026-06-12-new");
  fs.utimesSync(older, new Date("2026-06-11T00:00:00Z"), new Date("2026-06-11T00:00:00Z"));
  fs.utimesSync(newer, new Date("2026-06-12T00:00:00Z"), new Date("2026-06-12T00:00:00Z"));

  const latest = await findLatestMetadata({ generatedImageDir });

  assert.equal(latest.metadataPath, newer);
});

test("createPost writes a Hexo post that prefers webp image assets", async () => {
  const { siteRoot, generatedImageDir, postsDir } = tempSite();
  const metadataPath = writeMetadata(generatedImageDir, "2026-06-12-daily-creativity-image-study");
  fs.writeFileSync(path.join(generatedImageDir, "2026-06-12-daily-creativity-image-study.svg"), "<svg />", "utf8");
  fs.writeFileSync(path.join(generatedImageDir, "2026-06-12-daily-creativity-image-study.webp"), "webp", "utf8");

  const result = await createPost({
    siteRoot,
    generatedImageDir,
    postsDir,
    metadataPath,
    date: new Date("2026-06-12T09:30:05.000Z"),
  });

  assert.equal(result.created, true);
  assert.equal(result.postPath, path.join(postsDir, "2026-06-12-daily-creativity-image-study.md"));

  const post = fs.readFileSync(result.postPath, "utf8");
  assert.match(post, /title: "Daily Creativity Image Study"/);
  assert.match(post, /subtitle: "An everyday object anchors the visual story\."/);
  assert.match(post, /date: 2026-06-12 09:30:05/);
  assert.match(post, /cover: \/images\/generated\/2026-06-12-daily-creativity-image-study.webp/);
  assert.match(post, /!\[Daily Creativity Image Study\]\(\/images\/generated\/2026-06-12-daily-creativity-image-study.webp\)/);
  assert.match(post, /## Prompt/);
  assert.match(post, /Subject and role:/);
  assert.match(post, /## Style Notes/);
});

test("createPost skips existing posts unless force is enabled", async () => {
  const { siteRoot, generatedImageDir, postsDir } = tempSite();
  const metadataPath = writeMetadata(generatedImageDir, "2026-06-12-daily-creativity-image-study");
  fs.writeFileSync(path.join(generatedImageDir, "2026-06-12-daily-creativity-image-study.webp"), "webp", "utf8");
  const postPath = path.join(postsDir, "2026-06-12-daily-creativity-image-study.md");
  fs.writeFileSync(postPath, "existing", "utf8");

  const skipped = await createPost({
    siteRoot,
    generatedImageDir,
    postsDir,
    metadataPath,
    force: false,
  });
  assert.equal(skipped.created, false);
  assert.equal(fs.readFileSync(postPath, "utf8"), "existing");

  const overwritten = await createPost({
    siteRoot,
    generatedImageDir,
    postsDir,
    metadataPath,
    force: true,
  });
  assert.equal(overwritten.created, true);
  assert.notEqual(fs.readFileSync(postPath, "utf8"), "existing");
});
