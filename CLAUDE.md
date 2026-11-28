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
  - `release(target)` and `moveTo(target)` ignore a target the body is already heading for (it only lets go of a press), and a move with no sideways distance keeps its direction.
  - Every body has its own `params`, so they can be tuned live.
- **`renderer.ts`: one WebGL2 context for the whole page** (`gl-renderer.ts`, `canvas-renderer.ts`, `shader.ts`).
  - Browsers only allow about 16 live WebGL contexts per page, so components must never create their own.
  - Each component owns a plain 2D canvas, called its **surface**, that sits behind its content. The shared renderer draws that surface's bodies into one offscreen WebGL2 canvas, then copies the pixels across with `drawImage` in the same task. That means there's no need for `preserveDrawingBuffer`.
  - The fragment shader draws the ring as a signed distance field, rounded by `ROUND` (10px). It uses a bevelled normal for the specular highlight, rim, inner glow and stroke, adds a drop shadow, and outputs premultiplied alpha.
  - **Jelly glass (decided Nov 2026): the system's look.** Glass at a glance, gelatin once you touch it: after Apple's Liquid Glass, but softer, more fluid and more playful, and soothing (ASMR-like) to press. At rest it has no colour of its own (decided Nov 2026, after the user's Control Center reference). Since Nov 2026 it's modelled on bilalgursen/liquid-glass (MIT, the same idea as ours), whose lighting we port as the shader's **lens mode** (`uLens`, `palette.lens`): a light 2px blur, the page shaded about 10% (a touch bluish, darker at the top and left end), a bright 1px line of light just inside the rim (strongest bottom and right), and a tight shadow. The rim light turns toward the mouse cursor anywhere on the page, as theirs does (`cursor.ts`: page-wide `pointermove`, mouse only, listeners added with the first lens surface): each surface eases it in at 6/s while the cursor is on the page and out when it leaves, and the renderer aims it from each body's centre in half-degree steps (`uLight`). It leans further than theirs (`LEAN` 0.8 in `shader.ts`; theirs is 0.4, which barely showed on ours). Their hover swell and press light are left out: our jelly keeps its own hover lean and squish. Their glass also refracts a snapshot of the page, which a canvas can't do, so we don't. Lens mode blends the outward direction and the distance across neighbouring ring edges (`soften` in `shader.ts`), deeper than 2 to 10px inside the polygon: plain polygon distances show the ring's facets at the ends, and blending right at the polygon puts a dotted line along it. An earlier Apple-style look (a strong blur, frost and soft rim) looked like a puffy white pill and was replaced. Tried and dropped, Nov 2026: an iridescent pink-blue wash, a coloured glow round each button, and accent-tinted buttons. On interaction it moves like gelatin: a deep, slow squish and a soft, low wobble that dies away over about a second. Real blur: a CSS layer with `backdrop-filter`, laid under the canvas and clipped every drawn frame to the jelly's outline (`outlinePath` in core, `JellySurface.onDraw`, `internal/glass.ts`), so it wobbles with the jelly. The CSS frost and edge only show before the jelly draws and without a canvas; once it's ready, the jelly does the shading, rim and shadow. A capsule shader (a liquid core in a clear casing) was tried and dropped, Nov 2026. Playwright's headless Firefox and WebKit draw no backdrop filters at all, even on a bare div; real Safari and Firefox do.
  - There's a Canvas 2D fallback, and it recreates the context if the context is lost.
  - **Fill cost (Nov 2026):** the shader walks all 56 ring edges for every pixel (twice, with the shadow), so each body draws only inside its ring's box plus the shadow's reach (a scissor), and pixels inside an inner box wholly within the ring (`ring-bounds.ts`) skip the walk: past the ring's edge the jelly is flat colour. The shadow's walk is skipped more than 4px inside. The pixels are identical; a popover's frame is about 4× cheaper. This matters wherever WebGL runs in software: CI's headless browsers, and real browsers with a blocklisted GPU. Before it, CI took about 200 ms per frame for a popover, and the loop then capped physics at 50 ms per frame, so the jelly ran at a quarter speed and never settled within a test's poll. The cap is now 100 ms: physics keeps real time down to 10 fps, so a slow device still finishes the popover's shrink before the stylesheet hides the panel (CI's Linux WebKit, at device pixel ratio 2, runs at about 10 fps).
- **`stage.ts`: one animation loop for every surface** (`loop.ts`).
  - Importing it has no side effects: the loop and its `visibilitychange` listener start with the first surface, so it's safe during SSR.
  - Steps every awake body and draws every awake surface.
  - Skips surfaces that are off screen (IntersectionObserver). It reads the **last** entry of each callback: a canvas hidden and shown again quickly (a popover reopened as it finishes closing) can get both entries in one callback, and reading the first left the surface marked off screen, never drawing again (fixed Nov 2026).
  - Stops entirely when the tab is hidden or everything is asleep.
  - **Warm-up (Nov 2026):** the shared renderer makes its context and compiles the shader on the page's first draw, and the browser compiles for the GPU on the first draw call. That costs 50 ms in Chromium on a Mac and 150–200 ms under load, inside our own tick. The renderer counts that one-off work (`rendererWarmUps()` in `renderer.ts`), and the surface then calls `restartClock()` on the loop, so it isn't simulated. Before this, the next frame stepped the 100 ms cap: the first popover opened on a page showed its jelly already most of the way out of the trigger. That was the cause of the intermittent "grows out of the trigger" failure in full local e2e runs (5–12% of runs under CPU load). It passed or failed depending on whether the frame before the stall came at least 2 physics steps after `grow()`, enough for the fading-in jelly to count as drawn.
  - A body with `breathe: 0` sleeps once it settles. Idle breathing keeps a body awake, so use it sparingly.
- **`palettes.ts`: jelly palettes, as tokens.** `JELLY_PALETTES[material][theme]`, where the material is `tint` (the dock's glassy dark tint), `milk` (solid switch thumbs), `glass` (panels) or `frost` (clear lens glass after liquid-glass, `lens: true`, for buttons: the shader's lens mode reads `specular` as the top reflection, `rim` as the rim line, `glow` as the inner shading and `stroke` as fresnel, and its tint is only the Canvas 2D fallback's fill), and the theme is `light` or `dark`. Colours are `{ red, green, blue, alpha }`, 0 to 1. The rest of the token set (colour, spacing, type, radius, motion) is still to come.

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
  - **Exit timing:** UI SDK keeps closing content mounted only for CSS transitions, or for script animations started in the **same task** as the close (not from an observer or effect). The spike started a do-nothing Web Animation in `onOpenChange(false)`. That misses controlled closes, which fire no `onOpenChange`, so `@agar/react` uses CSS instead (Nov 2026): `[data-jelly='ready'][data-ending-style]` gets `visibility: hidden` with a 360ms transition delay, which changes nothing visible until the jelly has shrunk. The binding watches `data-open` and morphs the jelly back. Verified in all three browsers: the content stays up through the shrink, then hides, and focus returns to the trigger.
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
  - **System colours (decided Nov 2026):** Agar's accent is **grape** (purple-700 in light mode, purple-600 in dark), because jelly means grape jelly. Every colour that isn't neutral comes from three custom properties on `:root` in `styles.css`: `--agar-accent`, `--agar-accent-text` and `--agar-focus`. Component properties default to them (`--agar-switch-track-checked: var(--agar-accent)`, every `*-focus`), so consumers re-theme the whole system on `:root`, or a subtree on any element. The rest of the token set (neutrals, spacing, type, radius, motion) is still to come.
  - **Switch track (decided Nov 2026):** pale frosted glass when off, as in the spike, because a dark track showing through the translucent milk jelly made it look flat. The edge and the on fill keep 3:1; the white thumb on the off track is about 1.3:1, as on iOS, and the docs say so.
  - **Switch motion (decided Nov 2026):** a little bouncier than the spike, which matched PR #9 frame by frame but felt too damped. Its thumb pushes 1.4px into the end of the track (the spike: 0.4px) and settles in about 630ms (425ms). It also has the dock's hover lean at about half strength (`hoverReach` 2px within `hoverRadius` 34px; the dock uses 3px within 46px, which slides a 24px thumb rather than leaning it). The tuning lives in `THUMB_PARAMS` in `use-switch-jelly.ts`; the engine's defaults stay the spike's.
  - **Tabs (Nov 2026):** `TabsList` renders the canvas and UI SDK's `TabsIndicator` itself, so consumers never place an indicator. The binding reads `orientation` from `data-orientation`, so no context is needed. The engine's lead-and-trail move and soft walls are sideways only, so vertical lists `morphTo()` the next tab, with no walls and no sideways tug. `morphTo()` keeps a press's squish, so the binding calls `release(null)` first. Arrow keys still focus a disabled tab (UI SDK follows the APG here); it just can't be selected. UI SDK writes the indicator twice per change. Until Nov 2026 the engine read a second `release()` to the same box as a zero-distance move to the right, so on a leftward move the back edge raced the front one and squeezed the jelly to a blob halfway across. The engine now ignores a target the body is already heading for, so bindings can pass the same box twice.
  - **Popover (Nov 2026):** `Popover` shares the trigger's ref through context (`popover/context.ts`); `PopoverContent` always passes `keepMounted` and renders the canvas and an `.agar-popover-body` wrapper. The binding only reads `data-open`, so it never wraps `onOpenChange`. Agar exposes the root's `open`/`defaultOpen`/`onOpenChange`/`onOpenChangeComplete`/`modal`/`dismissible`/`onDismissAttempt`, and the content's placement and focus props. Left out for now: controllers and payloads, `openOnHover`, `presentation="sheet"` (the jelly would need a sheet shape), `PopoverArrow`, `PopoverShortcut`, `inline` and `container`. No idle breathing, so the panel's body sleeps once it settles.
  - **Glass palette (decided Nov 2026):** plain and opaque: white in light mode, charcoal in dark. The spike's blue tint, 0.42 to 0.5 alpha, let whatever was behind the panel show through its text, and a canvas can't blur what's behind it. Keep defaults basic; consumers bring their own colour.
  - **Custom jelly colour (decided Nov 2026):** `--agar-jelly-tint` (and optional `--agar-jelly-tint-bottom`) on a component's container, or any ancestor, recolours its jelly, for every component (`internal/jelly-color.ts`, through `use-jelly.ts`). It takes any CSS colour: a throwaway child resolves `light-dark()` and `var()` in the container's colour scheme, and a 1×1 canvas turns the result into sRGB. Lighting stays the material's. Unset, unreadable, or no canvas: the material's palette. It's read on mount and on theme changes; `Jelly.recolor()` reads it again, and Popover calls it on every open. The Popover's plain panel uses the same property. CSS custom properties, not a prop, so theming stays in CSS.
  - **Button (Nov 2026):** wraps UI SDK's `Button`, as jelly glass, with one look (no `variant`). Layers, bottom up: `.agar-button-glass` (the `backdrop-filter` blur, clipped to the jelly's outline once it draws; a frosted pill with an edge before that and without a canvas), the canvas (`frost` jelly), `.agar-button-label` (semibold, near-black text in light mode, white in dark). The jelly fills the padding box as a pill: it squishes (`pressInPlace`) on a main-button pointerdown and on Space/Enter keydown, lets go on pointerup/leave/cancel, keyup and blur, and gives a little toward a hovering mouse (decided Nov 2026: hover is mostly the rim light turning to the cursor, so the lean is 1px within 30px, a third of the dock's; at 3px within 44px the edge poked out). `BUTTON_PARAMS` makes it gelatin: a deep, slow squish (`pokeK` 300, `pokeZ` 0.2, `pokeWiden` 5, `pokeFlatten` 0.2) and a softer surface wobble (`surfK` 380), with `hoverReach` 1 and `hoverRadius` 30. Disabled or pending buttons don't squish. Disabled fades its parts, not the button: opacity on the button would stop the glass seeing the page. While UI SDK marks it `data-pending`, the binding sets `params.breathe` to 2 (reduced motion turns it off), then back to 0. Reduced transparency makes the glass opaque. `data-show="idle"`/`"pending"` content is hidden in the other state by Agar's CSS. Agar exposes `onClick` (return a Promise to go pending), `type`, `disabled`, `focusableWhenDisabled` and `pendingAnnouncement`. UI SDK also passes its press details as a second argument to `onClick`; Agar's type leaves it out for now. Left out: `render` (links and router links), sizes (CSS custom properties for now), sound (the seed's press sounds, opt-in, would suit the ASMR feel), and `debug`. Over a busy picture, label contrast depends on the picture: the docs say so.
  - **Firefox and open popovers:** Firefox doesn't restyle a popover in the top layer while it's open, even for inline styles or `!important`: a theme change shows once it reopens. That's why Popover recolours on open.
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
  - Measure options: `axis: 'y'` measures down, `of: 'extent'` reads the jelly's size along the axis instead of its centre (a squish), and `solid` sets the alpha that counts as jelly. Pick it from the canvas's alpha profile, between the body and its shadow: the default (128) suits milk; translucent tint needs `solid: 24`, and its highlight skews the centre by about 1px, so tint tests compare offsets from a tab, not absolute positions (`e2e/tabs.spec.ts`). Button glass (body 36 to 60) uses 30, and its extent reads a row or two past the button.
  - The lens rim light changes which edge rows pass the cutoff, so a test comparing extents before and after must leave the cursor in the same place for both, and wait for the light with `stillCanvas` (nothing on the canvas changes for 10 frames; `settledJelly` can return while the light is still easing in).
  - Glass is checked from screenshots (`e2e/screen.ts`), not canvas read-backs, because only the compositor sees the backdrop blur: `e2e/button-glass.spec.ts` checks that the rim light turns toward the cursor (from canvas read-backs), label contrast (4.5:1 on the glass behind each label) and the blur, over stripes fine enough (2px and 3px) for a 2px blur to even out. Headless Firefox and WebKit draw no backdrop filters, so the blur pixel check runs in Chromium only (decided Nov 2026, like the visual baselines), and every browser checks that the blur is declared.
  - `press` clicks an element in the same task that starts sampling. A Playwright click returns a varying number of frames later, so a test of what happens in the first frames (the popover growing out of its trigger) must use it. A closed popover is hidden, so find it by class, not role.
- jsdom has no Web Animations, so `test.setup.ts` stubs `Element.prototype.getAnimations` to return none. UI SDK calls it before unmounting closing content (tab panels, popovers).
- jsdom has no Popover API either: `[popover]` is always `display: none`, so `test.setup.ts` shows `[popover][data-open]`. Without layout, UI SDK focuses the panel itself rather than its first field; e2e checks the field.
- After a popover closes, UI SDK re-checks focus in a `setTimeout(0)`. If a test ends first, it fires after the file's jsdom is gone (`document is not defined`, about one run in eight), so `Popover.test.tsx` waits for one timer turn after each test.
- Two sessions running Playwright at once share port 3100 (`reuseExistingServer`), so one can test against the other's `next dev`, and both slow down: jellies drawn at a stale size, double run times. Run e2e from one session at a time.
- `next dev` hydration drops an inline `style` set on `<html>` before React loads, so e2e can't theme the page with an init script: put a re-themed example on a docs page instead, or add a style tag from the test (`page.addStyleTag`).
- The docs app's tsconfig adds the `ES2024.Promise` lib for `Promise.withResolvers`; the packages stay on ES2023.
- The docs app's CSS goes through Lightning CSS, which compiles `light-dark()` into `--lightningcss-light`/`--lightningcss-dark` variables keyed on `color-scheme` rules. Agar's `data-theme` rules set them, so the docs' own CSS must not set `color-scheme` on `:root` (unlayered, it would win).
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
| `JellyTabs.tsx` | Done | Moved into `@agar/react` as `tabs/` (Nov 2026), as composable parts. Deleted from `seed/`, with its CSS. |
| `JellyPopover.tsx`, `jelly.css` | Done | Moved into `@agar/react` as `popover/` (Nov 2026), as composable parts without the hard-coded "Done" button. Deleted from `seed/`; the last of `jelly.css` was the popover's. |
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

Verified by e2e in Chromium, Firefox and WebKit (Switch, Tabs, Popover and Button, Nov 2026; macOS locally, Linux in CI):
- Every surface on a page shares one WebGL2 context.
- The jelly is drawn where UI SDK's thumb is, springs there on a toggle, tugs on press, and springs back when the pointer is released off the switch.
- The popover's jelly grows out of its trigger, settles on the panel, and shrinks back while the closing panel stays up.
- The button's jelly fills it, squishes on a pointer or key press (not when disabled), springs back, and breathes while its action is pending.
- Under reduced motion it never overshoots.
- Without WebGL, Canvas 2D draws it. With no canvas context at all, the CSS thumb shows and the switch still works.

Not yet tested:
- Touch devices.
- Screen readers.
- Many surfaces at once (for example 50 switches).
- High-DPR performance. The device pixel ratio is capped at 2.

## Open questions

- Should the shared renderer use an `OffscreenCanvas` or a worker? Measure first.
- Should bodies on one surface be batched into a single draw? (Large panels already draw only inside a scissor rectangle.)
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
