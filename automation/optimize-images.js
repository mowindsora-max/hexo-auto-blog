const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { loadConfig } = require("./config");

const supportedSourceExtensions = [".jpg", ".jpeg", ".png", ".svg"];

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fileBytes(filePath) {
  const stat = await fs.stat(filePath);
  return stat.size;
}

function toWebpPath(sourcePath) {
  const parsed = path.parse(sourcePath);
  return path.join(parsed.dir, `${parsed.name}.webp`);
}

async function optimizeImages({
  generatedImageDir,
  imageOptimizationQuality = 82,
} = loadConfig()) {
  const entries = await fs.readdir(generatedImageDir, { withFileTypes: true });
  const report = {
    optimized: [],
    skipped: [],
  };

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const sourcePath = path.join(generatedImageDir, entry.name);
    const extension = path.extname(entry.name).toLowerCase();

    if (!supportedSourceExtensions.includes(extension)) {
      continue;
    }

    const outputPath = toWebpPath(sourcePath);
    if (await pathExists(outputPath)) {
      report.skipped.push({
        sourcePath,
        outputPath,
        reason: "webp-exists",
      });
      continue;
    }

    await sharp(sourcePath)
      .webp({
        quality: imageOptimizationQuality,
        effort: 4,
      })
      .toFile(outputPath);

    report.optimized.push({
      sourcePath,
      outputPath,
      quality: imageOptimizationQuality,
      sourceBytes: await fileBytes(sourcePath),
      outputBytes: await fileBytes(outputPath),
    });
  }

  return report;
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

async function main() {
  const report = await optimizeImages(loadConfig());

  for (const item of report.optimized) {
    console.log(
      `Optimized ${path.basename(item.sourcePath)} -> ${path.basename(item.outputPath)} (${formatBytes(item.sourceBytes)} -> ${formatBytes(item.outputBytes)})`,
    );
  }

  for (const item of report.skipped) {
    console.log(`Skipped ${path.basename(item.sourcePath)} (${item.reason})`);
  }

  if (report.optimized.length === 0 && report.skipped.length === 0) {
    console.log("No generated images needed optimization.");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  formatBytes,
  optimizeImages,
  supportedSourceExtensions,
  toWebpPath,
};
