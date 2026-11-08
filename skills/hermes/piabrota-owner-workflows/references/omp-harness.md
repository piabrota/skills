# Tuning the omp coding worker (oh-my-pi) on the box

Read the repo state first: `hermes.nix` (`ompWrapped`), `hermes/omp.yml`,
`hermes/skills/hermes-omp/SKILL.md`, and the omp docs at the pinned tag (shallow clone of
`can1357/oh-my-pi` at that tag; `docs/settings.md`, `docs/config-usage.md`,
`docs/system-prompt-customization.md`, `docs/context-files.md`). The pinned tag is in
`omp/package.nix`.

## Layers, each edited in a different place (nearest to the run first)

Two layers need no deploy. **The task file** (per run, written from the owner's chat request).
**Per-run flags** the owner can ask for: `--thinking <off|minimal|low|medium|high|xhigh|max|auto>`,
`--model <id-or-role>`, `--max-time <duration>`; model, thinking and time only, never a flag that
loosens a rule. The five below are edited by PR (the last one in the target repo).

1. **Settings overlay `hermes/omp.yml`.** The wrapper sets `PI_CONFIG_FILES` to this store file, so
   it outranks omp's own `config.yml` and a cloned repo's `.omp/config.yml`, and omp cannot edit
   it. Models, limits, tool switches and the bash allow/deny patterns live here.
2. **The wrapper in `hermes.nix`.** Environment variables, `choom` (the OOM killer stops omp before
   the gateway) and any flag to pass on every run, such as `--append-system-prompt <store file>`.
   A fixed prompt addition belongs here as a store file, not in `~/.omp/agent/APPEND_SYSTEM.md`,
   which omp could edit.
3. **The `hermes-omp` skill.** The procedure: task file, command, diff review, PR. Most quality
   gain with a Sonnet-only setup comes from the task file: goal, a done-criterion, the exact check
   commands that fit 1 vCPU / 1 GB, and a required "how I proved it" section in omp's answer.
4. **The target repo's context.** omp reads its `AGENTS.md`, `.omp/AGENTS.md` and `.omp/RULES.md`
   (`RULES.md` stays in every request). That is a PR to that repo, not to nix-os.

Every change to layers 1-3 is a nix-os PR; a merge restarts `hermes-agent`. The release itself is a
fifth nix-os layer: `omp/package.nix` (tag and hash).

## Which setting wins (omp docs `config-usage.md`, "Layers", at the pinned tag)

Highest first: an environment variable a setting declares; runtime overrides; overlays
(`PI_CONFIG_FILES`, then each `--config <file>`, later wins); the project's `.omp/config.yml`; the
user's `~/.omp/agent/config.yml`; omp's default. The wrapper puts `hermes/omp.yml` in the overlay
slot, so a cloned repo or omp's own user file cannot loosen it; an array in the overlay replaces
the lower array. omp sessions are JSONL files under
`~/.omp/agent/sessions/<encoded-cwd>/` (`omp --export <session>` writes HTML; not tried on the box).
To teach the owner, lay out this order and the layer list as one table: layer, file, what it
controls, who edits it, when it takes effect.

## Levers that matter for coding quality

- `modelRoles`: `default`/`slow`/`plan` carry the main work; `task` is the subagent role that edits
  code; `smol`, `tiny`, `commit`, `memory`, `advisor`, `judge` are cheap side roles. Check `omp.yml` for what is already set before you propose a change: `task` is Sonnet today, so
  the first offer is a higher `--thinking` for one run, or a stricter task file, not a model swap
  (cost of any raise: owner's quota). `task.agentModelOverrides`
  changes single agents only.
- `defaultThinkingLevel`: more reasoning, better code, more quota. Read the default and the
  accepted values in `docs/settings.md` at the pinned tag before proposing one: the default is
  `high` (values `minimal` to `max`, plus `auto`), so a bare `medium` would lower it. Pin `high`
  explicitly so an upstream default cannot move it, and say that the line changes nothing today.
- `lsp`, `eval`, `browser`, `memory`, `advisor` are off for RAM. LSP is the off-switch that would
  help code quality most; propose it only as a measured trial (peak RSS under the 1 GiB cap).
- `tools.maxTimeout`, `async.maxJobs`, and the skill's `--max-time` bound a run.

## Running omp for a task (the hermes-omp procedure in practice)

- When the owner says "use OMP" for a code change, run it; do not do the edits by hand. Write the
  task file with every change listed as an exact edit (file, old text, new text or content), the
  check commands, and a "how to prove it is done" section. Run from the working tree on the
  `hermes/*` branch: `omp -p --no-title --max-time 15m < <task file> > <scratch>/out.txt`.
- A foreground `terminal` call above 600 s is promoted to a background process with a completion
  notice: do not re-run it. End the turn with a short status and review the diff when the notice
  arrives. One omp run at a time: every job you start counts against the memory cap of the unit whose
  cgroup holds the gateway (`cat /proc/<gateway pid>/cgroup`; `systemctl show <unit> -p MemoryCurrent
  -p MemoryPeak -p MemoryMax`). Read those before a second run. A cap near its peak makes the kernel
  kill a process inside that cgroup, and the victim can be the first omp or the gateway.
- Name the baseline in the task file. The local `main` of a long-lived clone is stale, and omp
  diffs against it (a 130-file diff for a three-file change). Run `git fetch --depth 1 origin
  main` first and write "compare with `HEAD~1` (or `origin/main`), never local `main`". For a
  follow-up run on the same branch, say "read `git show HEAD` first": the first run is that commit.
- A heartbeat shows only the tail of the new output (the head is cut with a count of omitted
  characters). Quote it as it is, say it is the tail, and read the final answer and `git diff`
  for anything that matters.
- Afterwards read `git status`, `git diff --stat` and the diff yourself, run the cheap checks
  (`nix-instantiate --parse`, a YAML load, greps for the new lines) and keep omp's claims separate
  from what you verified. For Rust, re-run `cargo test`, `clippy -D warnings` and `fmt --check`
  yourself: omp left the target directory warm, so it is cheap. Send the output to a file and grep
  `^test result|FAILED|panicked`; a `| head` in the pipe cuts the result lines off. Read the
  escaping and link-scheme code of any page generator yourself; a test name is not proof.
- **Review-only run** ("review PR N with omp"): add `--approval-mode write`. In that mode omp can
  read and write files but `bash` is refused, so it cannot run `git`, `gh` or `nix`. Prepare its
  inputs: refetch the PR head right before (the owner pushes while you work; `git fetch --depth 1
  origin pull/N/head && git switch --detach FETCH_HEAD`), and copy the diff to
  `/var/lib/hermes/workspace/omp-tasks/` (omp cannot read `~/.hermes/cache/scratch`). The task
  file lists the areas in priority order, asks for `file:line`, a severity (BLOCKER, SHOULD-FIX,
  NIT) with certain/likely/unsure, the files read and what it could not check, and says to edit
  nothing. A 2,000-line PR takes 10 to 12 minutes, so run it in the background and end the turn.
  Afterwards `git switch main`, delete the task and diff files, and check `git status` is clean.
- While omp runs in the default text mode, its stdout stays empty (the log shows only "Working...")
  until it ends. `omp -p --mode json` prints one JSON event per line as it works: `session`,
  `tool_execution_start` (`toolName`, `args`, `intent`), `tool_execution_end` (`result.content[].text`,
  `isError`, `result.details.wallTimeMs`), `message_update` with `assistantMessageEvent.type`
  `text_end` (a finished text; `toolcall_*` and `text_delta` are noise), `message_end`
  (`message.usage.cost.total`), `turn_end`, `agent_end`. To show the owner omp's output live, pipe
  that mode through the line formatter `omp-stream` and start the run with `terminal(background=true,
  notify=true, heartbeat=120)`: each heartbeat delivers the new lines, so quote them to the owner
  as they arrive. Run `command -v omp-stream` BEFORE you start, as its own call. Do not wrap the
  pipe in an `if command -v ... else plain omp -p` fallback: when the formatter is missing (the
  deploy that adds it is not active yet) the fallback runs silently in plain mode, the heartbeat
  carries nothing and the owner sees no stream. If the formatter is missing, say so and wait for
  the deploy instead. A run with no `agent_end` line ended abnormally. Redact token-shaped strings in the formatter. Keep `2>&1`
  in the pipe so omp's errors show too. When
  the owner asks "still running?", answer from facts: `pgrep -af bin/omp`, `ps -o etime=,rss= -p
  <pid>`, the size of the output file and `git status --short`; give the time left on the
  `--max-time` limit. Do not guess.
- **A finished run's notice keeps only the last ~2,000 characters.** A long audit table in omp's final
  message is cut, and the report file omp wrote at the end may be a 512-byte stub. In the task file,
  name `omp-tasks/<name>.report.md` (inside the workspace), require omp to append each audit item
  (OK / CHANGED / UNKNOWN with file and line) to it as it goes and to finish with the full text, and
  read that file when the run ends. If the evidence is lost anyway, say so in the PR body and mark
  those items unverified; never reconstruct them from a summary.
- **A run stopped by its time limit has not reported.** `[Stopped by SIGTERM]` at `--max-time` leaves edits and no
  final report. Resume it with `omp -p --mode json --no-title --resume <session id from the Recovery line>
  --max-time 30m < <task file> 2>&1 | omp-stream`; the task file tells it what the last output showed (for
  example the failing checks and the log path) and asks for the report. To avoid it, tell omp in the task file to
  append each finding and each fix to a report file as it goes, and to run its own long test suites detached and
  poll the log, so a kill loses no report.
- **Order a big task file by what the deliverable cannot ship without.** Given a long list, omp spends its time on the
  first items and the polish and reaches the integration (the Nix option, the test script, the lints, the report) last or
  never. Put the wiring, the test script and the draft report first, and the look of the output and the extra
  measurements last. In a resume file, list the steps in the order of what is still missing, state a total time budget,
  and ask for the report draft after the first step. Check `git status` before the resume: the files that are absent
  (here the module change and the tests) tell you what to put first.
- **Do not `pkill -f` a pattern that your own command line contains.** The shell that runs `pkill -f "resume <id>"`
  matches itself and the call dies with exit -15 before it kills anything. Find pids with `pgrep -fa 'bin/omp'`
  and `kill <pid>`, then check `pgrep` again. Killing the `omp-stream` pipeline or the `timeout` wrapper leaves
  the `omp` child running: kill the `omp` pid too. Stop leftover test runs and ffmpeg children by pid too.
- **omp cannot be steered once it runs.** When the owner corrects the brief in the first minutes, stop the run by
  pid, read `git -C <tree> status --short` (clean means nothing was lost), rewrite the affected sections of the
  task file, and start it again. Say so in one line. The completion notice of the stopped run arrives later:
  tell the owner it is the old run and ignore it.
- **"Create the PR with what you have"** means: stop the runs, `git add -A`, run the cheap evals and lints, commit,
  push, open a **draft** PR whose body lists every failing check, every number not re-measured and what was never
  run. Take the test counts from the log file, not from memory. If a count in the body turns out wrong and
  `gh pr edit` fails, post a correction comment with the signature line; do not guess another write route.
- **Verify before you relay.** Re-check each top finding with a grep or a read of the file (and of
  the upstream source at the pinned rev for claims about Hermes behaviour); report which findings
  you confirmed and which you only relay, and keep omp's own "unsure" labels. Do not run omp a
  second time for a review unless a whole area was skipped.
- **Fix runs on a PR you do not own** go in at most two omp runs of one theme each (for example
  checklist and doc claims first, stale docs second). Inspect the diff between runs. Work in a
  `git worktree` on `hermes/<slug>` cut from the owner's branch head; merge `main` into it first
  when the PR conflicts, so omp reviews the real merged tree. Use the default write mode (not
  review-only) when the review must run `nix eval` or `nix build` of the touched attributes. The
  owner may fix the conflict on his branch while you work: `git fetch`, then
  `git merge --no-commit origin/<his-branch>`. For a file-table row both sides shortened, take his
  side (`git checkout --theirs <file>`) and reapply only your own extra edit; a script that strips
  nested diff3 markers misparses and leaves stray markers, so grep for `^(<{7}|={7}|>{7})` before
  `git add`.
- **A wide rename or sweep** (a name changes in code, docs and config) needs a keep-list in the task
  file: what must NOT change (names of skills, plans, secrets, a human's shortcuts, files under
  `.github/`, drawn figures) and the grep that proves it
  (`git grep -n -i '<old>' -- . ':!<excluded dirs>'` lists only keep-list items, each with a reason).
  Do the `git mv` yourself before the run, and run the evaluation checks afterwards: omp cannot
  run `nix`.
- **A deploy kills a background omp.** It is a child of the gateway; when a merge reloads or
  restarts `hermes-agent`, omp gets SIGTERM and no completion notice arrives. Tell the owner not to
  merge a deploying PR while omp runs, check `ps` and the output file at the start of the next
  turn, and rerun the same task file (details: `references/hermes-gateway-unit.md`). Order the task so
  the file that holds verified data (a config, a source list) is written first and in full: it
  survives the kill, and the rerun starts from it.
- **Read a finished background run by its id.** The completion notice can be cut. Call
  `process_manage` (find it with `tool_search`) with `action=poll` or `log` and the `session_id`
  from the start call; `list` shows every run of the conversation. A command the owner's message
  interrupts is moved to the background, not killed: poll it too. A correction that interrupts the
  whole turn can still close a background omp (poll shows `exited`, code -15, `killed`): at the
  next turn poll the session and read `git -C <tree> status --short`. A clean tree means omp made
  no edit: restart the same task file at once and tell the owner. A dirty tree needs a
  "continue after the last finished step" file.
- **Start omp only when the last deploy run is `completed`.** This includes the deploy of the PR
  that you just opened and the owner just merged: a command or a flag that the PR adds does not
  exist until that deploy is active. After the owner reports a merge, run
  `gh run list -R <repo> --workflow deploy.yml --limit 1 --json status` first: a pending or running
  deploy reloads `hermes-agent` and kills the run. A foreground `gh run watch` dies the same way, so
  do not wait on a deploy in one call; do other file work, end the turn, and read the status next turn.
- **"The review should change the code directly"** (a review of your own uncommitted branch): run
  omp in the default write mode, not review-only, because it must run `nix eval` and the tools. The
  task file says: fix blockers and bugs yourself, fix a nit only if it is one line, log `FIX <file>:
  <what, why>` or `OPEN <file>: <why>` in the progress file, and never loosen a guardrail to pass a
  check (that is an `OPEN`). `git add` the earlier runs' files by name before the review run, so the
  unstaged `git diff` afterwards shows only the review's edits; read that diff, rerun the checks, and
  commit it apart from the build commit. Each check in the task file names the proof (command,
  output, or source line).- **Size the time limit.** The default `--max-time 15m` suits an edit; a task that adds a script,
  a config, tests and two docs gets `--max-time 30m`. A run that long can die to a restart:
  number the steps in the task file, name a progress file (`omp-tasks/<name>.progress`), ask omp
  to read it first and append one line per finished step, and split the work into runs of at most
  15 minutes when a deploy might land. After a kill, rerun with "continue after the last finished
  step" and check `git status` first.
- **Queued omp runs.** When the owner asks for two code jobs "in parallel", write both task files
  and prepare both branches at once (a `git worktree` each). Each task file names the directories the
  other run owns and says "do not touch them", and the two runs share no file (the shared
  `AGENTS.md` gets a character budget for each run). One omp per working tree, at most two
  at once (the `hermes-omp` table), and the second only when the memory of the unit is not at
  WARN: start both then. Otherwise start the first and say the second waits. When the first completion notice arrives, start the second omp
  before you review the first diff: the review needs no omp, so the box stays busy and the owner
  waits less.
- **Give `git worktree add` an absolute path.** With `git -C <repo> worktree add -b <branch> <rel>
  origin/main`, a relative path lands inside `<repo>`. Move a misplaced one with `git worktree move
  <old> <new>`, and run neither from a directory that holds an AGENTS.md you do not want loaded.
- **In a `git worktree` `.git` is a file.** `echo x >> .git/info/exclude` fails there: use
  `git rev-parse --git-path info/exclude`. Run such a setup step in its own call. A `&&` chain that
  fails before `omp` starts ends the background job with only `exit=1` in the completion notice,
  and the owner waits for a run that never began: open the notice's output before you answer.
- **Check the artifact yourself, not omp's report.** omp cannot open images and often says so: for a
  generated video, image or page, run the producing command again, `ffprobe` the streams, extract
  two frames (`ffmpeg -ss <t> -i f.mp4 -frames:v 1 f.png`) and look at them with `vision_analyze`.
  This found a 96 kHz audio track that omp's own verdict line did not check (a `loudnorm` pass
  raises the sample rate: end the chain with `aresample=48000`). Fix a one-line slip like this by
  hand and say so. Re-run omp's tests in the same environment it needed (a test that calls
  `openssl` fails in your shell until you run it under `nix shell nixpkgs#openssl -c`).
