const fs = require("node:fs/promises");

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "") || "daily-image-study";
}

async function loadPromptText({ promptFilePath }) {
  try {
    const markdown = (await fs.readFile(promptFilePath, "utf8")).replace(/^\uFEFF/, "");
    return markdown
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n")
      .trim();
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function titleFromTheme(theme) {
  return theme
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildPromptPackage({ date = new Date(), theme = "daily creativity image study", promptText = "" } = {}) {
  const slug = slugify(theme);
  const isoDate = date.toISOString().slice(0, 10);
  const title = titleFromTheme(theme);

  if (promptText.trim()) {
    const prompt = promptText.trim();
    return {
      prompt,
      metadata: {
        title_suggestion: title || "Game Illustration",
        slug_suggestion: slug,
        theme,
        subject_role: "adult ethereal female game character",
        visual_hook: "A mysterious poetic ritual moment in a 2D game illustration.",
        style_preset: "persisted-markdown-prompt",
        aspect_ratio: "1536x1024",
        palette: ["cold moonlight", "mist white", "ink blue", "muted silver"],
        tags: ["generated-image", "daily-journal", "game-illustration"],
        categories: ["image-journal"],
        negative_details: [
          "minor or ambiguous-age character",
          "sexualized framing",
          "random logos",
          "watermarks",
          "unreadable text",
        ],
        prompt,
      },
    };
  }

  const prompt = [
    "Subject and role:",
    `An adult visual field researcher documenting ${theme} for a daily image journal.`,
    "",
    "Visual hook:",
    "A precise everyday object becomes the emotional anchor of the scene, making the image feel observed rather than generic.",
    "",
    "Scene:",
    `A grounded editorial environment connected to ${theme}, with believable background details and a quiet sense of time passing.`,
    "",
    "Wardrobe / object system:",
    "Functional layered clothing, a notebook, simple tools, textured paper, and one carefully placed material accent.",
    "",
    "Composition:",
    "Three-quarter editorial framing, clear foreground/midground/background separation, generous negative space for blog layout, no text overlays.",
    "",
    "Lighting:",
    "Soft directional natural light with gentle shadow falloff, controlled highlights, and consistent light direction.",
    "",
    "Color and texture:",
    "Muted coastal blue, warm paper white, graphite gray, weathered green, and one restrained amber accent; tactile, natural textures.",
    "",
    "Style and output:",
    `Cinematic editorial image, refined realism, high detail, suitable as a Hexo blog cover, dated ${isoDate}.`,
    "",
    "Constraints / avoid:",
    "Avoid generic beauty-shot language, distorted hands, extra fingers, unreadable text, random logos, watermarks, over-sharpening, muddy shadows, inconsistent perspective, and chaotic backgrounds.",
  ].join("\n");

  return {
    prompt,
    metadata: {
      title_suggestion: title || "Daily Image Study",
      slug_suggestion: slug,
      theme,
      subject_role: "adult visual field researcher",
      visual_hook: "An everyday object anchors the visual story.",
      style_preset: "cinematic-editorial-realism",
      aspect_ratio: "1536x1024",
      palette: ["muted coastal blue", "warm paper white", "graphite gray", "weathered green", "amber accent"],
      tags: ["generated-image", "daily-journal"],
      categories: ["image-journal"],
      negative_details: [
        "generic beauty-shot language",
        "distorted hands",
        "extra fingers",
        "unreadable text",
        "random logos",
        "watermarks",
        "inconsistent perspective",
      ],
      prompt,
    },
  };
}

module.exports = {
  buildPromptPackage,
  loadPromptText,
  slugify,
};
