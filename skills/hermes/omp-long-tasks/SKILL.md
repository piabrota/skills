---
name: omp-long-tasks
description: Use when an omp run is PR-sized or hit its time limit.
disable-model-invocation: true
---

# Long omp tasks: lessons from the Reels, thesis-rig and bump runs

Extends `hermes-omp` (read-only, nix-os PR to change). Load both.

## Size the run
- One `omp -p --max-time` run does about 30 to 45 minutes of work. A whole rig plus toolkit plus docs does not fit.
  Split by write set: toolkit/Nix (A), specs (B), docs and figure (C). Give each task an explicit list of files it may edit and the contract
  (command names, paths) the other tasks rely on. Two runs at once at most.
- Put the contract of the sibling task in the task file and ask for a name check at the end (grep every command the specs use in the toolkit).

- Give every task file the same skeleton: Goal; "Decisions (do not change)" with each choice already made
  (names, limits, formats, headers, what is stored); Steps, each recorded in the absolute progress path before the
  next; Rules (forbidden paths, forbidden commands, "add no package"); "How to prove it is done" with one command
  chain. Without the Decisions block a run re-decides settled points and burns turns. A feature that cannot fit one
  run goes in sequential runs of one layer each (core and API, then login and pages, then board tools and
  hardening, then packaging, then docs, then checks); expect 70 to 105 turns and about $2 to $4 per run, and
  commit and push each before the next starts.
