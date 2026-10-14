# BrainSwap staging checkpoint

All **594** cards now have populated text. The latest continuation completed IDs **376–594** and preserved IDs **1–375**. Source-supported drafts remain partially verified; **zero** cards have completed independent fact-checking.

The public UI, IDs, ordering and original image fields were preserved through Phase 1. Production has not been replaced. data/cards.json remains the canonical runtime source.

See docs/phase1-completion.json for the text acceptance evidence and docs/workflow-state.json for the current phase. The latest fast URL pass is recorded in docs/fast-image-url-summary.md. Full manual review mode remains deferred by owner instruction. Strict validation still flags missing images, so this checkpoint is not ready for deployment.

## Local candidate image preview

Serve the staging directory locally (for example, `python3 -m http.server 8000 --bind 127.0.0.1`) and open `http://127.0.0.1:8000/?candidateImages=true`. This explicit local-only option shows HTTPS candidates labeled unverified with source links and any existing licensing warnings. Public hosts keep existing image eligibility rules. No full manual review workflow is implemented. Candidate image load failures retain the fallback.

## Responsive layout

The compact layout uses dynamic viewport height and retains natural scrolling when needed. All 594 cards fit at 1920 × 1080, 1440 × 900, 1366 × 768, and 1280 × 800 in the real browser tests. Tablet/mobile preserve readable single-column content with vertical scrolling. See docs/responsive-layout-tests.md.
