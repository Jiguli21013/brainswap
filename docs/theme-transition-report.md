# Light theme and immediate card transitions

Dark remains the default and does not follow the OS color scheme. The new light theme uses the supplied cream, white, navy, blue, coral and pastel palette. Colors, backgrounds, borders, shadows and decorative image shading change through CSS custom properties; layout and typography are shared. The reference image’s layout and text were not copied.

The sun/moon button occupies unused header space and does not shift existing header elements. It supports native keyboard activation and accessible labels/pressed state. The selected theme is stored under brainswap:theme and restored before body paint. Theme changes do not reload, reset the current card, or start navigation animations.

## Layout validation

All 594 canonical cards were measured at eight viewport sizes in the original dark layout, updated dark theme and light theme. Positions and dimensions of the header, image, name, text sections and navigation were exactly equal in every comparison. No page overflow, text clipping or toggle overlap was found.

| Viewport | Cards per theme | Dark vs original | Light vs original |
|---|---:|---|---|
| 1920 × 1080 | 594 | Identical | Identical |
| 1440 × 900 | 594 | Identical | Identical |
| 1366 × 768 | 594 | Identical | Identical |
| 1280 × 800 | 594 | Identical | Identical |
| 1280 × 720 | 594 | Identical | Identical |
| 1024 × 768 | 594 | Identical | Identical |
| 768 × 1024 | 594 | Identical | Identical |
| 390 × 844 | 594 | Identical | Identical |

The geometry fixture used the application renderer and mocked image downloads only to avoid fetching 594 assets. Matching screenshots show the same Phoebe Buffay card and its actual stored image at 1366×768.

## Navigation validation

Next moves the outgoing panel left and the incoming panel from the right; Previous reverses this. The existing Surprise me button preserves random-deck/history behavior with a subtle 24px fade/slide. All use 300ms and cubic-bezier(0.22,1,0.36,1). Only transform and opacity are animated. Text changes immediately without waiting for image requests.

A temporary local server delayed real image responses by two seconds. Transitions started in 2.2–4.6ms while the new image was still loading. Rapid navigation kept one outgoing snapshot and one timer; same-direction input continued the running slide while updating the latest incoming content. No stale image replaced the latest card. The image placeholder-to-image change left portrait geometry unchanged. Broken image plus unavailable API retained the existing fallback. Reduced-motion tests updated content with no slide, snapshot or timer.

All four test suites passed. Canonical data is byte-for-byte unchanged: 594 records and 583 image URLs; the displayed deck retains 592 records, excluding Putin and Hitler. Production was not modified.

## Known limitations

The inherited strict single-screen layout still yields small mobile text (about 8–10px on longest cards at 390×844); the theme toggle also scales down with the interface. This task preserves the existing scaling rather than introducing a separate mobile layout.

Tests use one real browser engine at eight viewport sizes, with real two-second local image delay for navigation tests. Sustained FPS on physical mobile devices was not benchmarked.

Moving panels are intentionally clipped to the card region during the slide; resting card content remains fully visible.

Reduced-motion JS behavior was simulated in the browser fixture and unit tests; the actual OS preference was not changed.

The current site has no category selector; none was added from the reference image. Existing random-deck/history behavior and excluded IDs 478/492 remain intact.

## Files changed

- index.html
- app.js
- image-loader.js
- viewport-fit.js
- themes.css (new)
- theme.js (new)
- card-transitions.css (new)
- card-transitions.js (new)
- scripts/test-themes-transitions.mjs (new)
- README.md
- docs/workflow-state.json
- docs/theme-transition-report.md (new)
- docs/theme-transition-report.json (new)
- docs/theme-dark-preview.png (new)
- docs/theme-light-preview.png (new)
- ../brainswap-checkpoint.zip
