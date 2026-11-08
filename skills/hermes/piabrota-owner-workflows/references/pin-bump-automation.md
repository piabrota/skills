# A scheduled bump of a pinned dependency (daily PR by piabrota-ops)

Use when the owner asks that a pin (a package version, a flake input, a vendored commit) is "updated every
day" or "from main" by the ops bot. Example: `openrig/package.nix` pins OpenRig by tag, commit, source hash and
npm hash.

## Settle what "from main" means before the task file

- Read upstream first: latest release, the head of its default branch, how far the branch is ahead of the pin,
  and what the branch's own version file says (an unreleased branch can carry an old version string; releases
  can be cut from another branch, so the pinned commit need not be an ancestor of the branch).
- If the wish can mean the release channel or the branch head, state your reading in one line and build the
  default for the reading the owner confirms. When he answers "I mean the branch", restart the task with the
  branch as the default and keep the release channel as a non-default flag.
- Branch builds are unreleased code. The PR body of the bump must say so, list the commits since the pin, list
  new database migrations, and tell the owner to snapshot and copy the state before he merges: a downgrade after
  a migration is not safe.

## Split the work: script here, workflow for the owner

- Put every step in one POSIX sh script in the repo (`scripts/<name>-bump.sh`) with `--check` (exit 10 when a
  newer pin exists), `--dry-run`, `--to <ref>`, and `--output <file>` for `key=value` lines. Test it on this
  box. The workflow stays thin: check, build the old and the new package, run the script, `dix`, open or
  refresh the PR.
- Agents may not write under `.github/workflows` and the App's push is refused there. Ship the workflow as a
  draft file at a normal path (`scripts/<name>.workflow.yml`) with a header that says where the owner copies it.
  Say in chat that it is not active until he copies it. Copy the pattern of the repo's existing ops-bot workflow
  (App token, skip rules, free disk, cache, commit identity, label). Pass every `${{ }}` value into a shell
  through `env:`.
- One open bump PR at a time on a fixed bot branch, refreshed each day (force-with-lease on the bot's own
  branch, `gh pr edit` for title and body), so the owner always sees the newest state and no PRs pile up. A
  failed build fails the job and opens no PR.

## Computing the pin (prove each against the current pin first)

- Source hash as `fetchFromGitHub` computes it: `nix flake prefetch github:<owner>/<repo>/<commit> --json | jq -r .hash`.
  Run it for the CURRENT pinned commit: it must equal the hash already in the file. That is the proof.
- npm dependency hash: `prefetch-npm-deps package-lock.json` from the lock file of that commit, again proven
  against the current value; if the tool's fetcher version differs from the one `buildNpmPackage` uses, set a fake
  hash, build and read the `got:` hash instead.
- Test the rewrite script on a COPY of the file, with an absolute path: a test that sets a relative script path
  before a `cd` rewrote the real pin file once. After every omp run, `git diff` the pin file and expect only
  the lines the task allowed.
- In CI, build only the package, from the flake's own nixpkgs, with the same call the module uses:
  `nix build --impure --expr 'let f = builtins.getFlake (toString ./.); in f.inputs.nixpkgs.legacyPackages.x86_64-linux.callPackage ./<pkg>/package.nix { }'`.
  Prove the expression locally on the old pin first. Smoke-test `result/bin/<tool> --version` and grep the
  build stamp for the new version and commit; it needs no daemon or state.
- Rewrite only the version, commit and both hash lines with anchored `sed`, then check `git diff --stat` shows
  exactly those lines and `nix-instantiate --parse` passes. Build only the package expression, never the system.
- A version string for an unreleased commit: `<version in its package file>-main.<7-char sha>`; read upstream's
  code for any place that parses or compares the version before you choose.
- Docs that name the version split in two: present-tense claims ("runs version X") are reworded once to point
  at the pin file; provenance claims ("read at tag X") stay, because they were true at that tag only. The bump
  must touch neither.
- omp's deny list blocks `curl`: the script may use `curl` as a fallback for CI, but omp can test only the `gh api`
  path.

## Pinning Hermes itself (the `hermes-agent` flake input)

