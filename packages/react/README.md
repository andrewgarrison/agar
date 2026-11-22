# @agar/react

Accessible React components with soft-body jelly surfaces, built on [UI SDK](https://ui-sdk.dev).

> Early development. Not published yet.

```tsx
import '@agar/react/styles.css';
import { Switch } from '@agar/react/switch';

<label>
  Airplane mode
  <Switch />
</label>;
```

Import the stylesheet once, before your own CSS. It sets the cascade layer order (`@layer ui-sdk, agar;`), so your own unlayered styles always win.

Light and dark themes follow `data-theme="light"` or `"dark"` on `<html>`, or else the OS setting.

## Components

- `@agar/react/switch`: `Switch` and `SwitchThumb`
- `@agar/react/visually-hidden`: `VisuallyHidden`
