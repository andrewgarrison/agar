---
'@agar/react': patch
---

Add `Button` (`@agar/react/button`): a button made of jelly glass. At rest it's clear glass with a light blur, a soft shade and a bright rim that turns toward the mouse cursor. Pressed, by pointer or Space/Enter, it squishes deep and slow like gelatin and wobbles softly as it settles, and it breathes while an `onClick` Promise is pending. It also supports disabled and focusable-when-disabled states, and falls back to a frosted pill without a canvas. Also adds the system colours `--agar-accent`, `--agar-accent-text` and `--agar-focus` on `:root`, which the Switch's on fill and every focus ring now use.
