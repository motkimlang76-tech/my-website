# Preview And Deploy

## Preview Locally

From the project root:

```bash
cd /Users/KimlangStudy/work/personal-website
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Stop the preview server with `Ctrl+C`.

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

## Deploy With GitHub Pages

1. Create a GitHub repository for this folder.
2. Push the project to the `main` branch.
3. In GitHub, open `Settings > Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Wait for the `Deploy GitHub Pages` workflow to finish.
6. Open the live site URL shown in the Pages settings.

The workflow copies only the site files into the Pages artifact, so notes in `docs/` stay out of the deployed site.
