# ROLANG BEAUTY

## Working Directory

`/Users/KimlangStudy/work/personal-website`

## Structure

- `index.html` main site entry point
- `404.html` fallback page
- `src/data/site-data.js` store content, brand text, products, and links
- `src/components/` rendering helpers
- `src/styles/site.css` full styling
- `src/utils/` small client-side helpers
- `src/assets/` store images and icons
- `docs/preview-and-deploy.md` preview and deploy notes
- `.github/workflows/deploy.yml` GitHub Pages deployment workflow

## Preview

```bash
cd /Users/KimlangStudy/work/personal-website
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Update The Store

Edit:

`src/data/site-data.js`

That file controls the main shop content:

- brand name and intro
- email and links
- products and prices
- featured brands
- contact and cart text

## Deploy

Push the repository to GitHub, then enable GitHub Pages with the included workflow in:

`Settings > Pages > Source > GitHub Actions`