- An input with no ref follows upstream `main`, so the weekly `nix flake update` moves Hermes to unreleased code. Pin it by release tag (`github:NousResearch/hermes-agent/vX.Y.Z`): then only a tag change moves it.
- Release tags are ANNOTATED: `git/ref/tags/<tag>` returns a tag object, so deref it (`git/tags/<sha>`) before you compare with the `rev` in `flake.lock`. Ignore upstream's date tags; accept only `^v[0-9]+\.[0-9]+\.[0-9]+$` and refuse a tag older than the pin (compare as versions).
- A `nix flake update <input>` may move only that node and its own sub-inputs: compare the `rev` fields of the lock before and after and fail when the repo's own `nixpkgs` or another node moved.
- A version stamp that the plugin loader compares (`hermesVersion`) must not be a string that people forget: derive it from the pinned package, or add a flake check that fails when it differs from the tag.
- Before the bump, read the release's Upgrade notes and audit each item against our config with `file:line` evidence: the gateway exit codes and `gateway.pid` that the wrapper reads, the dashboard routes that nginx denies (and new routes that return secrets), config keys, removed tools named in skills or deny lists, pinned plugins' `requires_hermes` and hook names, aux models that fall to a new default, and every upstream optional skill that `hermes.nix` installs by name (upstream moves or drops them, for example into a plugin, and the build fails on the missing name: remove it and update the comment). A new dashboard route that hands a key to the browser gets an nginx deny plus a line in the existing route check.
- Verify the lock yourself, not from omp's report: only the `hermes-agent` node's `rev`, `ref` and hashes differ, and the `rev` equals the dereferenced tag commit.

## A bot that runs on the box (a timer, not a workflow)

When the owner wants a daily check "like the export" done by a separate bot that may open and merge its own PRs:
- The agent's cron runs as the agent's user, so a bot identity's key must NOT be reachable from it. Split: a root oneshot mints the one-hour installation token (repo-scoped, minimal permissions, no `workflows`) into a runtime file readable only by the bot's system user; a systemd timer runs the check as that user; the agent's no-agent cron job only DELIVERS a result file (quiet when unchanged, loud on failure).
- Without the key file the units do nothing and do not fail, so the deploy is safe before the owner creates the App.
- Merge is an option per component, default off. Gate: author is the bot, the head sha is the one it pushed, checks finished and green (an empty list is not green), diff only the pin files, squash by API; a refusal by the ruleset is recorded, never routed around. The ruleset, which the owner sets, is the real gate.
- Evaluate both hosts before opening the PR; a failed evaluation opens one issue per release and no PR.
- Say in chat that the owner's "humans merge" rule binds the agent, not the bot, and that a merge switch is the owner's decision.
- Prove the schedule with `systemd-analyze calendar "*-*-* 14:00:00 America/Sao_Paulo"` (a zone name is valid in `OnCalendar`), and size `MemoryMax` from `/usr/bin/time -v nix eval` of both hosts, not a guess.
- The bot's script calls bump scripts that may not be on `main` yet. Build it against fakes in an offline test (shims for `gh`, `git`, `nix`, the bump scripts, a fake token string that the test greps out of every log), and write the contract (`--check` exit codes, `--output` keys) in the task file. Write the gate tests RED first on a naive gate (no author check, empty check list counts as green), then green.
- When the owner wants it "in the same PR" as the bump automation, build it in its own worktree off `main` in parallel (two omp runs at most), review and commit it, push the branch, and open no PR until the scripts it calls are in the tree: then cherry-pick it into the automation PR's branch. Re-run its test yourself: the count can differ from omp's report (a tool missing from the test PATH skips cases).

## A one-off bump while the daily-bump PR is still open

When the owner asks for "a PR to upgrade the version" and the script is not on `main` yet:
- Make a fresh worktree off `origin/main` (own branch `hermes/<tool>-bump-<sha7>`). Do not stack on the bump PR: take only the script, `git show origin/<bump-branch>:scripts/<name>-bump.sh > <scratch>/bump.sh`.
- Run it from the scratch path with `--package <absolute path of the worktree's package file>`: `--check` (exit 10 = newer exists), then `--verify` (both hashes must equal the file), then the real run with `--output <scratch>/out.txt`. The `.notes.md` it writes (commits since the pin, new migrations) is the source of the PR body.
- Take the channel from what the owner already said ("from main"), and mention in one line that a release is newer or older. Quote how far the branch is ahead and whether it diverged.
- The pin lines come from the script; stale comments in the package file ("release tag") are code, so a small omp task fixes them (comments only, values untouched).
- Leave present-tense version claims in docs to the daily-bump PR and say so in the body: the two PRs touch the same lines, and you resolve that conflict after the first merge.
- Build the package the way the module does, in the background: `nix build -L --no-link path:<worktree>#nixosConfigurations.<host>.config.piabrota.<tool>.package`. Before you call the deploy safe, run `rig ps` and `rig status`: a merge restarts the unit and ends every live seat.
