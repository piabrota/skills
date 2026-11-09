# Choosing Hermes plugins from the community catalog

Use for "which plugins fit instance X", "always index the catalog", or any plan that adds a
plugin to `hermes.nix`.

## Where the catalog really is

- The docs page `/docs/plugins` is drawn in the browser ("Loading the catalog…"). A plain fetch
  returns no entries and the obvious `*.json` URLs 404. Do not keep guessing endpoints.
- The source of truth is `plugin-catalog/<name>.yaml` in NousResearch/hermes-agent. Fields: `tier`
  (official, verified, community), `version`, `requires_hermes`, `repo`, a pinned `sha`,
  `category`, and a description whose "Disclosure" sentences say what the plugin reads, writes,
  sends and registers.
- Never clone hermes-agent for this (workspace rule). Fetch the listing and each file through the
  API, six in parallel (about 75 s for ~1,000 files):
  `gh api 'repos/NousResearch/hermes-agent/contents/plugin-catalog?ref=main' --jq '.[].name'`, then
  `xargs -P 6 -I{} sh -c 'gh api "repos/NousResearch/hermes-agent/contents/plugin-catalog/{}?ref=main" --jq .content | base64 -d > dir/{}'`.
  The newest catalog commit: `gh api 'repos/NousResearch/hermes-agent/commits?path=plugin-catalog&per_page=1'`.
  The catalog at the commit that `flake.lock` pins is older than `main`; say which one you read.
- Keep the index outside git unless the owner asks (a JSON file in the workspace: name, tier,
  version, requires, repo, sha, category, short description, rough flags, catalog commit, date).
  Keyword flags are hints, not a review. A refresh reads only commits that touched `plugin-catalog/`
  since the stored commit.
- Plugins in community lists but not in the catalog are unreviewed by Nous: scan them before use.

## Fit test for a long-living instance

For each candidate record: tier, version, `requires_hermes`, stars, last push, licence (GitHub
API), and the disclosure text read in full. Then reject or defer on any of these:

- Background model calls or registered recurring agent cron jobs: they spend the owner's quota.
  Require a measured tokens-per-day figure first.
- A default mode that enforces money budgets or blocks tool calls: on a subscription the cost
  figures are estimates. Only a monitor-only mode is acceptable.
- Lazy downloads at first use (models from a hub, `uvx`, `npm`): `allow_lazy_installs` is off, so
  the artifact must become a pinned store path.
