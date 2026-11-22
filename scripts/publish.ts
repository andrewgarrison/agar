/**
 * Publishes every public workspace package whose current version isn't on npm
 * yet. `bun publish` rewrites `workspace:` and `catalog:` versions, which
 * `changeset publish` (npm under the hood) would not. Run by `bun run release`
 * after `changeset version`; `changeset tag` then creates the git tags.
 */
import { $ } from 'bun';

interface PackageJson {
  name: string;
  version: string;
}

const PACKAGE_DIRS = ['packages/core', 'packages/react'] as const;

function isPackageJson(value: unknown): value is PackageJson {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'version' in value &&
    typeof value.version === 'string'
  );
}

for (const dir of PACKAGE_DIRS) {
  const pkg: unknown = await Bun.file(`${dir}/package.json`).json();
  if (!isPackageJson(pkg)) {
    throw new TypeError(`${dir}/package.json has no name or version`);
  }
  const spec = `${pkg.name}@${pkg.version}`;
  const published = await $`npm view ${spec} version`.nothrow().quiet();
  if (published.exitCode === 0 && published.text().trim() === pkg.version) {
    console.log(`skip ${spec} (already on npm)`);
  } else {
    console.log(`publish ${spec}`);
    await $`bun publish --access public`.cwd(dir);
  }
}
