/**
 * Splits recent CI runs into waiting, setup and running time, per job, at p50
 * and p95. Reads GitHub's API through the `gh` CLI.
 *
 *   bun scripts/ci/audit.ts                 # last 150 CI runs
 *   bun scripts/ci/audit.ts --runs 50 --branch main
 *
 * - waiting: job created -> job started (queueing for a runner)
 * - setup:   job started -> end of the last setup step (clone, toolchain, caches)
 * - running: the rest of the job
 * - result:  run created -> last job finished (what a PR author waits for)
 */
import { $ } from 'bun';

interface Step {
  name: string;
  started_at: string | null;
  completed_at: string | null;
}

interface Job {
  name: string;
  created_at: string;
  started_at: string;
  completed_at: string | null;
  steps?: Step[];
}

interface Run {
  id: number;
  created_at: string;
  status: string;
  conclusion: string | null;
}

const SETUP_STEP =
  /^(?:Set up job|Initialize containers|Record job start|Run actions\/checkout|Run \.\/\.github\/actions\/setup|Read the Playwright version|Install browsers|Run bunx playwright install|Restore|Budget: setup)/u;
const DEFAULT_RUNS = 150;
const PER_PAGE = 100;
const MS_PER_SECOND = 1000;
const P50 = 0.5;
const P95 = 0.95;
const COLUMN = 10;
const NAME_COLUMN = 40;

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) {
    return fallback;
  }
  return process.argv[index + 1] ?? fallback;
}

function isRunsPage(value: unknown): value is { workflow_runs: Run[] } {
  return typeof value === 'object' && value !== null && 'workflow_runs' in value && Array.isArray(value.workflow_runs);
}

function isJobsPage(value: unknown): value is { jobs: Job[] } {
  return typeof value === 'object' && value !== null && 'jobs' in value && Array.isArray(value.jobs);
}

function seconds(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / MS_PER_SECOND;
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = values.toSorted((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[Math.max(0, index)] ?? Number.NaN;
}

function format(values: number[]): string {
  return `${percentile(values, P50).toFixed(0)}s / ${percentile(values, P95).toFixed(0)}s`;
}

async function api(path: string): Promise<unknown> {
  const text = await $`gh api ${path}`.text();
  const parsed: unknown = JSON.parse(text);
  return parsed;
}

async function listRuns(limit: number, branch: string): Promise<Run[]> {
  const runs: Run[] = [];
  const branchQuery = branch === '' ? '' : `&branch=${branch}`;
  for (let page = 1; runs.length < limit; page += 1) {
    const body = await api(
      `repos/{owner}/{repo}/actions/workflows/ci.yml/runs?status=completed&per_page=${PER_PAGE}&page=${page}${branchQuery}`,
    );
    if (!isRunsPage(body) || body.workflow_runs.length === 0) {
      break;
    }
    runs.push(...body.workflow_runs);
  }
  return runs.slice(0, limit);
}

const limit = Number(option('runs', String(DEFAULT_RUNS)));
const runs = await listRuns(limit, option('branch', ''));
const buckets = new Map<string, { waiting: number[]; setup: number[]; running: number[] }>();
const results: number[] = [];

for (const run of runs) {
  const body = await api(`repos/{owner}/{repo}/actions/runs/${run.id}/jobs?per_page=${PER_PAGE}`);
  const jobs = isJobsPage(body) ? body.jobs : [];
  let lastDone = run.created_at;
  for (const job of jobs.filter((each): each is Job & { completed_at: string } => each.completed_at !== null)) {
    if (job.completed_at > lastDone) {
      lastDone = job.completed_at;
    }
    const steps = job.steps ?? [];
    let setupEnd = job.started_at;
    for (const step of steps) {
      if (!SETUP_STEP.test(step.name) || step.completed_at === null) {
        break;
      }
      setupEnd = step.completed_at;
    }
    const bucket = buckets.get(job.name) ?? { waiting: [], setup: [], running: [] };
    bucket.waiting.push(seconds(job.created_at, job.started_at));
    bucket.setup.push(seconds(job.started_at, setupEnd));
    bucket.running.push(seconds(setupEnd, job.completed_at));
    buckets.set(job.name, bucket);
  }
  results.push(seconds(run.created_at, lastDone));
}

console.log(`${runs.length} completed CI runs (p50 / p95)\n`);
console.log(`${'job'.padEnd(NAME_COLUMN)}${'waiting'.padEnd(COLUMN + 2)}${'setup'.padEnd(COLUMN + 2)}running`);
for (const [name, bucket] of buckets) {
  console.log(
    `${name.padEnd(NAME_COLUMN)}${format(bucket.waiting).padEnd(COLUMN + 2)}${format(bucket.setup).padEnd(COLUMN + 2)}${format(bucket.running)}`,
  );
}
console.log(`\ntime to result: ${format(results)}`);