- Cloud mode that sends turns or traces out, API keys, paid credits (needs the owner's yes).
- Docker, Node, a browser, a dashboard or Desktop the box does not run. A catalog entry with
  `category: desktop` is a UI for the Hermes Desktop app. Its tool may only queue commands that
  the app runs and then wait for a reply, so it does nothing on this headless box. Read its
  `tools.py` before you call it usable, and check `provides_tools` in the catalog YAML (an empty
  list means UI only).
- A repo that returns 404 (dead catalog entry): flag it in the index.
- A tool built to defeat bot detection: it conflicts with the stop-on-refusal rule of the video
  indexer.

Wave the shortlist: adopt after checks (local, read-only or sandboxing, no network), evaluate with
a measurement, and not now with the reason. One plugin per PR, pinned by the catalog `sha`.

## A single-need request ("is there a plugin for X, add it by PR")

0. **Read "community plugin" as the wider ecosystem, not Nous's catalog.** The catalog is one
   curated slice. When the owner asks whether a plugin exists, search community sources too
   (`0xNyk/awesome-hermes-agent`, `hermesatlas.com`, GitHub search for `.hermes-plugin` and
   `provides_hooks`, `plugin.yaml` files) and lead with what exists there. "Not in Nous's
   catalog" is a caveat that goes after it, never the whole answer: it reads as "nothing exists".
1. Search the local index with `jq` (name, desc, title, category match on the keyword; `python3`
   is not on the box). Then read the YAML and the plugin's `tools.py` / `plugin.yaml` at the
   pinned `sha` through `gh api ...?ref=<sha>`.
2. Check whether the box already does the job: `hermes.nix` lists bundled and external skills
   (for example `research/rss-feeds` and `devops/watchers` already cover feeds with dedup). A
   skill beats a plugin when it covers the need, because it adds no third-party code.
3. Apply the fit test above. Plugins enter through `extraPlugins` and `settings.plugins.enabled`
   in `hermes.nix`, pinned by commit with `fetchFromGitHub` (`subPlugin` when `plugin.yaml` sits
   in a subdirectory). That is a nix-os PR, so a merge deploys and restarts the unit.
4. When no candidate fits, open no PR. Say so first, give the table of candidates with the
   reason each fails, and offer: use the existing skill, install anyway with its stated limit, or
   write an own plugin in `hermes/plugins/` (the `pirsig-*` mould). Recommend one.

## "A mature plugin to run a long task overnight"

- The catalog has no maturity data. Measure each shortlisted repo with `gh api repos/<o>/<r>`
  (stars, forks, open issues, `created_at`, `pushed_at`, licence) and `.../contributors`; report
  age and idle days, and flag `NOASSERTION` licences. Most community plugins have one to three
  contributors: say that none is mature when that is what the numbers show.
- Before any plugin, offer what the core already has and read it in the pinned source and user
  docs (`website/docs/user-guide/features/`): `/goal` (a standing objective, a judge model after
  each turn, quality gates, a turn budget that pauses it), cron jobs, and the kanban board
  (durable, with retries and a circuit breaker). Check the configured turn cap in this box's
  settings before you promise a number of turns, and whether kanban is enabled before you offer it.
- A memory-consolidation plugin is not a task runner: match the plugin's purpose to the request
  before you spend a PR on it.
- Ask the one missing input (the task and how to verify it), not a permission already given.

## Adding a plugin through `extraPlugins`

- The NixOS module refuses an `extraPlugins` entry without `plugin.yaml` and `__init__.py` at its
  root (`nix/moduleCommon.nix`, a check near line 918 at the pinned rev). A plugin that ships only
  the portable `plugin.json`, or only a skill and scripts, fails the build. Do not fabricate a
  manifest for a third-party plugin. Load only its skill through `settings.skills.external_dirs`
  (pinned by `fetchFromGitHub`), and run its installer for cron jobs after the merge with a dry
  run first.
- A plugin whose manifest sits in `.hermes-plugin/` (`plugin.yaml` and `__init__.py`, with the
  skills in `skills/` at the repo root) still fits: read its `__init__.py` for how it finds its
  skills (obra/superpowers accepts a flat layout), then build the package with
  `pkgs.runCommand` that copies the two files and the skills directory to the root of `$out`, and
  keep the store path read-only. A task for omp: the change is in `hermes.nix` only; the docs rows
  are Markdown, so write them by hand while omp runs. Pin with `fetchFromGitHub` at the tag's
  commit, and get the hash with `XDG_CACHE_HOME=<scratch> /run/current-system/sw/bin/nix flake
  prefetch github:<owner>/<repo>/<rev> --json` (its `hash` field; the default cache stops on a
  stuck registry link). Proof that fits the box: `nix-instantiate --parse`, a `--dry-run` of the
  host's toplevel, and a build of the package with `ls` of its root. Whether the loader starts it
  is only provable after the deploy: ask for a look at `errors.log`.
- State what a hook does only from its source: find `register_hook`, read the condition on
  `is_first_turn` or `platform`, and count the injected bytes. A catalog description or a README
  gave a wrong "every call" once.
- Run `hermes plugin-guard scan <dir> --fail-on high` and read every HIGH at its line before you
  report. `HPG103` on `subprocess.run([...])` with a list and no shell that runs the plugin's own
  script is low risk; `HPG001` means the manifest format is not `plugin.yaml`, which matters for
  the point above. Show the owner the counts and your reading of each HIGH.

## Issue shape for a plan like this

Summary with the target specs and what is measured versus quoted; candidate tables with reasons;
what the new size changes (raise each cap in its own PR, keep the repo rules until the owner
lifts them); a Definition of Done in three parts: the index itself, checks common to every plugin
(pinned, disclosure read, scanner run, `requires_hermes` met, RAM and disk measured on the new
host, listed in `extraPlugins` and the check script, rollback line), and one drill per plugin
(for example restore from backup into an empty folder); a closing item that lists each plugin as
adopted, rejected or postponed. Measure on the target host, never extrapolate from the old one.
