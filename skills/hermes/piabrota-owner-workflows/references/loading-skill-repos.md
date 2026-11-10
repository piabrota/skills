# Loading the owner's skills (or another skill repo) into Hermes

Use for "load the skills of repo X", "add these skills as commands", or a PR that changes
`settings.skills.external_dirs` in nix-os `hermes.nix`.

- External skills need no new code. Every skill in `settings.skills.external_dirs` is a `/name`
  command (Telegram and others), and on Discord `/skill` with an autocomplete list (25 shown).
  Hermes ignores the `disable-model-invocation` frontmatter key, so "manual-only" skills can still
  load on their own: tell the owner.
- Pin with `pkgs.fetchFromGitHub` (rev + hash), not a git submodule: a flake reads its git tree
  without submodules unless the URL has `?submodules=1`, and enabling them in CI is a workflow
  edit. Hash: `nix-prefetch-url --unpack https://github.com/<o>/<r>/archive/<rev>.tar.gz`, then
  `nix --extra-experimental-features nix-command hash convert --hash-algo sha256 --to sri
  <base32>`. A wrong hash fails the CI build and prints the right one: say so in the PR.
- Copy an allowlist of skill folders with `pkgs.runCommand ... { allowedReferences = [ ]; }`
  (mirror `optionalSkills` in `hermes.nix`), set it in `external_dirs`, and add the derivation to
  `restartTriggers`. A missing path fails the build, so list paths from the pinned tree.
- Vet every skill before listing it. Leave out: a skill that makes a bilingual PR (conflicts with
  the English-only rule), tells the agent to merge or force-push, assumes Claude Code settings or
  an Obsidian vault, runs a script that needs `python3`, `pandoc`, `just`, Chrome, Docker, `psg`
  or `zk` (not on the box), duplicates another skill, is an empty stub, or shares a name with a
  bundled skill (the bundled one wins). Scan frontmatter and bodies with a script, then read the
  borderline ones. Document included and excluded skills, each with its reason, in the PR docs.
- Test without touching the live config: put `skills:\n  external_dirs: [<dir>]` in a temp
  `HERMES_HOME/config.yaml` and run `HERMES_HOME=<tmp> hermes skills list`; compare names with
  `find ~/.hermes/skills -name SKILL.md` for clashes. Copies out of the Nix store are read-only:
  `chmod -R u+w` before `rm -rf` in scratch.
- The pinned repo's own AGENTS.md rules (for example a `Co-Authored-By` trailer) do not govern
  this agent's PRs: add a short note to `hermes/AGENTS.md` saying which rules win over a skill.

## One skill from a third-party repo ("add this in a new PR" with a bare URL)

A bare repository URL plus "add this" means: add it to the Hermes config in a nix-os PR. Classify it
from its file tree first (a `skills/<name>/SKILL.md` repo is a skill, a `.hermes-plugin/` or
`plugin.yaml` repo is a plugin: `references/hermes-plugin-catalog.md`) and say the class in the first
reply.

1. Vet from the API, without a clone: `gh api repos/<o>/<r> --jq` for licence, stars, last push,
   `archived` and `fork`; the tree with `git/trees/HEAD?recursive=1`; the head commit. Read the
   skill's front matter and section headings. Grep every script for `subprocess`, `os.system`,
   `requests`, `urllib`, `eval(`, `exec(`, `environ`, `http`. A script that Hermes only reads is low
   risk when the box lacks its runtime (no `python3` for Hermes, no framework package): say that,
   and name each hit with its file.
2. Pin: `XDG_CACHE_HOME=<scratch> /run/current-system/sw/bin/nix flake prefetch
   github:<o>/<r>/<full rev> --json` gives the SRI hash; `pkgs.fetchFromGitHub` with `rev` and
   `hash` goes beside `abvxSkills` in `hermes.nix`.
3. Copy only the skill folder into the final string of `optionalSkills`, under a category folder
   (`mkdir -p $out/<category>`; Hermes reads the category from the folder, and a flat copy shows
   `general`). Keep `allowedReferences = [ ]`.
4. omp edits `hermes.nix` only (one binding, two lines; about ten turns); write the two doc rows
   (`docs/HERMES.md`, `docs/HERMES.ptBR.md`, after the `hermes-cron` row) by hand while it runs.
   Say in the task file that you add those rows in the same worktree, or omp reports them as
   unexplained changes in `git diff --stat` and asks whether it wrote them. The doc row states the
   description cost (about its length in KB, shown in every session's skill list) and that Hermes
   only reads the scripts.
   Proof that fits: `nix-instantiate --parse`, a `--dry-run` of the host toplevel, then evaluate
   `config.services.hermes-agent.settings.skills.external_dirs` and realise its first path (the
   `optionalSkills` store path) and `ls` the skill folder.
5. After the merge and deploy, a system note that the available skills changed, with the new name
   in it, proves the skill is listed. It does not show the description cut or the category: say so.
   Put the cost of a long description in the PR body: its text appears in the skill list of every
   session, while the body loads only when a task matches. State what was not checked: Hermes was
   not started with the skill, and the category and the description cut were not seen.
6. The `.nix` change deploys and restarts the unit (apply the Markdown-only list in SKILL.md
   first). Give the removal in one line: the binding and its two lines.
