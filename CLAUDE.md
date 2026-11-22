# Agar

Agar is a design system and component library, built to be published on npm. Its signature is **jelly**: soft-body WebGL2 surfaces that squash, stretch, wobble and settle on real spring physics, drawn over accessible components.

The name: agar is the seaweed gelatin that makes jelly set. It is also the start of "agarrison", the author's site (agarrison.dev), which will be the first real consumer.

This file is the project brief. It started as a handoff from a spike built inside the agarrison.dev repo, which proved the approach. Keep it up to date as decisions change.

## Goals

- **A publishable package.** Use semantic versioning with a changelog. Keep it tree-shakeable, with a tracked bundle size.
- **Accessible first.**
  - Meet WCAG 2.2 AA, with full keyboard support, correct focus management and correct ARIA.
  - Test manually with VoiceOver and NVDA.
  - The jelly is decoration only and must never carry meaning.
- **Typed, composable component APIs** in TypeScript.
- **Design tokens:** colour, spacing, typography, radius and motion, with light and dark themes. Jelly palettes are tokens too.
- **15–20 components, including the hard ones:**
  - Button, Input, Select, Checkbox, Radio, Switch
  - Dialog, Popover, Tooltip, Toast
  - Tabs, Accordion, Menu
  - Combobox
  - Date picker
  - Data table
- **Quality bar:**
  - Unit and interaction tests.
  - Automated accessibility checks with axe.
  - Visual regression tests in CI.
- **A docs site** with usage guidelines and do's and don'ts. Storybook was the original plan, but a custom docs app is fine if it shows the jelly better.
- **Dogfooding:** agarrison.dev gets rebuilt on Agar, starting with its dock.
- **Stretch goals:** sync tokens with Figma, ship a codemod for a breaking change, support right-to-left (RTL) text.

## Architecture

### Two layers

