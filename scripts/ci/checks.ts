/**
 * Runs every small check at once and reports every failure, not just the
 * first. Checks that read the build (types, size, package exports) start as
 * soon as the build is done: the docs app is type-checked against the built
 * declarations, which is what consumers get. Each check has a time budget; going over it fails the check, so CI
 * stays fast instead of slowly getting slower. Never raise a budget to make a
 * check pass: find out why it got slower.
 *
 *   bun scripts/ci/checks.ts            # everything
 *   bun scripts/ci/checks.ts lint test  # only these
 */

interface Check {
  name: string;
  command: string[];
  budgetMs: number;
  /** Another check that has to pass first. */
  after?: string;
}

interface Result {
  check: Check;
  ms: number;
  exitCode: number;
  output: string;
}

const CHECKS: Check[] = [
  { name: 'fmt', command: ['bun', 'fmt', '--no-script', '--check'], budgetMs: 1000 },
  { name: 'lint', command: ['bun', 'run', 'lint'], budgetMs: 1000 },
  { name: 'test', command: ['bun', 'test'], budgetMs: 30_000 },
  { name: 'build', command: ['bun', 'run', 'build'], budgetMs: 10_000 },
  { name: 'check', command: ['bun', 'check'], budgetMs: 5000, after: 'build' },
  { name: 'size', command: ['bun', 'run', 'size'], budgetMs: 5000, after: 'build' },
  { name: 'package', command: ['bun', 'run', 'check:pkg'], budgetMs: 10_000, after: 'build' },
];
const SKIPPED = -1;

const MS_PER_SECOND = 1000;
const COLUMN = 8;

function inGitHubActions(): boolean {
  return process.env.GITHUB_ACTIONS === 'true';
}

async function run(check: Check): Promise<Result> {
  const start = performance.now();
  const proc = Bun.spawn(check.command, { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, FORCE_COLOR: '1' } });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { check, ms: performance.now() - start, exitCode, output: stdout + stderr };
}

function seconds(ms: number): string {
  return `${(ms / MS_PER_SECOND).toFixed(2)}s`;
}

const wanted = new Set(process.argv.slice(2));
const selected = wanted.size === 0 ? CHECKS : CHECKS.filter((check) => wanted.has(check.name));
async function runAfter(check: Check, dependency: Promise<Result> | undefined): Promise<Result> {
  if (dependency !== undefined) {
    const before = await dependency;
    if (before.exitCode !== 0) {
      return { check, ms: 0, exitCode: SKIPPED, output: `skipped: ${check.after ?? ''} failed` };
    }
  }
  const result = await run(check);
  return result;
}

async function runAll(checks: Check[]): Promise<Result[]> {
  const started = new Map<string, Promise<Result>>();
  for (const check of checks) {
    const dependency = check.after === undefined ? undefined : started.get(check.after);
    started.set(check.name, runAfter(check, dependency));
  }
  const all = await Promise.all(started.values());
  return all;
}

const results = await runAll(selected);
const inCi = inGitHubActions();

for (const result of results) {
  console.log(inCi ? `::group::${result.check.name}` : `\n── ${result.check.name}`);
  console.log(result.output.trimEnd());
  if (inCi) {
    console.log('::endgroup::');
  }
}

const failures: string[] = [];
console.log('\ncheck    time     budget   result');
for (const { check, ms, exitCode } of results) {
  const overBudget = ms > check.budgetMs;
  let verdict = 'ok';
  if (exitCode === SKIPPED) {
    verdict = `SKIPPED (${check.after ?? ''} failed)`;
  } else if (exitCode !== 0) {
    verdict = `FAILED (exit ${exitCode})`;
  } else if (overBudget) {
    verdict = 'OVER BUDGET';
  }
  console.log(
    `${check.name.padEnd(COLUMN)} ${seconds(ms).padEnd(COLUMN)} ${seconds(check.budgetMs).padEnd(COLUMN)} ${verdict}`,
  );
  if (verdict !== 'ok') {
    failures.push(`${check.name}: ${verdict}`);
    if (inCi) {
      console.log(`::error title=${check.name}::${verdict} after ${seconds(ms)} (budget ${seconds(check.budgetMs)})`);
    }
  }
}

if (failures.length > 0) {
  console.log(`\n${failures.length} of ${results.length} checks failed:\n  ${failures.join('\n  ')}`);
  process.exitCode = 1;
}
