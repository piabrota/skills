# Model routing, project surveys and service costing

Three topics that come up sometimes. Each is a procedure with its own checks.

## Routing Hermes work to cheaper models

- Hermes has no per-turn router. `smart_model_routing` is an unread stub. Real levers:
  `delegation.model` (all `delegate_task` subagents, global pin), `auxiliary.<task>.model` (side
  calls: `title_generation`, `skills_hub`, `vision`, ...), per-cron-job `model`, and the external
  `advanced-delegation` plugin (`model_map` routes the main model picks per task).
- **"Route to model X when the prompt has keyword K"**: no setting or hook does it. The
  `pre_llm_call` hook only adds context or blocks a turn, and gets no agent; `switch_model` is
  internal, so a plugin that calls it breaks on a Hermes update. Do not build that. The supported
  routes are `/model <id>` by the owner, and a one-shot job on the other model:
  `hermes cron create --model <id> --provider anthropic --deliver <chat> "in 1m" "<full prompt>"`.
  That job has no chat history and no clarify or messaging tools, so the prompt must stand alone.
  A SOUL.md rule ("when the message holds K, create that job and say so") makes it automatic; it
  is a Markdown-only change. Before you build, prove the model answers on the subscription with a
  copy of the home: `HERMES_HOME=<scratch copy> hermes chat -q "Reply with exactly: ok" -m <id>
  --provider anthropic -Q`.
- **Resolve a model name before you assume what it is.** A name the owner gives next to a tool
  ("Fable 5.2") can be a model, not the compiler or library you know. Grep the pinned source
  first (`agent/usage_pricing.py`, `hermes_cli/models_catalog_static.py`, `agent/model_metadata.py`)
  for the id and its price, and say plainly if an earlier reading was wrong.
- Put mechanical work on the small model (subagents, titles, skill matching). Keep compression,
  the dangerous-command `approval` classifier (a guardrail), the post-turn review and every
  decision on the main model.
- The main model delegates only if SOUL.md tells it when. Add: check subagent output before use.
- Use a model ID found in the pinned source or in the live model list; say that run-time
  acceptance on the owner's subscription is unverified until a delegated run works.
- **Bumping a model ID (for example a newer Haiku).** Check three things before the PR:
  the ID is in `~/.hermes/provider_models_cache.json` (`grep -o 'claude-[a-z0-9.-]*'`; the
  provider's own list, so no web fetch is needed, and `web_extract` may be search-only) plus one
  web search for the vendor's announcement; `~/.hermes/config.yaml` is generated from nix-os
  `hermes.nix` (a hand edit is overwritten, so the change is a PR that deploys); and the full
  list of places that name the old ID (`git grep -n '<old-id>'` on nix-os `main`).
  Those places split into two groups with different owners: Hermes settings (`settings.auxiliary.*`,
  `settings.delegation.model`, and the docs, wiki pages and AGENTS.md rows that describe them in
  both languages) and omp's own roles in `hermes/omp.yml` (and the docs lines that describe
  those). Move the Hermes group together, because one docs row lists `delegation.model` and the
  `auxiliary.*` keys side by side. Leave `omp.yml` out unless the owner asks, because omp's model
  registry is pinned to its own version and may not know the new ID. Say in chat which group
  moved and which did not, and offer the second as a follow-up. Put the grep result as the
  "how to prove it is done" check in the omp task file.
- On NixOS set these in the module (`settings.delegation.model`, `settings.auxiliary.*`), never
  with `hermes config set`.

## Context size: compression and session resets

When the owner says chats grow too long or tool output is heavy, read the pinned Hermes source
before you pick a number (a file read of `hermes_cli/config_defaults.py`, block `compression`, and
`agent/model_metadata.py` for the model window):

- `compression.threshold` is a ratio of the model window (default 0.50). A ratio below the
  default is floored at 0.75 only for windows under 512K tokens, so check the window first: the
  main model here has 1,000,000 tokens, so 0.40 is real (about 400K). `compression.threshold_tokens`
  is an absolute cap and the lower of the two wins. Gateway session hygiene is a second net at 85%
  and has no setting.
- Each compression rewrites the cached prompt prefix once (the one sanctioned cache break); later
  turns cost less. State this trade-off in the comment and the docs, and pick the number with the
  owner (default offer: 0.40).
- Core no longer resets a gateway conversation on a timer. A `session_reset` block does nothing
  without the community plugin `hermes-session-reset-policy`. Adding it follows the plugin process
  (`references/hermes-plugin-catalog.md`: scan, disclosure, pin, owner merges), so propose it as its
  own PR and keep the threshold change separate.
- Set it in `hermes.nix` (`settings.compression.threshold`), never with `hermes config set`.

## Plan issues and research tickets ("create an issue to try X")

An issue is Markdown, not code: write it yourself and open it with `gh issue create --body-file`, even while an
omp run is going. The reader is the owner, who decides in one line, so the ticket must hold verified facts and the
choices, not a guess.

1. **Search before you assume what the name means.** A name the owner gives may be a method, a plugin or a
   codename, not the thing it sounds like. Run two web searches, then read the primary source (repo README,
   `docs/`, release notes, test record). Say in the first section what the thing is, and correct the premise
   plainly if it was wrong.
