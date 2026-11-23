---
'@agar/core': patch
---

Leave the renderer's one-off warm-up (its WebGL2 context and first shader compile, often a tenth of a second) out of the physics, so the first popover opened on a page grows out of its trigger instead of appearing most of the way out.
