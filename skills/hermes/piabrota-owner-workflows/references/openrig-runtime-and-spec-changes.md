# Changing a rig's runtime or spec (OpenRig seats)

For "move rig X to claude-code / another runtime", "why does rig Y not show in the UI" and any PR that touches
`openrig/specs/`. Facts about the runtimes themselves: skill `openrig-docs`.

## Before the omp task

1. **Find who shares what.** Grep `openrig/specs/rigs/*/rig.yaml` for each `agent_ref`. An agent spec used by two
   rigs (for example an auditor) must not change its `defaults.runtime` when the owner scopes the change to one
   rig. Set `runtime:` and `model:` on the member in that rig's `rig.yaml` instead, and leave the other rig's file
   byte for byte unchanged. Say in the PR which reading of "only rig X" you used.
2. **The model id has the runtime's own form.** `anthropic/<id>` belongs to omp; a Claude seat takes the form the
   claude-code adapter expects. Make omp read the adapter in `openrig-src` and prove it, not copy the omp form.
3. **Guidance file differs by runtime.** Claude seats merge guidance into `CLAUDE.md`, the others into
   `AGENTS.md`. Have omp grep the role and startup files of the changed rig for "omp", "AGENTS.md" and omp-only
   tools, and change only files that rig alone uses.
4. **Write a facts file for omp when it needs web knowledge.** omp has no web access. Collect the facts yourself
   (docs through Context7, `nix build --dry-run`, the OpenRig source paths), save them as
   `omp-tasks/<topic>-facts.md`, mark each unverified item, and tell omp to re-verify the OpenRig ones in source.
5. **Give omp the exact room of size-capped files.** Run `sh scripts/context-size.sh` yourself and put the
   number of characters left in the task, with a net-growth cap. Without it omp adds rows and the file passes the cut.
6. **Unfree packages:** the exception is a name predicate (`allowUnfreePredicate` on `lib.getName`), never
   `allowUnfree = true`. Ask omp to prove one allowed name evaluates and another unfree package still fails. Put the
   package in the option-gated tool list so the closure does not change while the option is off.
7. **Auth for a second runtime on the same daemon.** The daemon env allowlist reaches every seat. Before you add a
   token name for one runtime, read how the other runtime ranks it (Claude Code lets an API-key variable outrank the
   OAuth token). If no safe split exists, report the blocker; do not guess.

8. **Read omp's wording for instructions to an agent.** Skill and doc text that omp writes may tell Hermes to
   answer a prompt (`rig seat continue` for a consent or bypass dialog). Check it against `hermes-rig` rules:
   a trust or consent prompt goes to the owner. Fix it by hand before the commit.
9. **Prove the gate with derivation paths, not words.** Evaluate `config.system.build.toplevel.drvPath` for every
   host on the branch and on `origin/main`, with the baseline in a second `git worktree` of `origin/main`
   (`git stash` leaves new untracked files in place, so the baseline is not clean). A host the change should not touch (the web-only VPS) must keep the
   same path. The other host changes only through files the change names (specs, docs, skills in the store).
   Then evaluate once with the option forced on in a scratch override and check what appears (package, `/etc` file).
10. **Check the facts omp cites exist.** `find` the source files it names in `openrig-src` and `grep` the line it
    claims. A claim with a file name and no line is cheap to fake.

## Designing a new rig ("define the rig", "a fabric for X")

When the owner says "define the rig" or "in the format of Rig, with RigSpec", the deliverable is an OpenRig
spec set in nix-os `openrig/specs/` (`rigs/<name>/rig.yaml`, `agents/<role>/` with `agent.yaml`, guidance and
startup files), not a standalone pipeline document. A request for a "fabric" or a "pipeline" that Hermes or the
rig will run defaults to this form: when the owner has to correct you with "in the format of Rig", the request
was ambiguous and you should have started from the rig, not from a stage document. A doc, wiki pages and a short `hermes-rig` reference go with
it. Steps:

1. **Copy the shape of an existing rig** (`wave-forecaster-dev`: `env:` block, `permission_policy`, member `cwd`,
   shared norms agent, startup role file per seat). Read `rig-spec.md` "Validation Rules Summary" and tick each
   rule by hand: there is no `rig` validator on the box.
2. **Seat count against the unit.** The daemon unit holds every seat in one memory cap (about 300 MiB per omp
   seat against 2G), so a rig of more than two seats is staged: `rig import <spec> --materialize-only`, then
   `rig seat launch <seat>` per phase (from rig-spec.md, not run here). Write the phases and the exact commands
   in the rig's doc and in the Hermes reference.