2. **Read primary sources with `gh api`, not with a blog page.** `web_extract` may be search-only, and a blog's
   HTML is mostly script and style. `gh api repos/<o>/<r>/readme --jq .content | base64 -d`, `/contents/<path>`,
   `/releases`, `/issues/<n>`, and `--jq '{license:.license.spdx_id,pushed:.pushed_at,...}'` give the facts. The
   test record or support table of a project says what was run and what was "not run": quote that status.
3. **State each reading of an ambiguous word.** When a term has two readings (a model endpoint or an execution
   host; "mesh" in a tool that has no such feature), grep the tool's docs for the word, say it is absent, and write
   the reading you used in the issue. If the owner then corrects it, rewrite the issue; do not append.
4. **Separate the owner's facts from yours.** Hardware and OS the owner states go in as "the owner gave these
   facts", with the consequence (a non-NixOS host cannot be managed by the repo). Your own estimates carry a mark
   (`⚠`, "not checked") and a way to measure.
5. **Shape.** Goal; what the thing is (verified, with links and the read date); how it fits this box and what it
   needs (read the real source of OpenRig, omp or Hermes for each integration point; say "not run"); options with
   pros, cons and the blocker of each; limits on this box (the 2G unit, two seats at a time, tokens); a plan of
   steps that are each a PR or a report in the issue; "Done when"; risks; open points for the owner as numbered
   questions. End with the signature line. English, ASD-STE100, no agent footer.
6. **Check your own numbers before you post:** a dated count ("six weeks old") from the dates you read, a model
   field you saw in one file is "in the adapter I read", not "in all adapters".

## Surveying GitHub projects (forks, derivatives)

- GitHub's `fork` flag is false for detached forks and renames. Classify by README and LICENSE
  ("fork of", copyright lines), not by metadata alone: fork, plugin on stock core, or rewrite.
- Record per project: stars, last push, releases, licence (flag non-OSI ones such as AGPL with
  addenda), and the read date. A last push months older than upstream is a maintenance risk.
- Read the pinned Hermes source with `gh api repos/NousResearch/hermes-agent/contents/<path>?ref=<rev>`
  (rev from the `hermes-agent` node of nix-os `flake.lock`), not with a clone: the workspace rule
  forbids cloning that repo, and a blobless clone still pulls its whole history.
- For community Hermes plugins and the plugin catalog, load `references/hermes-plugin-catalog.md`.
- `web_extract` may be unavailable (search-only backend): fetch pages with
  `curl -sL -A 'Mozilla/5.0'` and strip tags with perl; use `gh api repos/<r>`, `/readme`,
  `/license`, `/releases` for repo facts.
- Separate official sources from trade or community articles; label price or feature claims from
  the latter as unverified.
- Check resource claims against the box before answering "is it heavy?": `free -m`,
  `systemctl show <unit> -p MemoryCurrent -p MemoryPeak -p MemoryMax`, and the cgroup
  `memory.stat` (anon vs file: page cache is reclaimable, so do not read it as use).

## Surveying open-source tools for a media or ML pipeline (video, voice, image)

- Batch the facts in one `execute_code`. For code: `gh api repos/<o>/<r> --jq
  '[.full_name,.license.spdx_id,.stargazers_count,.pushed_at[:10],.archived]'`; print `full_name`,
  because a renamed repo redirects and the name you typed hides the new owner. For weights:
  `https://huggingface.co/api/models/<id>` and read `cardData.license`. The code licence is not the
  weights licence: an MIT repo can ship non-commercial weights. `NOASSERTION` and `other` mean read
  the licence file. A non-commercial weight fails any plan that earns money.
- Packaging: `nix eval --raw nixpkgs#<attr>.version`, then `.meta.license.spdxId` and
  `.meta.unfree`, one attribute at a time with `XDG_CACHE_HOME` set (cheap, unlike `nix search`).
  Unfree is out where `allowUnfree` is off.
- **Comparing nixpkgs tools without `nix search`** (pin to the rev in nix-os `flake.lock`, `export XDG_CACHE_HOME`):
  `nix eval --raw github:NixOS/nixpkgs/<rev>#<pkg>.version`; `nix eval --json github:NixOS/nixpkgs/<rev>#<pkg>.meta`
  for licence and `unfree`; closure size from the binary cache with no build:
  `nix path-info --store https://cache.nixos.org -S -h $(nix eval --raw ...#<pkg>.outPath)`; ready-made NixOS
  modules: `nix flake metadata --json github:NixOS/nixpkgs/<rev>`, take `.path`, then `ls
  <path>/nixos/modules/services/monitoring` (or the right folder) and read the module's options. A
  package with a module and a small closure beats a better tool the owner would have to package.
- Measure the box with a tool already on it, not with vendor claims: a 10 s clip through `nice -n
  10 ffmpeg` at two presets under `/usr/bin/env time -f '%e s %M KB'`. Give the numbers as the best
  case for that clip shape, label every extrapolation, and mark speed figures from blogs as measured
  on another CPU.
