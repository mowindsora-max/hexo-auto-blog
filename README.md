# Daily Image Journal

Automated Hexo blog that can generate a daily image, optimize it, create a Hexo post, build static pages, validate the site, and deploy to GitHub Pages.

## Local Commands

```powershell
npm ci
npm run daily
npm run build
npm run validate
npm run serve
```

## Daily Automation

The workflow lives at `.github/workflows/daily-blog.yml`.

It runs every day at `22:00 UTC`, which is `06:00` in Asia/Shanghai on the next calendar day, and can also be started manually from the GitHub Actions tab.

The workflow does this:

1. Install dependencies with `npm ci`.
2. Run `npm run daily`.
3. Commit generated source posts and image assets.
4. Build the Hexo site.
5. Run `npm run validate`.
6. Upload `public/` as a GitHub Pages artifact.
7. Deploy the artifact to GitHub Pages.

## GitHub Setup

In the GitHub repository:

1. Go to **Settings > Pages**.
2. Set **Build and deployment > Source** to **GitHub Actions**.
3. Add repository secret `OPENAI_API_KEY` if using the OpenAI provider.
4. Add repository variables as needed:

```text
IMAGE_PROVIDER=openai
IMAGE_MODEL=gpt-image-2
IMAGE_SIZE=1536x1024
IMAGE_QUALITY=medium
IMAGE_OUTPUT_FORMAT=png
IMAGE_OPTIMIZATION_QUALITY=82
DEFAULT_IMAGE_THEME=daily creativity image study
MAX_OPTIMIZED_IMAGE_BYTES=1048576
```

For a no-cost test deployment, set `IMAGE_PROVIDER=mock` or omit it.

## Environment

Copy `.env.example` to `.env` for local runs.

Do not commit `.env`.
