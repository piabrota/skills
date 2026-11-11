# Checking a nix-os change by evaluation, and bumping a flake input

Use when a change touches `.nix` files or `flake.lock` and a full build is too heavy to run, or the
owner waives verification. Evaluation is cheap on kvm4 (seconds when warm; the whole-system eval
fits the unit's memory cap). It proves the flake still evaluates, never that it builds or runs.

## Bump one flake input to a release

1. Resolve the tag to a full commit: `gh api repos/<o>/<r>/commits/<tag> --jq .sha`.
2. Before you write the PR, ask upstream what changed since the old pin, without cloning:
   `gh api 'repos/<o>/<r>/commits?path=nix&since=<pin date>' --jq length` (also `flake.nix`,
   `flake.lock`, `pyproject.toml`). Zero commits on the module paths means the options that
   `hermes.nix` sets did not move.
3. In a branch off `origin/main`: `nix flake lock --override-input <input> github:<o>/<r>/<full-rev>`.
   Read `git diff flake.lock`: only that node's `rev`, `narHash` and `lastModified` may change.
4. Commit only `flake.lock`. State in the body what was not run (build, `nix flake check`, the
   checks that need a build) and, when the owner waived checks, say so.
5. Anything that holds the version by hand (a variable in `hermes.nix`, the README badge) moves in
   the same PR.

## Bump the Hermes input itself (a release tag)

The input is pinned by tag, so the bump is a tag change plus `nix flake update hermes-agent`. The extra work
is proving that the new release still fits this box, before the PR.

1. **The lock holds the commit, not the tag object.** A release tag is annotated:
   `gh api repos/NousResearch/hermes-agent/git/ref/tags/<tag>` returns a `tag` object, and
   `git/tags/<that sha>` returns the commit. Give omp the commit and the facts you read from upstream
   (omp cannot run `gh` or `curl`): the release date, whether the notes are thin, and that the contract
   of the gateway wrapper still exists (`gh api 'repos/.../contents/gateway/restart.py?ref=<commit>'`: exit
   code 75 and the `--external-supervisor` flag).
2. **omp's final report arrives cut by the log tail.** Do not quote it. Read `git diff` for the lock node
   (only `hermes-agent` may move; an input that upstream dropped may leave the lock too) and rerun the
   proof yourself in one background script: package `--version`, the gateway-wrapper test count,
   `checks.hermes-docs-url`, both dry builds, `dix diff <old toplevel> <new toplevel>`.
3. **Plugins:** loop over `nix path-info -r <toplevel>` and print `requires_hermes` from every `plugin.yaml`.
   The pins are skipped on start when one needs a newer Hermes than the pin: this lists the trap.
4. **Try the new binary on copies of the real data, never on the real state.** In a scratch folder: copy
   `config.yaml` only (never `.env`), set `HERMES_HOME` and `HOME` to it, create `cron/`, and drop
   `CLAUDE_CODE_OAUTH_TOKEN` from the child's environment. `hermes config check` prints "Config version A → B"; read the step for B in the new package's `hermes_cli/config_migrations.py` and say what it
   rewrites and whether this box sets that key. Copy `state.db` with Python's `sqlite3` backup call from
   `execute_code` (the box has no `sqlite3` binary), run `hermes sessions list` on the copy, then compare
   `schema_version`, `integrity_check` and the session count before and after. This is a read path: say in
   the PR that a gateway start may run more migrations than it proved.
5. **PR body:** the release notes of a patch that rolls up hundreds of merged PRs list little, so say
   that unlisted changes are likely. List the config default that changes behaviour for the owner
   (for example a shorter timeout on an unanswered `clarify`). The merge restarts `hermes-agent` and
   `hermes-backend`: say no omp run or Hermes task may run at the merge, and what to check after
   (`NRestarts` stable, one gateway in the unit's cgroup).

## Prove a value without building

```console
nix eval --raw .#nixosConfigurations.<host>.config.system.build.toplevel.drvPath   # each host
nix eval --json .#deploy.nodes --apply builtins.attrNames                          # node names
nix eval --raw .#nixosConfigurations.<host>.config.services.hermes-agent.package.drvPath
nix derivation show -r <drvPath> | grep -o '\\"baseVersion\\":\\"[^"\\]*'          # text inside a derivation
```

- A file-writing derivation (`writeText`) keeps its JSON in the `.drv`, with escaped quotes: grep
  with the escapes above. This proves a stamp or config value without building the package.
- A package from a `callPackage` is overridable. Read the argument names in the upstream `.nix`
  file at the pinned rev (`gh api repos/<o>/<r>/contents/<path>?ref=<rev>`), then
  `pkg.override { <arg> = ...; }`. The module's own `override` chains on top; check the module's
  extra settings (for example `extraDependencyGroups`) still evaluate to the same list.
- A derivation that proves a hand-written claim is cheaper than the system: `nix-store --realise
  $(nix eval --raw .#nixosConfigurations.<host>.config.<path to the derivation>.drvPath)` builds
  only it. Use this for a `runCommand` with `allowedReferences`: `fixupPhase` rewrites script
  shebangs to store paths, so `allowedReferences = [ ]` fails with "not allowed to refer to" the
  moment a copied script has `#!/usr/bin/env bash` or `node`. List the interpreters
  (`pkgs.bashNonInteractive`, not `pkgs.bash`, which is the interactive variant) instead of
  dropping the check.
- A unit that needs a database waits for `postgresql.target`, not `postgresql.service`: the role
  and database come from a later setup unit, so a first deploy can start the app too early.
- A new sandbox option on a unit (`SystemCallFilter`, `CapabilityBoundingSet`) cannot be proved by
  evaluation. Copy the set from a sibling unit that already runs, and write in the PR body that it
  is untested and which line to remove first if the unit fails at start.
- `jq -e` exits 4 when the filter prints nothing, which a check script may do on success. Run the
  command the way the CI line runs it (without `-e`) before you call it a failure.
- **Prove "option off = nothing changes"** by hashing the pieces on the branch with the option forced
  off and on `origin/main` (baseline in a second worktree, loaded as `path:` flake). A flake attribute
  path cannot carry `extendModules { ... }`, so write a small `.nix` file and run
  `nix eval --impure --json --file cmp.nix`: `getFlake` both trees, `here.extendModules { modules = [
  ({ lib, ... }: { <option> = lib.mkForce false; }) ]; }`, then compare
  `builtins.hashString "sha256"` of `config.systemd.services.<u>.script`, `builtins.toJSON` of its
  `serviceConfig`, `path` (map `toString`) and `config.systemd.tmpfiles.rules`; list the service names
  that exist only on the branch (with the option on it must be just the new unit). Equal hashes are the
  proof; say which pieces you hashed.
- **An assertion fires only when the whole system is evaluated.** Reading one attribute such as
  `config.systemd.tmpfiles.rules` skips `config.assertions`, so a bad option combination looks fine.
  Prove an assertion by evaluating `...config.system.build.toplevel.drvPath` with the bad
  combination and grep the error for `Failed assertions`. A host often sets an option to `false`
  itself: force the combination with `lib.mkForce true` in the `extendModules` module, or the
  eval stops on conflicting definitions. For "this PR must not touch host X", compare the drvPath
  of X on the branch and on `origin/main` (`git archive origin/main | tar -x -C <scratch>`, then
  a `path:` flake each); equal paths are the proof. For several options that share a resource (an
  outbox folder, one tmpfiles parent line), eval each combination and count the lines with
  `sort | uniq -c`: each must occur once.
- **Size and build load of the whole system, cheaply:** `nix build --dry-run .#nixosConfigurations.<host>.config.system.build.toplevel`
  (a short "will be built" list and no "will be fetched" means the big packages are already in the
  store), then build it and run `nix run nixpkgs#dix -- diff /run/current-system <new toplevel>` (the
  `diff` subcommand is required; the last lines give paths and size). Put those numbers in the PR.
- **Prove a build-time guard (an `assert` or `throw` in a helper such as `site/hermes.nix`) by
  importing the helper with a fake argument set**: `nix eval --impure --json --expr 'let lib =
  (import <nixpkgs> {}).lib; in (import ./site/hermes.nix { inherit lib; cfg = {...}; ... }).facts'`,
  once with a value that must pass and once with one that must throw, and read the error text. The
  fake package needs `pname` (or `name`): without it the eval stops in `lib.getName` with
  "attribute 'name' missing" before it reaches the guard, which looks like a result and is not one.
  The guard must skip a case that has no value to compare (a package built as `0.0.0`), or it
  breaks a host that never showed the fact.
- **Which host does a change reach?** Compare each host's `toplevel.drvPath` on the branch and on
  `origin/main` (detached worktree, `path:` flake). A site change moves `piabrota` (KVM 1 builds
  the site) and leaves `piabrota2` equal; an nginx change for a vhost on KVM 4 does the reverse.
  Put both answers in the PR. A large "N derivations will be built" in a `--dry-run` of a host
  that did not change is the cache state of the box, not your change.
  **A `hermes.nix` change (a package, a home file, a setting) also moves `piabrota`**: the `/hermes`
  page is built from the evaluated Hermes config, and `nix-diff` shows the difference only inside
  `piabrota-site` (the `hermes_config` constant). Never write "the `piabrota` drvPath equals main" as a
  proof line in a task file for such a change; write "it differs only in `piabrota-site`" and check that
  with `nix-diff`. Say in the PR that the site on KVM 1 redeploys with no unit restart.
- **Which nixpkgs builds the thing?** `flake.lock` holds several nixpkgs nodes, and an input such as
  `hermes-agent` carries its own. The system uses the root input's: `jq -r '.nodes.root.inputs.nixpkgs
  as $n | .nodes[$n].locked.rev' flake.lock`. A package version for the box is read from the evaluated
  system (`nix eval --raw .#nixosConfigurations.<host>.pkgs.<name>.version`), never from a spike with
  `nixpkgs#<name>` or from another node's rev: a task file built on the wrong pin sends omp to the wrong
  version, and docs that name a nixpkgs rev go stale the same way.
- Flakes see only tracked files: `git add` moved and new files first. A `Git tree is dirty`
  warning is harmless.
- To work on a second branch while omp edits the first, use `git worktree add ../<dir> -b
  hermes/<slug> origin/main`; do not switch the branch omp is editing. A worktree of a shallow
  clone cannot evaluate the flake (`nix eval` stops with "getting Git object ... not found"): evaluate it as a path flake
  instead: `nix eval --raw "path:$PWD#nixosConfigurations.<host>.config.system.build.toplevel.drvPath"`
  (and `nix build` the same way). A path flake reads the working tree with untracked files and
  needs no `git add`. Otherwise run the `nix eval` in the primary clone on the branch you test.
