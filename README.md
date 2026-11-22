# Agar

Accessible React components with soft-body **jelly** surfaces: WebGL2 shapes that squash, stretch and settle on real spring physics, drawn behind components built on [UI SDK](https://ui-sdk.dev).

> Early development. Nothing is published yet.

| Package | What it is |
|---|---|
| [`@agar/core`](packages/core) | The jelly engine and design tokens. No framework. |
| [`@agar/react`](packages/react) | React components. |

## Development

```bash
pnpm install
pnpm dev       # watch-build the packages and run the docs app on :3000
pnpm verify    # lint, build, typecheck, unit tests, size and package checks
pnpm e2e       # Playwright + axe in Chromium, Firefox and WebKit
```

Changes to published packages need a changeset (`pnpm changeset`).

## License

MIT
