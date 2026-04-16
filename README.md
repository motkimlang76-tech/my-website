# ROLANG BEAUTY

Shopify storefront and product catalog source for Rolang Beauty.

## Working Directory

`rolang-beauty`

## Structure

- `rolang-beauty-theme/` primary Shopify theme source
- `index.html`, `404.html`, and `src/` legacy static catalog source used by GitHub Pages
- `scripts/` Shopify sync and export utilities
- `shopify-import/` generated CSV imports and launch reports
- `src/data/site-data.js` catalog content, pricing, and product metadata
- `src/assets/` product imagery used by the legacy catalog and Shopify imports
- `docs/preview-and-deploy.md` local preview and deployment notes
- `.github/workflows/deploy.yml` GitHub Pages workflow for the legacy static catalog

## Preview

Static catalog preview:

```bash
cd /path/to/rolang-beauty
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Shopify theme preview:

```bash
cd /path/to/rolang-beauty/rolang-beauty-theme
shopify theme dev --store rolangbeauty.myshopify.com
```

## Main Content Sources

- `src/data/site-data.js` controls catalog copy, brands, and product details
- `scripts/export-shopify-products.mjs` generates the Shopify CSV import
- `scripts/sync-shopify-launch.mjs` syncs the launch assortment into Shopify
- `scripts/sync-shopify-draft-catalog.mjs` loads the remaining catalog into Shopify as draft products
- `scripts/sync-shopify-live-catalog.mjs` prices and syncs the full live catalog with collection grouping

## Deploy

Primary commerce deployment is Shopify.

GitHub Pages remains available for the legacy static catalog through:

`Settings > Pages > Source > GitHub Actions`
