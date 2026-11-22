#!/usr/bin/env bash
# Fails a job that has run longer than its budget, counted from when GitHub
# started the job: that includes pulling a container image and every setup
# step, but not waiting for a runner.
#
#   scripts/ci/budget.sh <label> <seconds> --defer   # record an overrun, keep going
#   scripts/ci/budget.sh <label> <seconds>           # fail on this or any recorded overrun
#
# --defer lets the tests still run (and report) when setup was slow; the last
# budget step then fails the job. Needs GH_TOKEN with actions:read; if the API
# can't be reached it counts from CI_JOB_START (the job's first step) and says so.
set -euo pipefail
label=$1
budget=$2
mode=${3:-}

started=""
if [[ -n "${GH_TOKEN:-}" ]]; then
  url="${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/attempts/${GITHUB_RUN_ATTEMPT}/jobs?per_page=100"
  started=$(curl -fsS -H "Authorization: Bearer ${GH_TOKEN}" -H "Accept: application/vnd.github+json" "$url" |
    node -e '
      let body = "";
      process.stdin.on("data", (chunk) => (body += chunk));
      process.stdin.on("end", () => {
        const job = JSON.parse(body).jobs.find((j) => j.runner_name === process.env.RUNNER_NAME && j.status === "in_progress");
        if (job) console.log(Math.floor(Date.parse(job.started_at) / 1000));
      });
    ' || true)
fi
if [[ -z "$started" ]]; then
  echo "::warning title=Budget clock::Couldn't read the job's start time from the API; counting from its first step instead."
  started=$CI_JOB_START
fi

elapsed=$(( $(date +%s) - started ))
echo "${label}: ${elapsed}s of ${budget}s"
over=""
if (( elapsed > budget )); then
  over="${label} took ${elapsed}s; the budget is ${budget}s"
  echo "::error title=Over budget::${over}. Find out why rather than raising it."
fi

if [[ "$mode" == "--defer" ]]; then
  if [[ -n "$over" ]]; then
    echo "BUDGET_OVERRUNS=${BUDGET_OVERRUNS:-}${over}; " >> "$GITHUB_ENV"
  fi
  exit 0
fi
if [[ -n "${BUDGET_OVERRUNS:-}" ]]; then
  echo "Earlier overruns: ${BUDGET_OVERRUNS}"
fi
if [[ -n "$over" || -n "${BUDGET_OVERRUNS:-}" ]]; then
  exit 1
fi
