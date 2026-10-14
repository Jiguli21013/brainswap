# Wikipedia image-loading fallback

The staging website now tries every existing HTTPS image URL regardless of verification status. Missing or failed images request the existing wikiTitle through the MediaWiki PageImages API. Successful Wikipedia fallbacks are cached in localStorage for 30 days. Returned thumbnails are preferred, and returned original URLs can recover failed thumbnails. Nothing in data/cards.json is changed.

All newly retrieved images remain unverified. Source and image-file links are shown, existing rights warnings are preserved, and original attribution is clearly separated when it refers to a different stored image. Image/API timeouts, missing/ambiguous pages, API errors, offline failures, HTTP 429 cooldowns, broken cache recovery, storage failures and rapid navigation are covered by tests.

## Counts and scope

- Canonical cards: 594; active deck: 592 (Putin and Hitler remain excluded).
- Stored URL records: 583 canonical, 581 active. These are available URL counts, not a bulk successful-download count.
- Cards without stored URLs: 11. All 11 were tested live and retained placeholders because no usable API lead image was returned.
- Combined live test sample: 13 cards — 1 stored, 1 Wikipedia fallback, 11 placeholders. Henry VIII’s stored image works; its fallback was tested by simulating stored-image failure.
- Henry VIII successfully loaded a real API-provided thumbnail, and a page reload reused localStorage with zero additional Wikipedia API requests.

No bulk availability audit of all 581 active stored images was performed. Successful full-deck totals depend on image/network availability and can be measured as cards are visited with getImageLoadingStats().

## Validation

All three test suites passed: test-integration.mjs, test-image-loader.mjs and test-viewport-fit.mjs. All 594 cards also passed real-browser geometry checks at 1920×1080, 1440×900, 1366×768, 1280×800, 1280×720, 1024×768, 768×1024 and 390×844 with image downloads mocked only in the layout fixture. Actual API/image retrieval was tested separately for Henry VIII and the 11 missing-URL cards. No page overflow, clipping, overlap or internal scrollbars were detected.

## Remaining limitations

Live successful image counts depend on the network and visited cards; no bulk download audit of all 581 stored active URLs was performed. getImageLoadingStats() reports last completed outcomes for unique cards visited in the current page session.

The 11 active cards without stored URLs returned no usable lead image in the live check. Their articles/mappings may redirect to lists or have no lead image; this pass does not rewrite mappings or manually research replacement images.

Wikipedia lead images and cached fallbacks are unverified; an article lead image may be a composite or an adaptation different from the card. Obvious logos, missing articles and disambiguation pages retain a fallback.

Rate limits, offline access, blocked CORS, or failure of both thumbnail and original keep a placeholder. No automatic repeated retry storm is introduced.

GitHub Pages compatibility was checked through anonymous HTTPS origin=* requests and simulated github.io integration tests. The public production site was not deployed or changed.

The existing strict single-screen mobile readability limitation remains.

## Runtime files

Include index.html, app.js, viewport-fit.js, image-loader.js and data/cards.json when copying the staging website. Relative script/data paths and anonymous HTTPS CORS API requests support GitHub Pages without a backend. Production was not changed.

[PageImages API](https://www.mediawiki.org/wiki/Extension:PageImages#API) · [CORS documentation](https://www.mediawiki.org/wiki/API:Cross-site_requests)
