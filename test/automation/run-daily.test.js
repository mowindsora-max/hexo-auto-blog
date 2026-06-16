const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { runDaily } = require("../../automation/run-daily");

test("runDaily lets createPost choose the optimized image after compression", async () => {
  const calls = [];
  const config = {
    dryRun: false,
    generatedImageDir: "generated",
    postsDir: "posts",
    siteRoot: "site",
  };

  await runDaily({
    config,
    generateImageFn: async () => ({
      provider: "mock",
      imagePath: path.join("generated", "2026-06-16-game-illustration.svg"),
      metadataPath: path.join("generated", "2026-06-16-game-illustration.json"),
      promptPackage: {
        metadata: {
          title_suggestion: "Game Illustration",
        },
      },
    }),
    optimizeImagesFn: async () => ({ optimized: [{ outputPath: "game.webp" }] }),
    createPostFn: async (options) => {
      calls.push(options);
      return {
        created: true,
        postPath: path.join("posts", "2026-06-16-game-illustration.md"),
      };
    },
    logger: { log() {} },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].metadataPath, path.join("generated", "2026-06-16-game-illustration.json"));
  assert.equal(Object.hasOwn(calls[0], "imagePath"), false);
});

test("runDaily passes planned image data to createPost during dry-run", async () => {
  const calls = [];
  const config = {
    dryRun: true,
    generatedImageDir: "generated",
    postsDir: "posts",
    siteRoot: "site",
  };

  await runDaily({
    config,
    generateImageFn: async () => ({
      provider: "mock",
      imagePath: path.join("generated", "2026-06-16-game-illustration.svg"),
      metadataPath: path.join("generated", "2026-06-16-game-illustration.json"),
      promptPackage: {
        metadata: {
          title_suggestion: "Game Illustration",
        },
      },
    }),
    optimizeImagesFn: async () => {
      throw new Error("should not optimize during dry-run");
    },
    createPostFn: async (options) => {
      calls.push(options);
      return {
        dryRun: true,
        postPath: path.join("posts", "2026-06-16-game-illustration.md"),
      };
    },
    logger: { log() {} },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].imagePath, path.join("generated", "2026-06-16-game-illustration.svg"));
  assert.deepEqual(calls[0].metadata, { title_suggestion: "Game Illustration" });
});
