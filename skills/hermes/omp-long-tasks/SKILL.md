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
- The completion notice shows only the last ~2,000 characters of the stream, and the draft report file may never have been finalized. Read the file, then re-run the cheap proofs yourself (the suite, the eval, one measurement on the real box) before you write the PR body; take the numbers from your own run.
- Hermes may not write `.github/workflows/`: have omp write a workflow as `scripts/<name>.workflow.yml`
  with a header telling the owner to copy it, and say so in the PR. Also write "never edit `.github/`" in
  EVERY task file: omp adds a lint path or a test job to `ci.yml` on its own when it adds a script or a
  test. After each run, `git status --short .github` before you commit; revert the file
  (`git checkout -- <file>`) and give the owner the lines to add in the PR body, or the push is refused.
- A terminal call whose cwd is a nix-os worktree loads that repo's AGENTS.md into the context: use `git -C` or `workdir` outside the repo for plain commands.
- To count active runs before a second start, `pgrep -fa "omp -p"` also matches the terminal call's own shell snapshot (a `bash -c source ...hermes-snap...` line): that line is the check itself, not a run. Count only lines that are an `omp` process.
- While a run edits a worktree, do not touch it (no edit, no `git add`): your change shows up in its `git diff` and in its report. Draft Markdown for the same PR in a scratch checkout of `main` or in `omp-tasks/`, and copy it in after the run ends.
- `nix eval path:$PWD#...` works in a worktree where `git+file:` fails with 'object not found'.
- When the owner corrects the target mid-run (for example 'I mean the main branch, not the releases'), stop the run, rewrite the task
  file (not a patch on top) and restart: a run cannot be steered. Stop it with `omp-run --stop <name>`. Only for a hand-made
  `omp | omp-stream` pipeline, which has several processes: after `kill <pid>` of the shell, run `pgrep -a omp` and kill the
  `omp` child too, or it keeps editing the worktree. Check `git status` of the worktree before the restart. The killed run
  still sends a completion notice later: it is stale, ignore it.
