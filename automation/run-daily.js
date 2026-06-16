const { loadConfig } = require("./config");
const { generateImage } = require("./generate-image");
const { optimizeImages } = require("./optimize-images");
const { createPost } = require("./create-post");

async function runDaily({
  config,
  generateImageFn = generateImage,
  optimizeImagesFn = optimizeImages,
  createPostFn = createPost,
  logger = console,
} = {}) {
  const imageResult = await generateImageFn({ config });
  const optimizeReport = config.dryRun ? { optimized: [] } : await optimizeImagesFn(config);
  const postOptions = {
    ...config,
    metadataPath: imageResult.metadataPath,
  };

  if (config.dryRun) {
    postOptions.metadata = imageResult.promptPackage.metadata;
    postOptions.imagePath = imageResult.imagePath;
  }

  const postResult = await createPostFn(postOptions);

  if (config.dryRun) {
    logger.log("Dry run enabled. No files were written.");
    logger.log(`Planned ${imageResult.provider} image: ${imageResult.imagePath}`);
    logger.log(`Planned metadata: ${imageResult.metadataPath}`);
    logger.log(`Planned post: ${postResult.postPath}`);
    return { imageResult, optimizeReport, postResult };
  }

  logger.log(`Generated ${imageResult.provider} image: ${imageResult.imagePath}`);
  logger.log(`Wrote metadata: ${imageResult.metadataPath}`);
  logger.log(`Optimized images: ${optimizeReport.optimized.length}`);
  if (postResult.created) {
    logger.log(`Created post: ${postResult.postPath}`);
  } else {
    logger.log(`Skipped post: ${postResult.postPath} (${postResult.reason})`);
  }

  return { imageResult, optimizeReport, postResult };
}

async function main() {
  await runDaily({
    config: loadConfig(),
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  main,
  runDaily,
};
