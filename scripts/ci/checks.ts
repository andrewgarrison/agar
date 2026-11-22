/**
 * Runs every small check at once and reports every failure, not just the
 * first. Each check has a time budget; going over it fails the check, so CI
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
  { name: 'check', command: ['bun', 'check'], budgetMs: 5000 },
  { name: 'test', command: ['bun', 'test'], budgetMs: 30_000 },
  // Build, then the checks that read the build: bundle size and package exports.
  { name: 'build', command: ['sh', '-c', 'bun run build && bun run size && bun run check:pkg'], budgetMs: 15_000 },
];

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
const results = await Promise.all(
  selected.map(async (check) => {
    const result = await run(check);
    return result;
  }),
);
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
  if (exitCode !== 0) {
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
