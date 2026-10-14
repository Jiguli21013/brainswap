# Responsive layout validation

The compact staging layout preserves the palette, animations, image cover cropping, and all content. data/cards.json is byte-for-byte unchanged: 594 complete text records and 583 image URLs. Production is unchanged.

All 594 cards were measured in the real in-app browser at each requested viewport. A temporary fixture used the application renderer and prevented external image downloads; the actual website was separately checked for image cropping, document overflow, and keyboard navigation.

| Viewport | Cards tested | Scroll-free cards | Horizontal overflow | Text clipping |
|---|---:|---:|---:|---:|
| 1920 × 1080 | 594 | 594 | 0 | 0 |
| 1440 × 900 | 594 | 594 | 0 | 0 |
| 1366 × 768 | 594 | 594 | 0 | 0 |
| 1280 × 800 | 594 | 594 | 0 | 0 |
| 768 × 1024 | 594 | 0 | 0 | 0 |
| 390 × 844 | 594 | 0 | 0 | 0 |

All desktop/laptop navigation controls remain within the viewport. Tablet and mobile retain natural page scrolling, comfortable body text, and buttons at least 44 pixels high. Keyboard previous/next and existing appear animation were verified on the actual page. Integration tests passed. Browser zoom or larger text preferences may require scrolling; nothing is truncated or hidden to force a fit.