3. **Make the artifact of record a checked file, and gate on its hash.** For a pipeline whose input is a script,
   screenplay or plan: one machine-readable source file, a lint with numbers in one profile file, and an approve
   command that stores the file's SHA-256 so every later stage refuses a changed file. Writer seats may edit it;
   later seats may not; reviewer seats are read-only and cite beat or section ids.
4. **Tools a rig needs ship as an option-gated package** (off by default, like `waveForecaster`): package, state
   folders, outbox folder with the 14 d cleanup rule, and `ReadWritePaths`, all behind one `piabrota.openrig.<x>.enable`.
   Turning it on is the owner's decision; say so.
5. **Make omp prove the toolkit on this box before the PR**: run the example end to end, measure wall time and
   peak RSS (seats share the unit cap), and show a refusal case and a lint failure. Ask it to say what the output
   looks like, frankly. Numbers that come from memory (a platform's safe zones, loudness targets) go in one profile
   file marked unverified.
6. **"Claude only" means no generative media service**: every pixel and sound comes from code a seat runs
   (ffmpeg, SVG, captions). Seats have no network; the deny list of `hermes/omp.yml` blocks `curl` and installers.
   The runtime is the owner's choice: when he names one ("everything on the Claude Code harness"), use it. With no
   instruction pick `omp`, which works today; a switch to `claude-code` is one line per member, but the option that
   installs the `claude` wrapper and the managed settings must then be on (see the next section).

## A rig that produces a document (thesis, report, PDF)

A document rig is a toolkit plus seats, not seats that improvise. Split the work in two omp runs that share a
*contract* (command names, folder tree, member ids, env names) written at the top of both task files: run A builds
the toolkit and the Nix option, run B writes only new files under `openrig/specs/`. Each run lists the paths it must
not touch, and run B reports every name it used that is not in A's contract.

1. **Fetch, do not assemble, in the writer seat.** A `fetch` command claims one section atomically (a lock
   directory per section, stale after a limit), prints a self-contained work order (brief, verified source keys,
   style rules, files to write). Sections are independent: they share only the bibliography, a glossary and a facts
   file. A `submit` command runs the cheap gates and only then marks the section drafted.
2. **The reviewer's accept stores a hash of the section.** `assemble` and `publish` refuse a section edited after
   its accept. A `revise` verdict counts rounds and, after a limit, sends the question to the owner.
3. **Gates are local and honest.** No model and no network: readability numbers, surface-pattern (slop) heuristics,
   a rules checker with PASS/FAIL/CANNOT-CHECK per rule and its source, a citation checker. Say in the output and
   the docs that no AI-text detector is reliable and that the gate cannot promise an outside score.
4. **Citations follow a verified-source log.** Every cited key has a row with a status (`verified`, `partial`,
   `unverified`) and a captured passage in a source file; only `verified` keys may be cited. Placeholders for what
   the author alone knows (`**[AUTHOR: ...]**`) block the final build.
5. **Only the librarian seat has the web.** Put `claude_permissions: {deny: [WebFetch, WebSearch]}` on every other
   member in `rig.yaml`; check first that the global managed settings do not deny them.
6. **A pinned third-party template is fetched by commit, never copied in.** Fill its gaps (missing pages, fonts) in
   an overlay of our own. Make the template an interface (a small `template.json`) so a second one fits later.
7. **Source rules from the institution come first.** Download the rules (a PDF in a public repo comes through
   `gh api .../contents/<path> --jq .content | base64 -d`; text with `nix shell nixpkgs#poppler-utils -c pdftotext
   -layout`), say which text is in force and which is a proposal, and put the extracted text in the facts file for
   omp, which has no web.
8. **Three runs, docs last.** Run A (toolkit and Nix option) writes its final report to a file in `/tmp` or the
   workspace. Run B (specs) runs beside it on disjoint paths. The docs run starts after both, reads that report and
   the real files, and takes every number from them or says "not measured". The docs run also draws the archify
   figure the owner asks for in a rig PR: one figure that names every seat, tool, gate and the output, with at most
   about 12 boxes (group the writers) and a pt-BR mirror. Where the rules and findings of a UFRJ thesis rig are:
   `references/thesis-rig-sources.md`.
9. **Shared gates move together.** The Claude pieces (wrapper, managed settings, unfree name) turn on with
   `wave.enable || <new>.enable`; the shared outbox parent rule is written once under the same `||`, never twice.
   The memory of a Claude seat is unmeasured: write the two-seat phases into the rig header and the docs.

## Keeping a rig up ("run it 24/7", survive deploys)

A name such as "wave-forecaster dev" with no GitHub repository of that name is a rig of nix-os
(`openrig/specs/rigs/<name>/`). Find it with `git ls-tree -r origin/main`, not in the old workspace clones (stale, and
some are dirty): work in `git worktree add ../nix-os-<slug> -b hermes/<slug> origin/main`. "Prepare to run" means
the supervisor, the option and the docs; sending tasks and answering a seat prompt stay out of it.

Nothing restarts a rig after a deploy, a reboot or a crash, because `KillMode=control-group` ends every seat. The
fix is a timer plus a oneshot "keeper" (not a looping service) that is idempotent, from facts read in `openrig-src`:

- `rig ps --json` lists rigs with `status` (`running`, `partial`, `stopped`), `lifecycleState`, `attentionCount`,
  `runningCount`, `isArchived`. `rig ps --nodes --rig <r> --json` adds per seat `lifecycleState` and
  `intentionallyStopped`. `rig down` sets `intentionallyStopped` on every seat: a keeper must leave such a rig alone.
- `rig up <rig> --existing` restores a stopped rig from its latest usable snapshot, or from current state when that
  is eligible; otherwise it fails with "Start fresh with `rig up <spec-path>`". It refuses while any seat is live,
  so it cannot repair `partial`. The daemon takes periodic snapshots by itself (300 s): no snapshot job is needed.
- Keeper rules: never start a daemon (`rig status` must say "Daemon running"); skip when any other rig has
  `runningCount > 0` (one memory budget); log `partial` and `attentionCount > 0` as warnings and change nothing; cap
  attempts (for example 3 an hour, state in `StateDirectory`) and then fail the unit so `systemctl --failed` shows it;
  never answer a bypass or consent prompt. Harden it like the daemon unit, with `AF_NETLINK` allowed (Node CLI).
- Do not write two rules into the task that contradict each other. "Leave a `rig down` rig alone" plus "restart the
  port rig when the other rig ends" cannot both hold: `rig down` marks every seat stopped on purpose, so a human
  must run `rig up <rig> --existing` after the other rig ends. State the final behaviour in the task file once, and
  when omp's report says the code differs from the task, make the docs and the skill text match the code and tell
  the owner the one line he can change.
- Prove the first-start path read-only on the live daemon before the PR: `rig up <rig> --existing --plan` (shows the
  "no restore-usable snapshot" failure a never-started rig gives) and `rig up <spec-path> --plan` (must pass). A
  materialized rig that never ran has no snapshot, so the keeper's fall-through to the spec is the normal first start.
- Get the keeper script path with `nix eval --raw ...systemd.services.<unit>.serviceConfig.ExecStart` (`nix build` on
  that string attribute fails with a string-context error) and run the fake-`rig` test against it.
- The merge that adds it changes `openrig.nix`, so the deploy restarts the daemon and ends live seats. Say so in the PR.
  Also list what stays with the owner: the one-time Claude Code bypass warning (`rig seat continue`), who feeds the
  seats tasks, whether the GitHub App covers the private repo the seats clone (not checkable from here), and the
  unit memory (`MemoryHigh` is the working limit; raising it is his call, never part of this PR).
- An idle Claude Code seat does no work: "24/7" means alive, not busy. Say that, and that feeding it tasks is a
  separate decision (cost on the owner's subscription).

## After the merge: the rig does not follow the spec

When the owner says a runtime or field "did not change in the UI" after a merge, that is the order to fix it: do not
ask again. Check the PR is merged and `/etc/openrig/specs/...` holds the new value, then archive and re-import
at once (both are reversible), and answer with the old rig id and its `rig unarchive` command. Starting seats stays
the owner's call.

A rig keeps the spec it was created with. For the rig to use the new spec: `rig snapshot <rig>`, `rig archive
<rig>`, then `rig import <spec> --materialize-only` (stopped, visible in the UI) or `rig up <spec>`. Use a path under
`/etc/openrig/specs`, because the daemon user cannot read the workspace. A deploy that restarts `openrig` ends all
seats; the rig stays as recoverable.

## Why a rig "does not appear"

A spec file is not a rig and `/etc/openrig/specs` is not a spec-library root. Check the daemon, not the folder:
`rig ps --filter status=stopped`, `rig ps --include-archived`. Create the rig with `--materialize-only`.

The same answer holds for a rig that a PR just added: after "I do not see the new rig merged", check
`gh pr view <n> --json state,mergedAt` and `ls /etc/openrig/specs/rigs/` (the deploy copied the spec), run
`rig status` (it must say "Daemon running"), then `rig import /etc/openrig/specs/rigs/<name>/rig.yaml
--materialize-only` without asking: it starts no seat. Tell the owner what still blocks a start (an option that
is off in `hosts/`, a missing tool in the seat profile) and that the first seat launch is his call.
