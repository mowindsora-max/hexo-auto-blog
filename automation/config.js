const path = require("node:path");

function loadConfig({ env = process.env, siteRoot = path.resolve(__dirname, "..") } = {}) {
  if (env === process.env) {
    require("dotenv").config({ path: path.join(siteRoot, ".env"), quiet: true });
  }

  const imageProvider = env.IMAGE_PROVIDER || "mock";
  const imageOutputFormat = env.IMAGE_OUTPUT_FORMAT || "png";

  return {
    siteRoot,
    generatedImageDir: path.join(siteRoot, "source", "images", "generated"),
    postsDir: path.join(siteRoot, "source", "_posts"),
    imageProvider,
    imageApiKey: env.OPENAI_API_KEY || env.IMAGE_API_KEY || "",
    imageModel: env.IMAGE_MODEL || "gpt-image-2",
    imageSize: env.IMAGE_SIZE || "1536x1024",
    imageQuality: env.IMAGE_QUALITY || "medium",
    imageOutputFormat,
    imageOptimizationQuality: Number.parseInt(env.IMAGE_OPTIMIZATION_QUALITY || "82", 10),
    defaultTheme: env.DEFAULT_IMAGE_THEME || "daily creativity image study",
  };
}

module.exports = {
  loadConfig,
};
