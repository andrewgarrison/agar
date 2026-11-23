---
'@agar/core': patch
---

Make the `glass` jelly palette a plain, opaque panel: white in light mode, charcoal in dark, so text on it is always legible. Also fix a surface that stopped drawing when its canvas was hidden and shown again quickly: the stage now reads the latest IntersectionObserver entry, not the oldest.