- With no GPU on the box, split the design: CPU steps here (script, voice, captions, edit, render),
  GPU steps on the owner's PC (image and video generation). Add the new job's memory to the sum of
  the unit caps before you propose it, and run batch jobs one at a time.
- Apply the repo yardstick before ranking: no Node and no browser on the host (so a headless-browser
  renderer is out), Python plus ffmpeg from nixpkgs first.
- **A spec PR for a pipeline that Hermes runs later** (subagents plus omp) holds, in this order:
  the decisions the owner must make first (blocking each phase), the measured limits of the box,
  one table of stages with the files each reads and writes, a tool list with licences and install
  sizes (`nix build --dry-run`) and a do-not-use list, roles (Haiku subagents for read-only fan-out
  only, one omp at a time with a task-file template, the owner for review and merge), phases that
  each end with an artifact and a number, the install and smoke-check order, the platform risks,
  and a dummy pipeline built from tools already on the box that prints an `ARTIFACT OK` or
  `ARTIFACT FAILED` verdict line. No formal tests when the owner says so: the verdict line and a
  look at the output are the check. A spec that adds a row to `AGENTS.md` can push the file past
  30,000 characters: run `scripts/context-size.sh` and say so in the PR.
- For a platform product (YouTube), read the platform's own pages before the design: monetisation
  rules for mass-produced content, the synthetic-content label, API upload limits for unverified
  projects. Report them as risks with links, and build in disclosure and a human review; never
  design around detection.

## Costing a self-hosted service for the box (Paperclip-style requests)

- Put three things side by side: the vendor's stated minimum (official docs only), the box's
  measured headroom (`free -m` available, swap used, `/proc/pressure/memory`, `nproc`, `df -h /`),
  and the repo rules that the service would break (nix-os AGENTS.md resource budget and the
  AWESOME-HERMES yardstick: no Node/Go/Docker/browser on the host, no PostgreSQL server for an
  app, no resident daemon unless needed). Verdict first, then the three tables.
- Start with the repo: `ls docs/` of nix-os `main` (`gh api repos/piabrota/nix-os/git/trees/main?recursive=1`)
  for an existing research doc on the service, and read it with `gh api .../contents/docs/<X>.md
  -H 'Accept: application/vnd.github.raw'`. Such a doc is dated and written for one host: re-check
  every number on the host the owner names now. Re-read the host's `hosts/<name>/default.nix` and the
  AGENTS.md resource budget, which says a tool that only one host needs goes in that host's
  directory. A verdict for the 1-vCPU host does not carry to the 4-vCPU one; the rules it
  breaks may still need the owner's explicit exception, so name them.
- **A sum of `MemoryMax` values is a sum of ceilings, not use.** Never say "only N GiB is left"
  from the caps. Print both per unit, side by side (`systemctl show <u> -p MemoryCurrent -p
  MemoryPeak -p MemoryMax`) with `free -m` (used and available), and call the cap sum the worst
  case. When the owner doubts a number you gave, re-measure and correct your own wording in the
  first lines; his decision to remove a service stands on its own and needs no false premise.
- Say which host you measured. `kvm4-health` and `free -m` on this box measure the host Hermes
  runs on (flake name `piabrota2`), not the web host `piabrota`.
- Do not install the service to measure it: the deny list blocks installs and it breaks the "no
  writes outside your own state" rule. Say its real use is unmeasured; never turn a vendor
  minimum into a measured figure.
- Do not run `nix search nixpkgs ...` on the box: it evaluates all of nixpkgs and spiked memory
  pressure. Check packaging with `gh` instead: `gh api 'search/code?q=<name>+repo:NixOS/nixpkgs+filename:package.nix'`
  (a 0 count is weak evidence, say so), `gh api 'search/repositories?q=<name>+nix+language:nix'`
  for community flakes and modules, and `gh api repos/numtide/llm-agents.nix/contents/packages`
  (a daily-updated set of agent tools; read its `package.nix` and `hashes.json` for the version).
  Compare each candidate's licence, last push, stars, packaged version against upstream's newest
  release, and the nixpkgs channel it tracks against ours; a one-person flake that lags upstream
  and tracks unstable is a copy-the-module option, not a flake input.
- For a Node/npm service also read: upstream `engines`, whether it bundles FHS-linked binaries
  (an embedded database) that NixOS cannot run unpatched, its database modes, and how it starts
  agent CLIs (the service `PATH`, which user, whose credentials). Hermes as a child agent means a
  second install under the service user; the deny-list plugin belongs to the gateway, so say
  whether a child loads it only if you checked.
- A command text that holds an installer word (`npx` inside a `grep -E` pattern) trips the
  install deny pattern and the call is blocked: search for the shape (`onboard|quickstart`).
- Offer the off-box option (second VPS or the owner's computer) and what Hermes already has
  (profiles, kanban, cron, subagents) before any install plan. When the host has room, end with one
  concrete next step: a PR on nix-os with the module in `hosts/<name>`, a `MemoryMax`, bound to
  `127.0.0.1` first, a deploy warning in the body, and the one choice the owner must make
  (exposure: nginx hostname or Tailscale).
