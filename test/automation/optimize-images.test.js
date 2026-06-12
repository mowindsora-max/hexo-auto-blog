const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { optimizeImages, supportedSourceExtensions } = require("../../automation/optimize-images");

function tempImageDir() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hexo-optimize-test-"));
  const generatedImageDir = path.join(root, "source", "images", "generated");
  fs.mkdirSync(generatedImageDir, { recursive: true });
  return { root, generatedImageDir };
}

function writeSvg(filePath, color = "#d8e2df") {
  fs.writeFileSync(
    filePath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="${color}"/></svg>`,
    "utf8",
  );
}

test("supportedSourceExtensions includes common generated source formats", () => {
  assert.deepEqual(supportedSourceExtensions, [".jpg", ".jpeg", ".png", ".svg"]);
});

test("optimizeImages converts supported images to webp with a size report", async () => {
  const { generatedImageDir } = tempImageDir();
  const svgPath = path.join(generatedImageDir, "daily-image.svg");
  writeSvg(svgPath);

  const report = await optimizeImages({
    generatedImageDir,
    imageOptimizationQuality: 82,
  });

  const webpPath = path.join(generatedImageDir, "daily-image.webp");
  assert.ok(fs.existsSync(webpPath));
  assert.equal(report.optimized.length, 1);
  assert.equal(report.optimized[0].sourcePath, svgPath);
  assert.equal(report.optimized[0].outputPath, webpPath);
  assert.equal(report.optimized[0].quality, 82);
  assert.ok(report.optimized[0].sourceBytes > 0);
  assert.ok(report.optimized[0].outputBytes > 0);
  assert.equal(report.skipped.length, 0);
});

test("optimizeImages skips files when matching webp already exists", async () => {
  const { generatedImageDir } = tempImageDir();
  const svgPath = path.join(generatedImageDir, "daily-image.svg");
  const webpPath = path.join(generatedImageDir, "daily-image.webp");
  writeSvg(svgPath);
  fs.writeFileSync(webpPath, "existing-webp");

  const report = await optimizeImages({
    generatedImageDir,
    imageOptimizationQuality: 82,
  });

  assert.equal(report.optimized.length, 0);
  assert.equal(report.skipped.length, 1);
  assert.equal(report.skipped[0].sourcePath, svgPath);
  assert.equal(report.skipped[0].reason, "webp-exists");
  assert.equal(fs.readFileSync(webpPath, "utf8"), "existing-webp");
});

test("optimizeImages ignores metadata and unsupported files", async () => {
  const { generatedImageDir } = tempImageDir();
  fs.writeFileSync(path.join(generatedImageDir, "daily-image.json"), "{}\n", "utf8");
  fs.writeFileSync(path.join(generatedImageDir, "notes.txt"), "hello", "utf8");

  const report = await optimizeImages({
    generatedImageDir,
    imageOptimizationQuality: 82,
  });

  assert.equal(report.optimized.length, 0);
  assert.equal(report.skipped.length, 0);
});
