const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { loadConfig } = require("../../automation/config");
const { buildPromptPackage } = require("../../automation/build-prompt");
const {
  generateMockImage,
  generateOpenAIImage,
  generateImage,
} = require("../../automation/generate-image");

function tempSite() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hexo-image-test-"));
  fs.mkdirSync(path.join(root, "source", "images", "generated"), { recursive: true });
  return root;
}

test("loadConfig uses safe defaults and resolves generated image directory", () => {
  const siteRoot = tempSite();
  const config = loadConfig({
    env: {},
    siteRoot,
  });

  assert.equal(config.imageProvider, "mock");
  assert.equal(config.imageModel, "gpt-image-2");
  assert.equal(config.imageSize, "1536x1024");
  assert.equal(config.imageQuality, "medium");
  assert.equal(config.imageOutputFormat, "png");
  assert.equal(config.generatedImageDir, path.join(siteRoot, "source", "images", "generated"));
});

test("buildPromptPackage creates a director-level prompt and ASCII slug", () => {
  const promptPackage = buildPromptPackage({
    date: new Date("2026-06-12T09:30:00+08:00"),
    theme: "coastal city dusk image study",
  });

  assert.match(promptPackage.prompt, /Subject and role:/);
  assert.match(promptPackage.prompt, /Visual hook:/);
  assert.match(promptPackage.prompt, /Constraints \/ avoid:/);
  assert.equal(promptPackage.metadata.slug_suggestion, "coastal-city-dusk-image-study");
  assert.deepEqual(promptPackage.metadata.tags, ["generated-image", "daily-journal"]);
});

test("generateMockImage writes a deterministic svg image and metadata", async () => {
  const siteRoot = tempSite();
  const config = loadConfig({
    env: {},
    siteRoot,
  });
  const promptPackage = buildPromptPackage({
    date: new Date("2026-06-12T09:30:00+08:00"),
    theme: "coastal city dusk image study",
  });

  const result = await generateMockImage({ config, promptPackage });

  assert.equal(path.extname(result.imagePath), ".svg");
  assert.equal(path.extname(result.metadataPath), ".json");
  assert.ok(fs.existsSync(result.imagePath));
  assert.ok(fs.existsSync(result.metadataPath));
  assert.match(fs.readFileSync(result.imagePath, "utf8"), /Daily Image Journal/);

  const metadata = JSON.parse(fs.readFileSync(result.metadataPath, "utf8"));
  assert.equal(metadata.provider, "mock");
  assert.equal(metadata.model, "mock-svg");
  assert.equal(metadata.prompt, promptPackage.prompt);
});

test("generateOpenAIImage calls the image API and stores decoded output", async () => {
  const siteRoot = tempSite();
  const config = loadConfig({
    env: {
      IMAGE_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      IMAGE_MODEL: "gpt-image-2",
      IMAGE_OUTPUT_FORMAT: "png",
    },
    siteRoot,
  });
  const promptPackage = buildPromptPackage({
    date: new Date("2026-06-12T09:30:00+08:00"),
    theme: "coastal city dusk image study",
  });
  const calls = [];
  const fakeClient = {
    images: {
      async generate(payload) {
        calls.push(payload);
        return {
          data: [
            {
              b64_json: Buffer.from("fake-image-bytes").toString("base64"),
            },
          ],
        };
      },
    },
  };

  const result = await generateOpenAIImage({ config, promptPackage, client: fakeClient });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, "gpt-image-2");
  assert.equal(calls[0].prompt, promptPackage.prompt);
  assert.equal(calls[0].size, "1536x1024");
  assert.equal(calls[0].quality, "medium");
  assert.equal(calls[0].output_format, "png");
  assert.equal(fs.readFileSync(result.imagePath, "utf8"), "fake-image-bytes");
});

test("generateImage dispatches to mock provider by default", async () => {
  const siteRoot = tempSite();
  const config = loadConfig({
    env: {},
    siteRoot,
  });

  const result = await generateImage({
    config,
    date: new Date("2026-06-12T09:30:00+08:00"),
  });

  assert.equal(result.provider, "mock");
  assert.ok(fs.existsSync(result.imagePath));
});