1. **Behaviour comes from UI SDK** (`@ui-sdk/core` and `@ui-sdk/react`, from vercel-labs/ui, https://ui-sdk.dev). It handles:
   - keyboard, focus, selection, dismissal and popups;
   - form participation;
   - ARIA.

   Its parts render with no styling. State shows up as data attributes (`data-checked`, `data-selected`, `data-open`, `data-starting-style`, `data-ending-style` and so on) and as measured CSS variables. Agar does **not** re-implement any of this.
2. **The look comes from Agar:** tokens, CSS, and the jelly layer. Agar components wrap UI SDK parts, style them through those data attributes, and drive the jelly from the same state.

Rule of thumb: when deciding *what* happens, ask UI SDK. When deciding *how it looks and moves*, Agar decides. A jelly binding only **reads** UI SDK's state; it never changes it.

### The jelly engine (framework-agnostic, no React)

It lives in `packages/core/src` (extracted from the spike in Phase 1, Nov 2026, matching the spike's physics to float rounding).

- **`body.ts`: physics, with no DOM.** A `JellyBody` works like this (the parts are in `edges.ts`, `surface-ring.ts`, `goal-shape.ts`, `shape.ts` and `spring.ts`):
  - Four edge springs (left, right, top, bottom) chase a target rectangle. On a sideways move the leading edge snaps first and the trailing edge follows a beat later.
  - A ring of 56 surface particles sits around those edges. Each has its own wobbly spring, partial inertia, area-preserving pressure, a slosh force, and smoothing between neighbours.
  - Volume is conserved: the body gets thinner when stretched and fatter when squashed.
  - A stretch limit stops it stretching forever, and soft walls let it squash against edges.
  - It uses a fixed 1/240 s step.
  - The goal shape is a rounded rectangle (`radius` option). Leaving `radius` out gives a pill.
  - API: `place`, `pressToward`, `pressInPlace`, `release`, `moveTo`, `morphTo`, `fadeTo`, `setBounds`, `setPointer`, `isAsleep`.
  - Every body has its own `params`, so they can be tuned live.
- **`renderer.ts`: one WebGL2 context for the whole page** (`gl-renderer.ts`, `canvas-renderer.ts`, `shader.ts`).
  - Browsers only allow about 16 live WebGL contexts per page, so components must never create their own.
  - Each component owns a plain 2D canvas, called its **surface**, that sits behind its content. The shared renderer draws that surface's bodies into one offscreen WebGL2 canvas, then copies the pixels across with `drawImage` in the same task. That means there's no need for `preserveDrawingBuffer`.
  - The fragment shader draws the ring as a signed distance field, rounded by `ROUND` (10px). It uses a bevelled normal for the specular highlight, rim, inner glow and stroke, adds a drop shadow, and outputs premultiplied alpha.
  - There's a Canvas 2D fallback, and it recreates the context if the context is lost.
- **`stage.ts`: one animation loop for every surface** (`loop.ts`).
  - Importing it has no side effects: the loop and its `visibilitychange` listener start with the first surface, so it's safe during SSR.
  - Steps every awake body and draws every awake surface.
  - Skips surfaces that are off screen (IntersectionObserver).
  - Stops entirely when the tab is hidden or everything is asleep.
  - A body with `breathe: 0` sleeps once it settles. Idle breathing keeps a body awake, so use it sparingly.
- **`palettes.ts`: jelly palettes, as tokens.** `JELLY_PALETTES[material][theme]`, where the material is `tint` (the dock's glassy dark tint), `milk` (solid switch thumbs) or `glass` (panels), and the theme is `light` or `dark`. Colours are `{ red, green, blue, alpha }`, 0 to 1. The rest of the token set (colour, spacing, type, radius, motion) is still to come.

### Binding patterns proven in the spike

- **Switch.**
  - A MutationObserver watches `data-checked` on the root. The real `SwitchThumb` stays rendered and is positioned by CSS with no transition, so the binding measures where it landed and springs the jelly there.
  - Pressing tugs toward the mirrored position. Releasing off the control springs back, detected with a `setTimeout(0)` check after pointerup.
- **Tabs.**
  - `TabsIndicator` writes `--active-tab-left/top/width/height` as **inline style** on itself, so the binding watches its `style` attribute and reads the variables.
  - `data-activation-direction="none"` means it's the first placement, so jump instead of spring.
  - Tabs select on **click**, not on pointerdown, which leaves time for the press tug.
- **Popover.**
  - The canvas lives inside `PopoverContent`, which needs `keepMounted` so the canvas exists before the first open. The canvas margin is large (72px) so the jelly can start on the trigger.
  - Opening: wait one frame for placement, `place()` the jelly on the trigger's box (measured relative to the content), then `morphTo()` the panel.
  - **Exit timing:** UI SDK keeps closing content mounted only for CSS transitions, or for script animations started in the **same task** as the close. In `onOpenChange(false)`, start a do-nothing Web Animation for the exit length (`content.animate([...], { duration: 360 })`), then morph the jelly back to the trigger. Verified: the content stays mounted through the shrink, then hides, and focus returns to the trigger.
- **Progressive enhancement.**
  - The surface sets `data-jelly="ready"` on its container. Plain CSS fallbacks (a visible thumb or indicator, a solid panel) apply until then, and without WebGL.
  - Canvases are `aria-hidden` and `pointer-events: none`.
  - `prefers-reduced-motion` critically damps every spring and turns off idle motion.

### UI SDK notes

- Pinned at `0.1.0-beta.14`, under Vercel's public beta terms, so APIs may change before 1.0. Pin exact versions and keep bindings thin, so an upgrade touches one place per component.
- It needs React 19 or later.
- The global stylesheet must start with `@layer ui-sdk;` so Agar's styles win over UI SDK's injected CSS. With Tailwind, it goes above `@import "tailwindcss"`. Agar's docs should tell consumers to do the same, or Agar can ship it.
- Parts accept `ref`, and `className`/`style` may be functions of state.
- `@ui-sdk/core/gesture` has `createVelocityTracker`, `solveSpring` and `rubberBand`. These are useful for Slider and Drawer.
- UI SDK ships an agent skill, which may be worth installing: `npx skills@latest add vercel-labs/ui --skill ui-sdk`.

## Package layout (decided; scaffolded in Phase 0)

A Bun workspace (`workspaces` and `catalog` in the root package.json; Bun is pinned to an exact canary in `packageManager`):

- `packages/core` → `@agar/core`
  - The jelly engine (`body`, `renderer`, `stage`, palettes) and tokens.
  - No React and no UI SDK. Pure TypeScript, ESM.
- `packages/react` → `@agar/react`
  - React components and hooks.
  - Peer dependencies: `react`, `react-dom`, `@ui-sdk/react` and `@ui-sdk/core`.
  - Each component is its own entry point, for tree-shaking (`@agar/react/switch`).
  - Mark client components with a `"use client"` banner.
  - CSS ships as a side-effect import (`@agar/react/styles.css`, declared in `sideEffects`).
  - `@agar/react` **wraps** UI SDK in its own composable parts with its own prop types, rather than re-exporting UI SDK's parts. This keeps UI SDK's beta churn from reaching consumers.
  - `styles.css` declares `@layer ui-sdk, agar;`, so consumers don't need to add the `@layer ui-sdk;` line themselves. Their unlayered CSS beats both layers.
- **Component template: Switch** (`packages/react/src/switch`). Copy its shape for every other component:
  - One component per file (`Switch.tsx`, `SwitchThumb.tsx`), a `context.ts` when parts share refs, and the jelly binding as a hook (`use-switch-jelly.ts`). `index.ts` is the entry point, and the root barrel re-exports by name.
  - Agar declares its own prop types. React's props allow an explicit `undefined`, and UI SDK's don't (`exactOptionalPropertyTypes`), so the props passed to a UI SDK part (`disabled`, `id`, `className`, `style` and the like) are redeclared without `| undefined`.
  - The consumer's event handlers run first, then the jelly's. Compose them inside the binding hook, not inline in JSX.
  - Shared React internals live in `src/internal` and are imported as `#internal/*` (package.json `imports`). Lint bans `../` imports. tsdown rewrites `#internal/*` to relative paths in `dist`.
  - `internal/use-jelly.ts` gives a component one surface with one body, sized to its container. If no canvas can be made (jsdom, or no 2D context), it does nothing, so the CSS fallback stays.
  - **Theme:** `data-theme="light"` or `"dark"` on `<html>`, or else the OS setting (`internal/theme.ts`). The CSS follows the same two things through `color-scheme` and `light-dark()`. There's no provider and no `theme` prop.
  - Per-component CSS custom properties (`--agar-switch-track` and so on) stand in for tokens until the token set exists.
  - **Switch track (decided Nov 2026):** pale frosted glass when off, as in the spike, because a dark track showing through the translucent milk jelly made it look flat. The edge and the on fill keep 3:1; the white thumb on the off track is about 1.3:1, as on iOS, and the docs say so. The motion keeps the spike's tuning exactly (checked frame by frame against PR #9).
  - New form controls go in the `controlComponents` list for `jsx-a11y/label-has-associated-control` in `.oxlintrc.json`.
- `apps/docs`: a custom Next.js app for the docs and playground. The spike's lab page is a starting point.
- Tooling (chosen):
  - **tsdown**: `unbundle` mode, so there's one output file per module and each keeps its `'use client'` banner.
  - **Changesets** for releases. `.github/workflows/release.yml` opens a "Version packages" PR, and merging it publishes.
  - **`bun test`** with Testing Library. Test files import from `vitest`, and Bun runs them natively (the Vitest package isn't installed). Types come from `bun-types/vitest`, and the canary `bun-types` is pinned. The `[test]` settings in `bunfig.toml` give jsdom by default, `isolate = "modules"`, random order, and a reset of every mock and stub after each test. Core test files start with `// @vitest-environment node`, so core stays DOM-free.
  - **Playwright** with axe, on Chromium, Firefox and WebKit. Visual baselines are Chromium-only and rendered on Linux. Regenerate them with the "Update visual snapshots" workflow, never from a Mac.
  - **size-limit**, `.size-limit.json`, with one entry per component entry point.
  - **publint** and **attw**, which check `bun run check:pkg` before publishing.
  - **`bun lint`** (oxlint rules, read from `.oxlintrc.json`): every category is on, at error, with `--type-aware`. Each rule that's off says why. Lint rules only stay or grow.
  - **Biome**, narrowed to what `bun lint` can't check: every recommended CSS rule, plus seven JavaScript rules with no oxlint equivalent (`noSvgWithoutTitle` and six others, listed in `biome.json`). It doesn't format. It skips `seed/` and Markdown.
  - **`bun fmt`** formats JS, TS, JSON, CSS, YAML and TOML, and sorts imports. Its settings are in `bunfig.toml` `[fmt]`. It skips `seed/` and Markdown, so this brief stays hand-written. CI runs `bun run fmt:check`.
  - TypeScript 7 with `isolatedDeclarations` in the packages, so exported functions need explicit return types. **`bun check`** type-checks: at the root it runs the tooling project and then each workspace's `check` script. Project references aren't used, because they would force `composite` and emit on every project.
- Commands:
  - `bun run verify` runs everything CI's check job runs.
  - `bun run e2e` runs the Playwright tests. Its server uses port 3100, so it never collides with a dev server on 3000.
- E2E keyboard tests use `tab()` from `e2e/keyboard.ts`. WebKit follows Safari, where plain Tab skips buttons and links.
- E2E jelly checks use `e2e/jelly.ts`: it reads the drawn jelly back from the surface's canvas (`trackJelly`, `settledJelly`), and `patchContexts` refuses WebGL or every canvas context and counts WebGL2 contexts. `e2e/switch.spec.ts` is the template.
- `next dev` won't run twice from the same app folder, so stop any docs dev server before `bun run e2e` (its server is `next dev` on port 3100).
- UI SDK coverage (checked at `0.1.0-beta.14`): it has every planned component except **Data table**, which needs its own headless layer (TanStack Table is the likely choice). It also has `calendar`, `date-picker`, `drawer`, `slider` and `segmented-control`.
- Before publishing, create the `agar` npm org to claim the `@agar` scope. `@agar/ui` was unused on npm in Nov 2026, but the unscoped `agar` is taken. If the scope isn't available, fall back to `@agarrison/agar`.

## CI

Target: a PR gets its result in under 2 minutes. CI is the project's foundation, so it stays simple and standard: use each tool's supported path, not clever workarounds, even when a workaround is a few seconds faster. Three rules outrank speed:
- The full suite runs on every PR. There's no merge queue (decided Nov 2026), so the PR run is what guards `main`. Diff-based test selection would let untested code reach `main`, so CI doesn't select.
- Never hide a failure. No retries (Playwright's `retries` is 0), no wider test timeouts, no skipped tests. A check that needs a retry has a bug: find it.
- Never check less. Lint rules and required checks only stay or grow.

How CI is shaped (`.github/workflows/ci.yml`):
- **`Checks` job:** format, build, then lint, unit tests, types, size and package exports against the build. Workspace packages resolve each other through their built `dist` (package exports), so anything that imports `@agar/core` needs the build first. One plain step per check, each running even when an earlier one fails (or skipping when the build fails), so one run reports every failure.
- **`E2E + axe` jobs:** one per browser, each independent. No required job waits on another.
- **Setup:**
  - `.github/actions/setup` makes a blobless clone and restores the pinned Bun and `node_modules` from caches keyed on `bun.lock`. Bun comes from npm, because the pinned canary only exists there as a versioned build.
  - Browsers and the Next.js build cache are cached too. Chromium installs only its headless shell (`--only-shell`), the only part headless tests use.
  - WebKit's OS libraries are installed with `playwright install-deps` on every run (about 20–40 s), because that's the supported way. Unpacking them into a cache was tried and worked, but needed linker and graphics-driver workarounds (Nov 2026).
  - Caches are saved right after they're built, not at the end of the job, so a failing job still warms them. PRs restore what `main` saved.
- **Speed:** job `timeout-minutes` only catch hangs. Speed is tracked, not gated: timing gates on shared runners fail at random, because the same job's setup varies by 2× from run to run.
- **Cancellation:** a new commit cancels a PR's run. Runs on `main` are never cancelled.
- **Audit:** `bun scripts/ci/audit.ts [--branch b] [--runs n]` splits real runs into waiting, setup and running at p50 and p95. Fix the biggest bucket first.
- **CI stays free:** GitHub-hosted runners on the public repo only. No paid or third-party runners (Blacksmith was considered and rejected, Nov 2026).
- **Revisit later:** test sharding and per-file timings. With a few tests running in well under a second, one shard is fastest.

## Starting code (`seed/`)

The spike from agarrison.dev's `jelly-design-spike` branch (closed PR #9 there). `seed/` is reference material: move code out of it into the packages as it's extracted, and delete the folder once it's empty. Don't import from it, and keep it out of builds, lint and tests.

| File | State | Notes |
|---|---|---|
| `body.ts`, `renderer.ts`, `stage.ts`, `palette.ts` | Done | Moved into `@agar/core` (Phase 1). The `.tsx` files below still import them by their old paths; read those imports as `@agar/core`. |
| `useJelly.ts`, `JellySwitch.tsx` | Done | Moved into `@agar/react` as `internal/use-jelly.ts` and `switch/` (Nov 2026). The files below that import `./useJelly` should use `#internal/use-jelly` instead. |
| `JellyTabs.tsx` | Spike quality | Takes a `tabs` array. A real API should be composable parts like UI SDK's. |
| `JellyPopover.tsx` | Spike quality | Same as above. Also has a hard-coded "Done" button. |
| `jelly.css` | Spike quality | Uses the site's CSS variables (`--dock-bg`, `--accent-deep`, ...), which need replacing with Agar tokens. Its Switch styles have moved to `styles.css`. |
| `JellyLab.example.tsx` | Reference | The `/lab` demo page, for the docs app. |
| `audio/*.m4a` | Optional | The press-down and press-up sounds. |

Known site-specific dependencies to remove while extracting:
- `use-sound` and hard-coded `/audio/...` paths. Make sound opt-in, for example a `sounds` prop or provider, and never bundle audio files.
- `@/` path aliases and the site's CSS variables.

## What's verified and what isn't

Verified in Chromium on desktop:
- All surfaces share one WebGL context (six on the spike's lab page, including the site's dock).
- Mouse, keyboard (Space, arrow keys, Escape) and focus return work.
- The popover's exit timing works.
- Light and dark palettes work, including on bodies that are asleep.
- Once settled, only bodies with `breathe > 0` keep drawing.
- Frame cost for the dock was about 0.13 ms.

Verified by e2e in Chromium, Firefox and WebKit (Switch, Nov 2026; macOS locally, Linux in CI):
- Every surface on a page shares one WebGL2 context.
- The jelly is drawn where UI SDK's thumb is, springs there on a toggle, tugs on press, and springs back when the pointer is released off the switch.
- Under reduced motion it never overshoots.
- Without WebGL, Canvas 2D draws it. With no canvas context at all, the CSS thumb shows and the switch still works.

Not yet tested:
- Touch devices.
- Screen readers.
- Many surfaces at once (for example 50 switches).
- High-DPR performance. The device pixel ratio is capped at 2.

## Open questions

- Should the shared renderer use an `OffscreenCanvas` or a worker? Measure first.
- Should bodies on one surface be batched into a single draw, and should large panels draw only inside a scissor rectangle?
- Which components get a jelly at all, and which stay plain? A sketch:
  - Button: a squish when pressed.
  - Checkbox and Radio: a blob that pops in.
  - Slider: a thumb that stretches with the drag speed.
  - Dialog, Drawer and Toast: panel surfaces.
  - Accordion: a height that overshoots and settles.
- ~~Should Agar expose UI SDK's parts directly, or wrap them?~~ Decided: wrap them (see Package layout).

## Conventions

- **Don't push to main. Use branches and pull requests.** The repo starts empty, so the very first commit (this brief and `seed/`) is the one exception: it creates `main`.
- Strict TypeScript. Every component is typed and composable.
- Every component ships with a keyboard test, an axe check, a reduced-motion check and a no-WebGL fallback.
