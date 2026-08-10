# aetel-web

Source for [aetel.org](https://aetel.org), built with [Eleventy](https://www.11ty.dev/).

## Testing locally

Requirements: [Node.js](https://nodejs.org/) 20 or later.

```bash
npm install
npm run serve
```

This starts a local dev server (default `http://localhost:8080`) that rebuilds and
live-reloads as you edit files under `src/`. Stop it with `Ctrl+C`.

To build the static site without serving it (output goes to `_site/`, which is
gitignored):

```bash
npm run build
```

## Project structure

- `src/` — Eleventy input. Root pages and `quienes-somos/` are `.njk` templates;
  `noticias/` posts are Markdown with front matter.
- `src/_includes/` — shared layouts (`base.njk`, `post.njk`) and partials
  (head/header/footer).
- `src/_data/` — site-wide data: `nav.json` (navigation links) and `site.json`
  (site name, tagline, social links).
- `src/assets/` — CSS, JS, images, fonts, docs — copied to the output as-is.
- `eleventy.config.js` — build configuration (passthrough copy, date filters,
  the `noticias` collection, permalink handling).

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site
and publishes it to GitHub Pages.
