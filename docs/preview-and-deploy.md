# Preview And Deploy

## Preview Locally

Static catalog preview from the project root:

```bash
cd /path/to/rolang-beauty
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Stop the preview server with `Ctrl+C`.

Shopify theme preview:

```bash
cd /path/to/rolang-beauty/rolang-beauty-theme
shopify theme dev --store rolangbeauty.myshopify.com
```

## Edit The Content

The main place to customize the site is:

`src/data/site-data.js`

Update your shop content:

- brand name
- intro
- email
- product list
- featured brands
- contact links

Shopify theme changes live in:

`rolang-beauty-theme/`

## Deploy With GitHub Pages

1. Push the repository to GitHub.
2. Push the project to the `main` branch.
3. In GitHub, open `Settings > Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Wait for the `Deploy GitHub Pages` workflow to finish.
6. Open the live site URL shown in the Pages settings.

The workflow copies only the site files into the Pages artifact, so notes in `docs/` stay out of the deployed site.

## Deploy With Shopify

```bash
cd /path/to/rolang-beauty/rolang-beauty-theme
shopify theme push --store rolangbeauty.myshopify.com --live
```
