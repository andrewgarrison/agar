# Agar

Accessible React components with soft-body **jelly** surfaces: WebGL2 shapes that squash, stretch and settle on real spring physics, drawn behind components built on [UI SDK](https://ui-sdk.dev).

> Early development. Nothing is published yet.

| Package | What it is |
|---|---|
| [`@agar/core`](packages/core) | The jelly engine and design tokens. No framework. |
| [`@agar/react`](packages/react) | React components. |

## Development

```bash
bun install
bun run dev      # watch-build the packages and run the docs app on :3000
bun run verify   # format, lint, build, typecheck (bun check), unit tests, size and package checks
bun run e2e      # Playwright + axe in Chromium, Firefox and WebKit
```

Changes to published packages need a changeset (`bun changeset`).

Git hooks run through [hk](https://hk.jdx.dev) (`brew install hk`). `bun install` installs them. Pre-commit formats and lints the staged files. Pre-push runs the same checks as CI's Checks job (`bun run verify`), in a few seconds.

## License

MIT
