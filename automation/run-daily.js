const { loadConfig } = require("./config");
const { generateImage } = require("./generate-image");
const { optimizeImages } = require("./optimize-images");
const { createPost } = require("./create-post");

async function main() {
  const config = loadConfig();
  const imageResult = await generateImage({ config });
  const optimizeReport = await optimizeImages(config);
  const postResult = await createPost({
    ...config,
    metadataPath: imageResult.metadataPath,
  });

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
