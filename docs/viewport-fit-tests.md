# Strict viewport-fit validation

The natural interface is measured, then uniformly scaled to fit both available width and height. Wide and stacked layouts are compared for the largest usable scale. All sections, navigation, footer warnings, and attribution links scale together. Window changes, card changes, font loading and image fallbacks trigger a coalesced fit update. Existing colors, typeface, image cropping and animations remain intact. No content is truncated or hidden to force a fit.

All 594 canonical cards were tested at all eight sizes in the real in-app browser using the actual renderer and scaling engine. The temporary test fixture avoids downloading 594 images and suppresses animations only for deterministic geometry checks. The actual website was separately tested for live resize recovery, keyboard navigation, image cropping and the appear animation.

| Viewport | Cards | Fits / no document scroll | Overflow / clipping / overlap / internal scrollbars | Minimum effective list font |
|---|---:|---|---|---:|
| 1920 × 1080 | 594 | PASS | None | 14.00px |
| 1440 × 900 | 594 | PASS | None | 13.87px |
| 1366 × 768 | 594 | PASS | None | 11.79px |
| 1280 × 800 | 594 | PASS | None | 12.30px |
| 1280 × 720 | 594 | PASS | None | 11.04px |
| 1024 × 768 | 594 | PASS | None | 10.49px |
| 768 × 1024 | 594 | PASS | None | 11.81px |
| 390 × 844 | 594 | PASS | None | 8.28px |

Every card retains its name, role, biography, five adjectives, question, three works and three facts. Navigation remains inside the viewport. document.scrollHeight <= innerHeight and document.scrollWidth <= innerWidth passed at every tested size. Runtime navigation still excludes IDs 478 and 492, leaving 592 displayed cards; the 594-record canonical data remains byte-for-byte unchanged with 583 image URLs. Production was not modified.

Both integration and viewport-fit unit tests passed.

## Readability limitations

Strict single-screen fitting trades readability for fitting on small screens. At 390×844, the longest cards have effective list text about 8.28px and biography text about 9.46px; footer text can be about 6.50px and buttons about 26px high. This is not a comfortable mobile reading/touch layout. All text remains present and visible; no truncation or scrolling is introduced.

At 1024×768, longest-card list text can be about 10.49px. At 1280×720 it can be about 11.04px. Larger windows are preferable for comfortable reading.

Tests use default browser font settings in one browser engine. Browser minimum-font preferences, zoom, or platform text settings can change the natural measurements and scaling; full mobile readability is not guaranteed.

## Files changed

- index.html
- app.js
- viewport-fit.js (new)
- scripts/test-integration.mjs
- scripts/test-viewport-fit.mjs (new)
- README.md
- docs/workflow-state.json
- docs/viewport-fit-tests.md (new)
- docs/viewport-fit-tests.json (new)
- docs/viewport-fit-all-card-measurements.json (new)
- docs/viewport-fit-laptop-preview.png (new)
- docs/viewport-fit-mobile-preview.png (new)
- ../brainswap-checkpoint.zip
