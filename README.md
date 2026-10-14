# BrainSwap staging checkpoint

All **594** cards now have populated text. The latest continuation completed IDs **376–594** and preserved IDs **1–375**. Source-supported drafts remain partially verified; **zero** cards have completed independent fact-checking.

The public UI, IDs, ordering and original image fields were preserved through Phase 1. Production has not been replaced. data/cards.json remains the canonical runtime source.

See docs/phase1-completion.json for the text acceptance evidence and docs/workflow-state.json for the current phase. The latest fast URL pass is recorded in docs/fast-image-url-summary.md. Full manual review mode remains deferred by owner instruction. Strict validation still flags missing images, so this checkpoint is not ready for deployment.

## Image loading

The website now tries existing HTTPS image URLs without a verification-status display gate. Missing or broken images fall back to the mapped Wikipedia article’s lead image through an anonymous CORS API request. Successfully loaded Wikipedia URLs are cached in localStorage for 30 days and remain labeled unverified with source links. Existing attribution and rights notes are preserved. No candidateImages query option is required. Serve the staging directory with `python3 -m http.server 8000 --bind 127.0.0.1` and open `http://127.0.0.1:8000/`. See docs/wikipedia-image-loading-report.md for live test counts and limitations.

## Viewport-fitted layout

The entire interface now scales proportionally to fit the available window width and height with no document scrolling. All 594 cards pass real-browser fitting checks at all eight requested viewport sizes. The strict single-screen mode makes mobile text and buttons small: effective list text can fall to 8.28px at 390 × 844. See docs/viewport-fit-tests.md for the full test results and readability limitations.

## Cards excluded from display

Vladimir Putin (ID 478) and Adolf Hitler (ID 492) are excluded from the displayed deck at the owner’s request. The website shows 592 cards; canonical records and IDs remain preserved.

Required runtime files: `index.html`, `app.js`, `viewport-fit.js`, `image-loader.js`, `theme.js`, `themes.css`, `card-transitions.js`, `card-transitions.css`, and `data/cards.json`. Include all helper scripts and stylesheets when copying the staging website.

## Themes and transitions

Dark is the default. The header sun/moon button changes only the palette, saves the preference in localStorage, and preserves the current card. Both themes use the exact same fitted layout. Card changes use immediate 300ms directional slides; Surprise me uses a subtle fade/slide. Repeated input keeps only the latest incoming content, and reduced-motion preferences are respected. See docs/theme-transition-report.md and the paired screenshots for validation and inherited mobile readability limitations.
