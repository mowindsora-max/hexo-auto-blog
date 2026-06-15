const path = require("node:path");

function loadConfig({ env = process.env, siteRoot = path.resolve(__dirname, "..") } = {}) {
  if (env === process.env) {
    require("dotenv").config({ path: path.join(siteRoot, ".env"), quiet: true });
  }

  const imageProvider = env.IMAGE_PROVIDER || "mock";
  const imageOutputFormat = env.IMAGE_OUTPUT_FORMAT || "png";
  const imageRetryDelayMs = (env.IMAGE_RETRY_DELAY_MS || "5000,15000")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value));

  return {
    siteRoot,
    generatedImageDir: path.join(siteRoot, "source", "images", "generated"),
    postsDir: path.join(siteRoot, "source", "_posts"),
    publicDir: path.join(siteRoot, "public"),
    maxOptimizedImageBytes: Number.parseInt(env.MAX_OPTIMIZED_IMAGE_BYTES || String(1024 * 1024), 10),
    imageProvider,
    imageApiKey: env.OPENAI_API_KEY || env.IMAGE_API_KEY || "",
    imageModel: env.IMAGE_MODEL || "gpt-image-2",
    imageSize: env.IMAGE_SIZE || "1536x1024",
    imageQuality: env.IMAGE_QUALITY || "medium",
    imageOutputFormat,
    imageOptimizationQuality: Number.parseInt(env.IMAGE_OPTIMIZATION_QUALITY || "82", 10),
    imageRetryAttempts: Number.parseInt(env.IMAGE_RETRY_ATTEMPTS || "3", 10),
    imageRetryDelayMs,
    dryRun: env.DRY_RUN === "1" || env.DRY_RUN === "true",
    defaultTheme: env.DEFAULT_IMAGE_THEME || "daily creativity image study",
  };
}

module.exports = {
  loadConfig,
};
