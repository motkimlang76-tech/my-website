# Shopify Import

Run this from the repo root to rebuild the Shopify product CSV from `src/data/site-data.js`:

```bash
node scripts/export-shopify-products.mjs
```

The generated file is:

`shopify-import/rolang-products.csv`

Import it from Shopify admin:

1. Go to `Products`.
2. Click `Import`.
3. Upload `shopify-import/rolang-products.csv`.
4. Keep the imported products as draft until prices, policies, and collections are reviewed.

Notes:

- The CSV uses the current product guide data already in this repo.
- Imported products are marked `draft` and `Published on online store` is `false`.
- Product images point to public raw GitHub URLs from this repository.
- Prices are left blank so you can set real prices in Shopify before publishing.
