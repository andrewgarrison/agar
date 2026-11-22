# @agar/core

Agar's framework-agnostic jelly engine (spring physics, a shared WebGL2 renderer, one animation loop) and design tokens. Most apps want [`@agar/react`](../react) instead.

> Early development. Not published yet.

```ts
import { JELLY_PALETTES, JellyBody, JellySurface } from '@agar/core';

const surface = new JellySurface(canvas); // a 2D canvas behind your content
const body = new JellyBody({ radius: 12 });
surface.add(body, JELLY_PALETTES.milk.light);
surface.resize(width, height); // from a ResizeObserver
body.place({ left: 0, right: 40, top: 0, bottom: 24 });

body.moveTo({ left: 60, right: 100, top: 0, bottom: 24 });
surface.wake(); // after changing any body
```