- **Turning a module off (`enable = false`) with omp.** Task file: keep the code and the import,
  flip the switch, and require a before/after `nix eval` of the host (units, nginx hosts, firewall
  ports, ACME certs, `extraPackages`, Hermes environment names) against `origin/main` in a second
  worktree. Then read that diff yourself for things the module added by the way: a package such as
  `jq` that Hermes scripts still use, a port another module opens. Move such a line to the module
  that really needs it (a one-word hand edit) before the commit. `kvm4-health` skips a unit that is
  not loaded, so its unit list needs no change. Data stays on disk: the doc lists the paths and the
  erase commands, marked as destructive, and you run none.
- **`git add -A` fails when an ignored progress file exists** (`omp-progress.txt` is in
  `info/exclude`): `git add` the changed paths by name, then read `git status --short`.
- **Two jobs in one session:** the omp run owns the working tree until it ends. Start the other
  branch in a `git worktree`, and do not touch the files omp reads.
- **The owner changes where the work lands while omp runs** ("in the same PR" becomes "in a new
  PR"). `git switch -c hermes/<new-slug>` on the same tree moves the uncommitted edits to the
  new branch and leaves the old branch clean; omp keeps working. Commit on the new branch from
  the base the owner named. Follow the latest order and say where the work went. When he says
  "same PR" but the pieces belong to two repositories, one PR cannot span them: put the change in
  the PR of the repository where it belongs, say in one sentence how you read the order, and go on.
- **A task file with the same name may already exist** from an older plan. `write_file` refuses to
  overwrite it until you read it. Read it, decide whether the old plan is superseded (say so at the
  top of the new file), then replace it. Delete task files at clean-up so the name is free.
- **Paths in a task file.** Give omp paths under the workspace or `/tmp` only. A path that contains
  `.hermes/` (even a cache directory in an `export XDG_CACHE_HOME=...` line) is refused by omp's
  policy, and omp then falls back to its own temp path. Put inputs it must read, such as a pinned
  analyzer binary or a cargo `CARGO_TARGET_DIR`, in `/var/lib/hermes/workspace/`. Its rules also
  refuse `omp *` and `hermes *`, so it cannot check its own flags: run `omp --help` yourself.
- **Numbers in a task file.** Never write a count you did not compute (interests, sources,
  tests). Ask omp to count in code and report the result: a wrong number in the task makes omp
  chase a mismatch or copy the error. Reread the task file once before the run for such slips and for paragraphs that contradict
  themselves (an instruction that says a step is not needed and then describes it).
- **Big, data-heavy tasks** (a new script plus config plus tests plus docs in two languages): put
  the verified data (the config, the source list) in the task file verbatim and the code design as
  rules; ask omp to tell you when an instruction is impossible or wrong, and for the complexity
  score of the new code, because the CI smell report counts it. When omp reports that the data
  model lacks a field the spec needs (for example an alert type with no expiry, so nothing can be
  "active"), do not invent the field and do not accept the unbounded fallback. Choose the smallest
  honest behaviour whose text states its own rule (a window of N days, labelled on the page), run
  one second omp round for it, and list the real fix (a schema change) as the owner's decision.
- **Vendored files** (`.claude/skills/<name>/`, `vendor/`) are refreshed by copying upstream. Put
  them in the task file's keep-list: omp edits them when a grep hit sits there, and the next
  refresh brings the old text back. Revert such an edit and report the hit instead.

## Wrapping omp for another program (a tool that expects the Pi CLI)

Set the tool's command variable (Paperclip: `PAPERCLIP_PI_COMMAND`) to a small shim: a Nix
`writeShellApplication` of bash that maps the flags, then `exec`s the box's `omp` wrapper. Never
name the shim `pi`. Share the wrapper's Nix file with Hermes, so the overlay, the token mapping and
the 35-minute ceiling apply. A second `--append-system-prompt` adds to the wrapper's rules, it does
not replace them. Differences to handle (omp 18.16.0):

- `--session FILE` resumes and fails when FILE is missing (Pi creates it): send `--no-session`.
- `--provider P --model M` becomes `--model P/M`.
- `--tools` rejects names omp lacks (`ls`), and `find` can be off under the overlay: keep only
  `read,bash,edit,write,grep`, in order. Never pass an empty list: omp then enables every tool.
- `--list-models` and `--skill DIR` do not exist. Answer the first with the models of `omp.yml`;
  link the sub-directories of the second into `$PI_CODING_AGENT_DIR/skills/`, where omp finds skills.
- The JSON events match Pi's (`agent_start`, `message_update`, `text_delta`, `tool_execution_*`,
  `turn_end`, `agent_end`), so the caller's parser works.
