const fs = require("node:fs/promises");
const path = require("node:path");
const { buildPromptPackage } = require("./build-prompt");

function dateStamp(date) {
  return date.toISOString().slice(0, 10);
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function writeMetadata({ metadataPath, provider, model, imagePath, promptPackage, config }) {
  const metadata = {
    ...promptPackage.metadata,
    provider,
    model,
    image_path: imagePath,
    size: config.imageSize,
    quality: config.imageQuality,
    output_format: path.extname(imagePath).replace(".", ""),
    prompt: promptPackage.prompt,
    generated_at: new Date().toISOString(),
  };

  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function generateMockImage({ config, promptPackage, date = new Date() }) {
  await ensureDir(config.generatedImageDir);

  const slug = promptPackage.metadata.slug_suggestion;
  const baseName = `${dateStamp(date)}-${slug}`;
  const imagePath = path.join(config.generatedImageDir, `${baseName}.svg`);
  const metadataPath = path.join(config.generatedImageDir, `${baseName}.json`);
  const title = escapeXml(promptPackage.metadata.title_suggestion);
  const theme = escapeXml(promptPackage.metadata.theme);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
  <rect width="1536" height="1024" fill="#d8e2df"/>
  <rect x="96" y="96" width="1344" height="832" rx="0" fill="#f7f1e7"/>
  <path d="M96 688 C320 560 500 792 736 640 C920 522 1088 568 1440 420 L1440 928 L96 928 Z" fill="#8aa1a6"/>
  <circle cx="1180" cy="260" r="112" fill="#d69b53" opacity="0.82"/>
  <rect x="188" y="204" width="456" height="24" fill="#2f3d44"/>
  <rect x="188" y="252" width="700" height="16" fill="#617075"/>
  <rect x="188" y="292" width="612" height="16" fill="#617075"/>
  <text x="188" y="404" font-family="Arial, sans-serif" font-size="64" fill="#2f3d44">Daily Image Journal</text>
  <text x="188" y="488" font-family="Arial, sans-serif" font-size="40" fill="#546367">${title}</text>
  <text x="188" y="552" font-family="Arial, sans-serif" font-size="30" fill="#546367">${theme}</text>
</svg>
`;

  await fs.writeFile(imagePath, svg, "utf8");
  await writeMetadata({
    metadataPath,
    provider: "mock",
    model: "mock-svg",
    imagePath,
    promptPackage,
    config,
  });

  return {
    provider: "mock",
    imagePath,
    metadataPath,
    promptPackage,
  };
}

async function createOpenAIClient(config) {
  if (!config.imageApiKey) {
    throw new Error("OPENAI_API_KEY or IMAGE_API_KEY is required when IMAGE_PROVIDER=openai.");
  }

  const { default: OpenAI } = await import("openai");
  return new OpenAI({ apiKey: config.imageApiKey });
}

async function generateOpenAIImage({ config, promptPackage, client, date = new Date() }) {
  await ensureDir(config.generatedImageDir);

  const openai = client || (await createOpenAIClient(config));
  const result = await openai.images.generate({
    model: config.imageModel,
    prompt: promptPackage.prompt,
    size: config.imageSize,
    quality: config.imageQuality,
    output_format: config.imageOutputFormat,
  });

  const imageBase64 = result.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI image generation returned no b64_json data.");
  }

  const slug = promptPackage.metadata.slug_suggestion;
  const baseName = `${dateStamp(date)}-${slug}`;
  const imagePath = path.join(config.generatedImageDir, `${baseName}.${config.imageOutputFormat}`);
  const metadataPath = path.join(config.generatedImageDir, `${baseName}.json`);

  await fs.writeFile(imagePath, Buffer.from(imageBase64, "base64"));
  await writeMetadata({
    metadataPath,
    provider: "openai",
    model: config.imageModel,
    imagePath,
    promptPackage,
    config,
  });

  return {
    provider: "openai",
    imagePath,
    metadataPath,
    promptPackage,
  };
}

async function generateImage({ config, date = new Date(), theme } = {}) {
  const promptPackage = buildPromptPackage({
    date,
    theme: theme || config.defaultTheme,
  });

  if (config.imageProvider === "mock") {
    return generateMockImage({ config, promptPackage, date });
  }

  if (config.imageProvider === "openai") {
    return generateOpenAIImage({ config, promptPackage, date });
  }

  throw new Error(`Unsupported IMAGE_PROVIDER: ${config.imageProvider}`);
}

module.exports = {
  generateImage,
  generateMockImage,
  generateOpenAIImage,
};
