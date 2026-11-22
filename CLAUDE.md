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

- **`body.ts`: physics, with no DOM.** A `JellyBody` works like this:
  - Four edge springs (left, right, top, bottom) chase a target rectangle. On a sideways move the leading edge snaps first and the trailing edge follows a beat later.
  - A ring of 56 surface particles sits around those edges. Each has its own wobbly spring, partial inertia, area-preserving pressure, a slosh force, and smoothing between neighbours.
  - Volume is conserved: the body gets thinner when stretched and fatter when squashed.
  - A stretch limit stops it stretching forever, and soft walls let it squash against edges.
  - It uses a fixed 1/240 s step.
  - The goal shape is a rounded rectangle (`radius` option). Leaving `radius` out gives a pill.
  - API: `place`, `pressToward`, `pressInPlace`, `release`, `moveTo`, `morphTo`, `fadeTo`, `setBounds`, `setPointer`, `isAsleep`.
  - Every body has its own `params`, so they can be tuned live.
- **`renderer.ts`: one WebGL2 context for the whole page.**
  - Browsers only allow about 16 live WebGL contexts per page, so components must never create their own.
  - Each component owns a plain 2D canvas, called its **surface**, that sits behind its content. The shared renderer draws that surface's bodies into one offscreen WebGL2 canvas, then copies the pixels across with `drawImage` in the same task. That means there's no need for `preserveDrawingBuffer`.
  - The fragment shader draws the ring as a signed distance field, rounded by `ROUND` (10px). It uses a bevelled normal for the specular highlight, rim, inner glow and stroke, adds a drop shadow, and outputs premultiplied alpha.
  - There's a Canvas 2D fallback, and it recreates the context if the context is lost.
- **`stage.ts`: one animation loop for every surface.**
  - Steps every awake body and draws every awake surface.
  - Skips surfaces that are off screen (IntersectionObserver).
  - Stops entirely when the tab is hidden or everything is asleep.
  - A body with `breathe: 0` sleeps once it settles. Idle breathing keeps a body awake, so use it sparingly.
- **`palette.ts`:** jelly palettes for light and dark (`JELLY_PALETTES` is the glassy dark tint, `MILK_PALETTES` the solid thumbs, `GLASS_PALETTES` the panels). These should become tokens.

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

## Proposed package layout (not decided yet; confirm before building)

A pnpm workspace:

- `packages/core` → `@agar/core`
  - The jelly engine (`body`, `renderer`, `stage`, palettes) and tokens.
  - No React and no UI SDK. Pure TypeScript, ESM.
- `packages/react` → `@agar/react`
  - React components and hooks.
  - Peer dependencies: `react`, `react-dom`, `@ui-sdk/react` and `@ui-sdk/core`.
  - Each component is its own entry point, for tree-shaking (`@agar/react/switch`).
  - Mark client components with a `"use client"` banner.
  - CSS ships as a side-effect import (`@agar/react/styles.css`, declared in `sideEffects`).
- `apps/docs`: the docs and playground. The spike's lab page is a starting point.
- Tooling to choose:
  - A library bundler: tsdown or tsup.
  - Changesets for releases.
  - Vitest with Testing Library for unit and interaction tests.
  - Playwright for visual regression tests and axe.
  - A size-limit check in CI.
- Before publishing, create the `agar` npm org to claim the `@agar` scope. `@agar/ui` was unused on npm in Nov 2026, but the unscoped `agar` is taken. If the scope isn't available, fall back to `@agarrison/agar`.

## Starting code (`seed/`)

The spike from agarrison.dev's `jelly-design-spike` branch (closed PR #9 there). `seed/` is reference material: move code out of it into the packages as it's extracted, and delete the folder once it's empty. Don't import from it, and keep it out of builds, lint and tests.

| File | State | Notes |
|---|---|---|
| `body.ts` | Keep | Core physics. Belongs in `@agar/core`. |
| `renderer.ts` | Keep | Core. Belongs in `@agar/core`. |
| `stage.ts` | Keep | Core. Belongs in `@agar/core`. |
| `palette.ts` | Rework | Turn into tokens. |
| `useJelly.ts` | Rework | Imports the site's `useTheme` from `@/context/ThemeContext`. Replace it with an Agar theme provider, a `theme` prop, or `prefers-color-scheme` plus a `data-theme` attribute. |
| `JellySwitch.tsx` | Spike quality | The behaviour is right. The API needs designing. |
| `JellyTabs.tsx` | Spike quality | Takes a `tabs` array. A real API should be composable parts like UI SDK's. |
| `JellyPopover.tsx` | Spike quality | Same as above. Also has a hard-coded "Done" button. |
| `jelly.css` | Spike quality | Uses the site's CSS variables (`--dock-bg`, `--accent-deep`, ...), which need replacing with Agar tokens. |
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

Not yet tested:
- Touch devices, Safari and Firefox.
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
- Should Agar expose UI SDK's parts directly (re-exported, styled), or wrap them in its own API? This affects how much of UI SDK's beta churn leaks to users.

## Conventions

- **Don't push to main. Use branches and pull requests.** The repo starts empty, so the very first commit (this brief and `seed/`) is the one exception: it creates `main`.
- Strict TypeScript. Every component is typed and composable.
- Every component ships with a keyboard test, an axe check, a reduced-motion check and a no-WebGL fallback.