- `omp -p` waits for end of input when stdin is open. A caller must give it `/dev/null` or
  `ignore` (check the caller's spawn code); in your own tests add `< /dev/null`.
- Test the arguments with a fake `omp` first in PATH, and the engine with one real Haiku call under
  the service's sandbox (`service-check.md`, step 9).
- Give the service the token the narrow way: a root `ExecStartPre=-+` script copies the single
  `CLAUDE_CODE_OAUTH_TOKEN=` line of the secrets file to a file only the service user reads, and the
  unit loads that file as an optional `EnvironmentFile`. Never load the whole Hermes env file. Add
  `*/proc/*/environ*` and `*/proc/self/*` to the overlay's bash deny rules: a guardrail only, since
  the agent runs as the service user.

## Rules that stay

- **A task file never tells omp to read, copy, print or store a secret**, not even into a scratch
  file for a test (rule 1 holds for temp files, and the deny list blocks `env | grep` on a token
  name for you). Reread each task file before the run for steps that move a credential. Prove the
  parts that need it another way: read the source, test with a fake token, or write a runbook that
  Hermes runs after the deploy through the unit's own token path.

- Never propose loosening `bash.patterns` or `restrictedFolders`. `omp --config <file>` accepts
  repeatable overlays and a later file wins, so a hand-run overlay can loosen the guardrails by
  accident: suggest manual experiments with model and thinking keys only.
- Calibrate with the real run: a five-file edit (config, new prompt file, wrapper, skill, docs in
  two languages) took about 80 s and peaked near 500 MiB resident, well under the 1 GiB cap.
  Expect small formatting slips (a missing blank line between YAML keys): fix them yourself after
  reading the diff instead of a second omp run. omp warns that a new file must be `git add`ed
  before a flake build; do it before the commit.
- State what is unverified: the first run with a newly passed flag (for example
  `--append-system-prompt <store path>`) only proves itself after the deploy, because the run
  that wrote the change used the old wrapper. Exit 137 means the kernel killed it.
