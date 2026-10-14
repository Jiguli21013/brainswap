# Stale-image navigation fix

Implemented in `/Users/home_folder/Documents/Codex/2026-10-13/files-pasted-by-the-user-you/outputs/brainswap`. Not deployed. Canonical data is byte-for-byte unchanged: SHA-256 `b29ec0c79791238fc73ba13c6649fed09f1a0241e567a36f1b8cff95dcb03192`.

## Cause and evidence

The renderer reused the visible portrait element and changed its src while replacement content loaded asynchronously. Changing src is not equivalent to replacing the image element and its painted state. Separately, card-enter faded the entire incoming card from opacity 0.15, allowing the outgoing card image underneath to show through overlapping transitions, particularly Random's small movement. The saved baseline's real computed opacity ranged from 0.15 to 1.0; the fixed incoming card remained at 1.0 in sampled frames.

The original loader already had navigation-generation protection against late requests. The persistent old-bitmap symptom was not reproduced in the controlled baseline test: its cached SVG placeholder was ready immediately. The baseline did confirm reused image-element identity, lack of explicit card ownership, and the transparency condition. This fix removes those mechanisms instead of adding a timing delay.

## Implementation

- `image-loader.js`: replace the portrait with a fresh element synchronously on every card change, with data-card-id and explicit loading/loaded/failed states. Loading displays a lightweight labeled SVG in the existing fixed image container. Probe and decode the new photo off-DOM, then atomically promote that already-decoded element to the visible portrait. Never assign a new photo URL to the reused previous portrait. Failed requests retain the existing fallback and attribution behavior.
- Every asynchronous DOM update checks navigation generation, active card ID, and that its element is still the active portrait. Cancellation also prevents an obsolete decode promise from entering the decoded cache. Existing Wikipedia lookup, URL caching, rights notes and statuses are retained.
- `card-transitions.css`: keep the incoming card opaque while preserving the existing horizontal directions, 300 ms timing and easing. New decoded photos have their own 180 ms opacity arrival animation, disabled for reduced motion.
- `card-transitions.js`: the outgoing snapshot remains an independent clone with its original image; remove the new photo-arrival animation from that clone so it does not restart while sliding out.
- Keep a bounded cache of six successfully decoded image elements. A recent cached stored image commits synchronously without a placeholder flash or repeated image request. No speculative next/previous or whole-deck preloading was added.

The text, IDs, deck algorithm, history, keyboard navigation, URLs, licensing metadata, theme palette and responsive layout are unchanged. The current website has no category filtering; no categories or filters were added.

## Tests

Updated `scripts/test-image-loader.mjs` with fresh ownership, slow A→B, overlapping A→B→C, explicitly delivered obsolete callbacks, stale decode promises, cache-return immediacy, loaded→failed/missing transitions, and bounded-cache/no-preload tests. Updated integration DOM mocks to model element replacement and decoded images; the full existing integration checks still pass.

Added `scripts/image-navigation-browser-fixture.js` and `scripts/serve-image-navigation-tests.py`. These create isolated HTTP responses with synthetic test cards and controlled image-response delays without changing cards.json. Only test image transport is remapped; loader and slide implementation are served from the actual project. Regression coverage includes slow images, differing load speeds, rapid Next, rapid Previous, alternating directions, Random, navigation during a slide, decoded cache returns, failed/missing images, and theme changes during requests. Per-frame checks reject stale remote pixels in a loading portrait, wrong card ownership, transparent incoming cards exposing a ghost image, and horizontal overflow. Image-container layout dimensions are checked independently of transforms.

| Browser viewport | Checks | Frames sampled | Violations |
|---|---:|---:|---:|
| desktop-1440 | 19/19 pass | 312 | 0 |
| laptop-1366 | 19/19 pass | 312 | 0 |
| mobile-390 | 19/19 pass | 313 | 0 |

The browser tool does not expose DevTools network throttling; the test server deliberately delays B by two seconds and C by 150 ms. This tests actual browser loading/decoding and overlapping navigation with deterministic slow responses. The same test suite was run against the saved baseline for comparison; baseline failures include the newly required ownership/state/cache behavior, not a reproduced persistent stale-bitmap count.

Existing integration, image-loader, viewport-fit and theme/transition tests pass, including keyboard navigation and reduced-motion cancellation. The real local website was also exercised using ArrowRight/ArrowLeft: Werner Heisenberg → Snow White → Werner Heisenberg; each completed image URL matched its card, the return was cached, no horizontal overflow appeared, and the console was clean. This was a small real-image smoke test, not a new whole-dataset image audit.

Browser evidence and a screenshot are saved in the workspace `stale-image-test-results` directory. Test-only responses and results are separate from canonical data and production.

To repeat the browser regression from the project directory:

```sh
python3 scripts/serve-image-navigation-tests.py
```

Open http://127.0.0.1:8013/test.html and click “Run navigation regression.” Results are written to /private/tmp/brainswap-image-navigation-tests/fixed-results.json. The optional saved-baseline comparison requires /private/tmp/brainswap-stale-before; normal regression testing does not.

No dependencies, public deployment, canonical changes, or production changes were introduced.
