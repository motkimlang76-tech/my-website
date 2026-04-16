# ROLANG BEAUTY Launch Board

This file is the active source of truth for long-running storefront work. Do not change priorities casually. Keep the work minimal, clean, consistent, and launch-focused.

## Non-negotiable direction

- Keep the visual system minimal, clean, and professional.
- Favor consistency over novelty.
- Do not overcomplicate the page with noisy decoration.
- Any background treatment should stay subtle and support readability.
- Use a restrained, premium Korean skincare feel rather than generic ecommerce styling.
- Treat the second launch market as Cambodia unless clarified otherwise.

## Active priorities

- [ ] Refine the bubble-flower brand icon so it feels native to the store, not decorative for its own sake.
- [ ] Normalize typography into one coherent system with consistent font usage, spacing, scale, and hierarchy.
- [x] Normalize the button system so primary, secondary, nav, and action states feel related and theme-aligned.
- [ ] Add subtle background cues only where they improve polish without adding visual clutter.
- [x] Publish all catalog products to the Online Store with sensible MYR pricing.
- [x] Publish the intended collections and verify the public collection pages resolve correctly.
- [ ] Support Malaysia and Cambodia in markets and shipping configuration.
- [x] Push the cleaned theme live and verify home, product, collection, search, and cart pages publicly.
- [ ] Commit and push the validated source of truth back to GitHub.

## Validation gates

- [x] `shopify theme check --path rolang-beauty-theme`
- [x] `git diff --check`
- [x] Public storefront spot-check after publish
- [x] Admin check that products are active and published
- [ ] Admin check that target markets and shipping zones are configured

## Current note

- Cambodia exists as a live market in Shopify admin.
- Cambodia also exists as a shipping zone in the General profile.
- The remaining gap is attaching a final Cambodia shipping rate; the admin drawer for that action is unstable under automation and still needs one more successful write path.
