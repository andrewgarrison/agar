# @agar/react

Accessible React components with soft-body jelly surfaces, built on [UI SDK](https://ui-sdk.dev).

> Early development. Not published yet.

```tsx
import '@agar/react/styles.css';
import { VisuallyHidden } from '@agar/react/visually-hidden';
```

Import the stylesheet once, before your own CSS. It sets the cascade layer order (`@layer ui-sdk, agar;`), so your own unlayered styles always win.
