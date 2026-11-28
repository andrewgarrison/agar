---
'@agar/core': minor
---

Add lens lighting for clear jelly glass (after bilalgursen/liquid-glass, MIT): the new `frost` palette (`lens: true`) shades what's behind it, lights a thin line inside the rim that turns toward the mouse cursor, and casts a tight shadow. Also adds `outlinePath()` (the drawn outline as an SVG path, for clipping a CSS backdrop blur to the jelly), `JellySurface.onDraw`, and `DrawTarget.light`.

Breaking: `JellyPalette` has a new required `lens` field. A palette you build yourself needs `lens: false` for the usual jelly lighting.
