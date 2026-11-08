# An existing rig that serves another organisation's repositories (with that org's bot)

For "prepare rig X for MIP/plan Y of another org", "the rig must use <org> bots", "two setups, omp vs
Claude Code". Rig facts: `openrig-runtime-and-spec-changes.md`. Seat facts: `openrig-seat-environment.md`.

## 1. Find and read the plan

- A plan that is not merged lives in an open PR. `gh pr list -R <org>/<umbrella> --search "<repo names>"`, then
  read the file at the PR branch: `gh api 'repos/<o>/<r>/contents/<path>?ref=<branch>' -H 'Accept:
  application/vnd.github.raw' > <scratch>/x.md`, and open it with `read_file`. Do the same for the plan that
  defines the bots (the App MIP): which App proposes, which one merges, what each key can reach.
- The owner's order beats the plan. When the plan proposes a new rig and the owner names an existing one,
  extend the existing rig, say in the first PR lines which part of the plan you did not build, and do not edit the
  plan's PR (offer a small PR against it instead).

## 2. Limits are decisions, not defaults

- Do not raise `memoryMax`, the seat count or any cap to make the plan fit, even when the plan's default says so.
  Keep the value, name the decision and its one-line change in the PR body's manual steps.
- "Add a design / QA agent" is a seat question: each omp seat costs about 340 MiB and the unit holds two. Answer
  with the cheaper form: a mandatory first step for the builder (a short design note) that the reviewer checks
  before the diff. A new seat means a new rig and the owner's memory decision.

## 3. Using the other org's bot App on this box

Pattern that held up in review (code goes through omp; give it these rules in the task file):

- Only the App that proposes (opens PRs). Never mint, read or name the App that merges. Humans merge.
- Its key in its own root-only file on the box, a second private key made for this box so it can be revoked
  alone. A separate minter unit and timer (copy the working minter's JWT code; do not refactor the minter that
  keeps Hermes's own write access alive). Condition the unit on the key file, so a missing key is a skipped unit.
- Scope every token in the request: the operator token to the listed repositories with contents, pull requests
  and issues write (no workflows, no administration); one read-only token per repository for the seats. The seats
  never push.
- The git credential helper **fails closed** for these repositories: no bot token, no password, never a fallback to
  the owner's other identity. Commit identity through `includeIf "hasconfig:remote.*.url:..."` blocks appended at the
  END of the global config, so they win over `[user]` and touch only those repositories.
- A `gh` wrapper with an allow-list decided by the first two arguments (`pr create|view|list|diff|checks|status|
  comment|edit`, `issue view|list|comment`); everything else exits 2. It is a second guard behind the deny list.
- Everything behind one option that is off by default in the module. With the option off, the generated scripts
  and the Hermes git config must be byte-identical to `main`: prove it by hashing both (recipe in
  `nix-eval-checks.md`, "Prove option off").
- Commits that come in a seat's bundle carry the seat's author. After the fetch, reset them so the bot shows:
  `git rebase --exec 'git commit --amend --no-edit --reset-author' origin/main`.

## 4. Verify the generated scripts, not only the Nix source

Build the unit, which also builds the scripts it refers to: `nix build --no-link --print-out-paths
'.#nixosConfigurations.<host>.config.systemd.units."<name>.service".unit'`. The `ExecStart=` in it names the script
in the store; read the credential helper and the git-config heredoc there (a heredoc inside an interpolated Nix
string can break its terminator column). Run the helper against a scratch tokens folder to see the fail-closed
case. If an approval prompt for a check times out with no human, tell the owner and ask; do not reroute the same
check through another tool.

## 5. Two runtimes to compare (omp vs Claude Code)

- Same agents, same guidance, same tokens. The second rig sets `runtime:` and `model:` on each member (a plain
  Claude id, not `anthropic/...`), and its seats get their own folders (a Claude seat reads `CLAUDE.md` there).
- The Claude pieces (wrapper, managed settings, unfree name, outbox root) follow one shared `claudeSeats` value;
  add the new option to it, never a second definition.
- Never run both at once. Same task text for both, only the branch suffix differs. Record wall time, reviewer
  rejections, checks re-run, diff size, cost where the runtime prints it, and the unit memory from commands; never
  invent a number. Judge by the diff and the checks. Open ONE PR from the better branch.

## 6. Process pitfalls

- Two omp runs for a big change: run 1 the core, commit it, then run 2 as a delta task that says what is already
  committed. Commit between runs so run 2's diff is its own.
- A net-growth cap on a size-capped file (`AGENTS.md`) makes omp shorten UNRELATED rows. Name the rows it may
  shorten in the task, and read that part of the diff before the commit; restore any fact that was cut.
- Run `git diff --cached --check` before each commit: omp leaves lone-space lines in YAML and Markdown.
- A clone with staged work for another branch: `git -C <clone> worktree add ../<new> -b hermes/<slug> origin/main`.
- Manual steps for the owner go in the PR body as a checklist: create the repositories, check the App's
  installation covers them, generate the second key and write the key file as root (never paste a key in chat),
  the memory decision, the branch-prefix check in the other org's CI, and re-import the rig after the deploy.
