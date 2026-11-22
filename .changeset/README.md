# Changesets

Every PR that changes a published package (`@agar/core`, `@agar/react`) adds a
changeset: run `pnpm changeset`, pick the packages and the semver bump, and
write one line for the changelog. Docs-only and tooling-only PRs don't need one.

While Agar is on 0.x, breaking changes are `minor` bumps and everything else is
`patch`.