- When a task needs facts only the network gives (action SHAs, a pinned file's blob id), fetch them yourself with
  `gh api`, write them to a file in `omp-tasks/`, and name that file in the task: omp has no `gh` or `curl`.

## The wrapper cap beats `--max-time`
- The `omp-run` wrapper wraps omp in `timeout 35m`, whatever `--max-time` says. Pass `--max-time 34m` at most, so omp can write its report before the kill. A job meant for 90 minutes is several runs of under 35.
- Put in every task of a multi-step job: "after EACH finished step append one line to `<workspace>/omp-tasks/<name>.progress` before you start the next step; never end a step with a half-written module". Write the ABSOLUTE path: omp runs with the repo as its cwd, so a relative `omp-tasks/...` creates a stray directory inside the repo that `git add -A` would commit. A run killed at the cap or by an interruption then leaves a record of what is done.
- A continuation task (`<name>-2.md`) points at the first task file for the decisions and rules, lists the state on disk that Hermes checked (files, line counts, what compiled, what is recorded and what is not), and orders the work: compile first, split any module that grew past about 500 lines, then the remaining steps. Do not repeat the whole spec.

## When a run stops at its limit
- `omp stderr: [Stopped by SIGTERM]` means the time limit: no final report was written and the work may be half done.
  Check `git status`, then resume the same session: write the resume note as `omp-tasks/<name>.md` and run
  `omp-run <name> --resume <session-id> --max-time 30m` (hermes-omp step 3). Without `omp-run`: `omp -p --mode json --no-title --resume <session-id> --max-time 30m < resume.md 2>&1 | omp-stream`.
  The id is in the `[Recovery]` line. The resume task lists what is done, what is not, the order of the rest and a time budget.
- Ask every run to keep a DRAFT report file (`/tmp/<name>-report.md`) from the first third on and to update it. Otherwise the report is lost.
  Also say: "write the COMPLETE final report, every table and audit verdict with its file:line, into that file BEFORE your last message". A run that put its audit only in the last chat message left a 512-byte file, and the completion notice kept just the tail: the audit was gone. When that happens, mark those audit items "not verified" in the PR body and offer an audit-only run; never rebuild the table from memory.
- Tell omp to run slow things (builds, test suites) detached and poll their log with one short command. A `wait` on a long job is what gets killed.

## Tests that prove a fix
- A stub must copy the real program's behaviour (exit codes, messages) taken from logs or source, not from a guess: a stub that exits 0 where the real program exits 75 passes a fix that fails on the box.
- Require a red/green proof in the task: keep the old script from `git show HEAD:<path>`, let the suite run against any script (a variable such as `..._UNDER_TEST`), show it FAIL on the old one and pass on the new one. Only then write "fixed" in a PR. If the real program cannot run in the test, say so and name the journal lines that will prove it after deploy.
- A fix PR for a failed earlier fix says so in the first paragraph, with the wrong assumption.

## Where a run lives
- A run started from this chat sits in the cgroup of the unit that hosts the chat (the dashboard unit, 2G, when the gateway is a stray). Restarting that unit kills the run mid-edit. After a restart: `git status` of the worktree, add a note to the task file ("a first run was killed; read the partial diff, keep what is right"), start it again.
- Do not tell the owner to restart units while a run is active unless the run can be resumed; offer the restart for after the PR.
- A message from the owner that interrupts your turn can close the background processes that turn started (`process_manage poll` then shows `killed` with `agent_close`, and the notice may say "completed"). After any interruption, poll every background session you rely on (an omp run, a long download or build) and restart the dead ones before you report them as running. Check `git status` first: a killed omp run leaves a half-done diff.

## Measurement tasks
- Tell omp to take baselines and measurements from the locked nixpkgs rev (`github:NixOS/nixpkgs/<rev>`), never from `nixpkgs#...`: the registry on this box differs and gives another version. Give it the rev yourself, taken from the ROOT input (`jq -r '.nodes[.nodes.root.inputs.nixpkgs].locked.rev' flake.lock`): the node named `nixpkgs` is not the hosts' one. Check the version in the first lines of the report, and check any baseline in a heartbeat line against it.
- A run that starts scratch daemons (a hub, an agent) leaves them alive when you kill it. After a kill, `ps -eo pid,etime,args | grep <name>` and kill those PIDs, then delete the scratch dirs.
- Heartbeat lines show what omp compares: read them, and say so at once when the baseline is wrong.

## Quirks
- `omp-run <name>` reads `omp-tasks/<name>.md`: the run name and the task file name must be equal. A mismatch prints "no task file" and starts nothing, yet the background notice still says "completed normally" with exit code 0. The same exit code 0 comes after a time-limit stop. Read the last lines of the notice for `no task file`, `stopped by the time limit` or `[Stopped by SIGTERM]` before you say a run finished.
- A proof script you start in the background must write its full output to a file INSIDE the script and print
  only a `grep` summary at the end (counts, exit codes). A `| grep` on the command line leaves only the last ~2,000
  characters in the completion notice, with the test counts cut off, and the output is not saved. Re-running
  the whole proof to get the counts wastes minutes.
- After every run, compare `git status --short` with the task's list of forbidden paths, not only with the
  `??` lines. A generated file under a forbidden path (a catalog bundle that gained keys) may change by design:
  read its diff, confirm it is only generated entries and that the repo's own generator check passes, and say so
  in the report. Any other edit there is a slip: revert it.
- A second completion notice for a background proof you already read from its output file is the same run
  reported late: compare its counts with what you read and do not start the proof again.
- After every run, `git status --short` and look for `??` lines: omp leaves scratch helpers (an eval `.nix`, a log) in the repo root. Delete them before the commit.
- Run a toolkit's tests through the repo's own test entry (a Nix `passthru.tests` or check derivation), not the bare script: the entry sets the environment the script needs (the bare script exits 2 for a missing command) and also runs `shellcheck` and `dash -n` first. Write "run shellcheck on every shell script you write or change" in the task: a `ls | grep` in an omp-written test stopped the whole derivation before one check ran. The test count for a PR is the last `N checks, M failed` line of that derivation's log, taken after the final edit. When the inputs did not change since an omp run built it, your own `nix build` returns the cached success and prints no log: read the count from the output file (`tail <the store path that --print-out-paths gave>`) and say the build was reused.
- Order a big task file so the docs come last, and list every doc file by name. A run cut by its limit loses the docs first, and a second run then needs the list to finish them (pt-BR file, its English mirror, the wiki pages, the skill reference, `.devin/wiki.json`, the `AGENTS.md` row).
- A conflict run can work in a worktree that stopped in the middle of a rebase: omp edits the marker files and runs no `git add` or `git rebase`. You then `git add <the files>` and `GIT_EDITOR=true git rebase --continue`, and read `git diff origin/main -- <file>` for each merged area. Prove an option merge with the option-combination eval in the nix-eval-checks reference of the `piabrota-owner-workflows` skill, because a killed run may not have finished its own check.
- A task that tests a script that rewrites a tracked file (a bump script, a formatter) must say: run it on a
  COPY in a scratch dir, with the script path resolved after any `cd`. A run once rewrote the real tracked
  file, restored it from `HEAD` and said so. Read the diff of that file before you commit; the report line
  "one slip" is your cue.
- omp's bash policy blocks `curl *`: tell it to use `gh api` for reads; a script it writes may still call curl.
- Stop a run with `omp-run --stop <name>` (hermes-omp step 3), never `pkill -f <pattern>`: through the terminal tool the pattern is in the shell's own command line, so it kills the very call that runs it, and it can match another run. Only on a box without `omp-run`, kill by PID.
- When the completion notice is empty or has no report, the task's `.progress` file is the record: read it, then
  `git status` and the diff stat, and re-run the checks yourself. A run may also start its own subagents; the
  progress file names them.
- The completion notice shows only the last ~2,000 characters of the stream, and the draft report file may never have been finalized. Read the file, then re-run the cheap proofs yourself (the suite, the eval, one measurement on the real box) before you write the PR body; take the numbers from your own run.
- Hermes may not write `.github/workflows/`: have omp write a workflow as `scripts/<name>.workflow.yml`
  with a header telling the owner to copy it, and say so in the PR. Also write "never edit `.github/`" in
  EVERY task file: omp adds a lint path or a test job to `ci.yml` on its own when it adds a script or a
  test. After each run, `git status --short .github` before you commit; revert the file
  (`git checkout -- <file>`) and give the owner the lines to add in the PR body, or the push is refused.
- A terminal call whose cwd is a nix-os worktree loads that repo's AGENTS.md into the context: use `git -C` or `workdir` outside the repo for plain commands.
- To check whether a run is alive or to count runs before a second start, use `pgrep -fa "bin/omp"`. The wrapper starts `omp --append-system-prompt ...`, so `pgrep -fa "omp -p"` can show 0 for a live run, and it also matches the terminal call's own shell snapshot (a `bash -c source ...hermes-snap...` line), which is the check itself, not a run. Count only lines that are an `omp` process, and confirm with `process_manage poll` on the background session.
- While a run edits a worktree, do not touch it (no edit, no `git add`): your change shows up in its `git diff` and in its report. Draft Markdown for the same PR in a scratch checkout of `main` or in `omp-tasks/`, and copy it in after the run ends.
- `nix eval path:$PWD#...` works in a worktree where `git+file:` fails with 'object not found'.
- When the owner corrects the target mid-run (for example 'I mean the main branch, not the releases'), stop the run, rewrite the task
  file (not a patch on top) and restart: a run cannot be steered. Stop it with `omp-run --stop <name>`. Only for a hand-made
  `omp | omp-stream` pipeline, which has several processes: after `kill <pid>` of the shell, run `pgrep -a omp` and kill the
  `omp` child too, or it keeps editing the worktree. Check `git status` of the worktree before the restart. The killed run
  still sends a completion notice later: it is stale, ignore it.
