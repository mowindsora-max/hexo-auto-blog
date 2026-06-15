const { loadConfig } = require("./config");
const { generateImage } = require("./generate-image");
const { optimizeImages } = require("./optimize-images");
const { createPost } = require("./create-post");

async function main() {
  const config = loadConfig();
  const imageResult = await generateImage({ config });
  const optimizeReport = config.dryRun ? { optimized: [] } : await optimizeImages(config);
  const postResult = await createPost({
    ...config,
    metadataPath: imageResult.metadataPath,
    metadata: imageResult.promptPackage.metadata,
    imagePath: imageResult.imagePath,
  });

  if (config.dryRun) {
    console.log("Dry run enabled. No files were written.");
    console.log(`Planned ${imageResult.provider} image: ${imageResult.imagePath}`);
    console.log(`Planned metadata: ${imageResult.metadataPath}`);
    console.log(`Planned post: ${postResult.postPath}`);
    return;
  }

  console.log(`Generated ${imageResult.provider} image: ${imageResult.imagePath}`);
  console.log(`Wrote metadata: ${imageResult.metadataPath}`);
  console.log(`Optimized images: ${optimizeReport.optimized.length}`);
  if (postResult.created) {
    console.log(`Created post: ${postResult.postPath}`);
  } else {
    console.log(`Skipped post: ${postResult.postPath} (${postResult.reason})`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  main,
};
