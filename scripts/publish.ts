/**
 * Publishes every public workspace package whose current version isn't on npm
 * yet. `bun publish` rewrites `workspace:` and `catalog:` versions, which
 * `changeset publish` (npm under the hood) would not. Run by `bun run release`
 * after `changeset version`; `changeset tag` then creates the git tags.
 */
import { $ } from 'bun';

const dirs = ['packages/core', 'packages/react'];

for (const dir of dirs) {
  const pkg = await Bun.file(`${dir}/package.json`).json();
  const published = await $`npm view ${pkg.name}@${pkg.version} version`.nothrow().quiet();
  if (published.exitCode === 0 && published.text().trim() === pkg.version) {
    console.log(`skip ${pkg.name}@${pkg.version} (already on npm)`);
    continue;
  }
  console.log(`publish ${pkg.name}@${pkg.version}`);
  await $`bun publish --access public`.cwd(dir);
}
