#!/usr/bin/env bash
# Fails the job when it has run longer than its budget, counted from when
# GitHub started the job: that includes pulling a container image and every
# setup step, but not waiting for a runner.
#   scripts/ci/budget.sh <label> <seconds>     (needs GH_TOKEN with actions:read)
# If the API can't be reached it falls back to CI_JOB_START, set by the job's
# first step, and says so.
set -euo pipefail
label=$1
budget=$2

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
if (( elapsed > budget )); then
  echo "::error title=Over budget::${label} took ${elapsed}s; the budget is ${budget}s. Find out why rather than raising it."
  exit 1
fi
