# README, wiki and Archify figures in a docs PR (piabrota/nix-os)

Load this for "update the docs / README / wiki / archify images", an address index, or a new
figure. The repo's own rules are in its `figure` skill (`.claude/skills/figure/SKILL.md`) and
AGENTS.md; this file is the order of work on this box and the traps.

## Split the work: omp writes, Hermes draws

omp edits text and the figure sources (`docs/archify/<slug>.json` and its `pt/` mirror). It has no
Chrome on its PATH; give it the path of the Chromium wrapper (a file in the workspace) as
`ARCHIFY_CHROME`, and it runs Archify's `finalize` with the real browser check. Its `read` tool
opens a PNG, so it can look at a preview, but Hermes draws the final PNGs, looks at them and runs
the check. Say so in the task file: validate with `finalize` only, no `just figure`, no PNG, no
`figures.lock`, no edit of `vendor/archify`.

## Working tree for a second branch

With an omp run active in one clone, make the next branch a worktree of the same clone, and give
`git worktree add` an absolute path. A relative path after `git -C <clone>` resolves inside that
clone and nests the worktree there (`git worktree move` fixes it). Run later commands with
`git -C <worktree>` from a neutral directory, so the repo's AGENTS.md is not loaded into the output.
Commit one omp run before you start the next on the same tree: each run then has its own diff. In
the next task file name that commit (`git show HEAD`) and say that local `main` is stale, or omp
diffs against it and reports the first run's work as its own. A figure with new nodes can fail
Archify's `composition/ambiguous-corridor` check: let omp try column variants until all four gates pass,
then look at the PNG yourself, because a passing layout can still be crowded. A hit for `/nix/store` in
a built figure page can be a node label, not a store reference: read the match before you call it a leak.

## A figure must be readable, not only valid

Archify's four gates test the schema and the layout, not whether a person can follow the arrows. A
figure extended with new boxes tends to grow long arrows that wrap around the picture, arrows
that cross lanes, and labels such as `merge` or `KVM 4` that name no action. Write these criteria
in the task file and check them on the PNG before the PR: one reading path; no arrow longer than
two lanes and none that wraps the picture; at most about ten boxes; each arrow label a plain verb
or noun. When a figure needs more than that, move a flow to a figure that already shows it (the
deploy and pull-request flow have their own) and say so in the card's "Not shown". Change the
README alt text, card and both wiki pages with the figure. When the owner calls a figure messy,
the fix is a redraw by omp that looks at its own render, then your look at the PNG; do not
re-argue the gates.

## Shortening a README ("make it short, link the docs")

A focused README keeps: the header block (drawing, one-line nav, badges), a one-sentence quote, a contents list,
the address table, one configuration section per named service, 5 to 6 reproduce steps, a docs table, a related
repositories table, credits and license. Everything else moves, word for word, into `docs/<TOPIC>.md`; nothing
is deleted.
- Take the layout of the owner's reference list (header, `<sub>` nav, badges, quote, `## Contents`, tables with
  Project, Description, Stars, Last commit, Commits in 2026). Fill the related-repo numbers from the API on the day:
  `gh api repos/<o>/<r> --jq .stargazers_count`, the last commit from `commits?per_page=1`, and the count of 2026
  commits from the `rel="last"` page in the `Link` header of `commits?since=<Jan 1>&per_page=1`. Write the date of the numbers above the table. Match repo names to what exists (`gh api`): the owner may misspell one; say which you chose.
- Config tables come from the module files (`mkOption` names, defaults) and from `hosts/<name>/default.nix` (values set
  here), never from memory.
- Before you cut a section, grep the repo for links to its anchor (`git grep -n '#every-'`, the dashboard docs page,
  the wiki Home pages) and keep the heading text so the anchor still resolves.
- The justfile's `figure-check` greps the README for `](docs/img/<slug>.png)` of every figure. Keep every figure as
  at least a linked thumbnail (a `<details>` table is fine), and move only the long "how to read" cards.
- Moved text changes its relative links: `](docs/X.md)` becomes `](X.md)`, `docs/img/` becomes `img/`,
  `docs/archify/` becomes `archify/`. A `sed` over the moved block does it; grep the result for `](docs/`.
- A README line that says "edit the badge by hand when the pin moves" travels with the pin table: update both
  places, and the docs that point at the README's pin table.
- A new doc needs a row in the repo's file table (AGENTS.md), which is near its size cap: shorten another row or
  say in the PR body that the row was left out for size.

## Facts first, by command

- Hosts: `grep -rhoE '\b[a-z0-9-]+\.piabrota\.art\b' --include=*.nix . | sort -u` in the repo; paths
  from `site.nix` and the docs. Placeholders (`example.`, `app.`) are not addresses: say so in the doc.
- Status of each address: `curl -s -o /dev/null -m 15 -w '%{http_code} %{redirect_url}'`. 401 means
  the basic-auth gate is up; 301 or 303 names the target; 000 means the module is off (no DNS or
  certificate). Write the check date next to the table, put the commands in the PR body.
- Give omp the table of facts in the task file and tell it to correct a row only from the repo.
- A row you could not check (for example three locale paths) stays marked unchecked in omp's text.
  Run the `curl` yourself before the commit and correct the row, so no ⚠ is left that one command
  would clear.
- Size budget: `wc -c AGENTS.md` before the task. When room is small, give omp a character budget
  for the AGENTS.md row and have it run `sh scripts/context-size.sh`.

## Honest status in the docs

When the owner states a direction ("X will be the engine of ..."), write the docs in two layers:
what runs today (from commands: `rig status`, `rig ps --nodes`) and what will. Use "will" for any
step that has not run once end to end; name the guardrails that stay (humans merge, deny list,
basic auth). A figure that shows the target says so in its reading card (`Takeaway`, `Not shown`).

## Render on this box

1. Chromium comes from Nix, not PATH: `export XDG_CACHE_HOME=<scratch>/nixcache`, then
   `nix build --no-link --print-out-paths nixpkgs#chromium` (a few minutes, fetched from the cache).
2. Write a two-line shell wrapper in the workspace (not the repo) that runs that `bin/chromium` with
   `--no-sandbox "$@"`; `chmod +x`. The unit has no user namespaces for the sandbox.
3. Check out the pinned Archify: `git submodule update --init --depth 1 vendor/archify`, then
   `git -C vendor/archify sparse-checkout set --no-cone /archify/` (the justfile's `figure-init`).
4. Validate a source: `ARCHIFY_UPDATE_CHECK_DISABLED=1 ARCHIFY_CHROME=<wrapper> node
   vendor/archify/archify/bin/archify.mjs finalize workflow <src>.json <out>.html --out-dir <dir>
   --quality showcase`. Expect `validate:pass deliver:pass check:pass browser-check:pass`. Without
   `ARCHIFY_CHROME`, `browser-check` is `skipped` and proves nothing.
5. Draw all figures with `just` on PATH, not through `nix run`: `CHROME=<wrapper>
   ARCHIFY_CHROME=<wrapper> nix shell nixpkgs#just -c just figure`. The recipe calls `just
   _figure-lock` at its end, and under `nix run ... -- figure` that inner call fails with "just: command
   not found" after the PNGs are drawn. It writes `docs/img`, `wiki/img` and
   `docs/archify/figures.lock`; it fetches Google Fonts, so the network must be up. It redraws every
   figure, and a redraw is never byte-equal: `git checkout --` the PNGs (docs and wiki, both
   languages) of figures whose source did not change, so the PR diff holds only real changes. Then
   rebuild the lock with `nix shell nixpkgs#just -c just _figure-lock > docs/archify/figures.lock`
   and run `just figure-check` the same way (it hashes sources, not PNG bytes, so it passes).
6. Look at each PNG with `vision_analyze` at full size: headings in Fjalla One, text in Inter, dark
   theme, every label readable, nothing cut at the bottom (`docs/archify/crop.tsv` trims height).
   System fonts instead mean the font fetch failed: render again. A rendered PNG is never
   byte-equal to an older one, so do not use `cmp` against the old file as a test.
7. `git add` the PNGs and the lock by name; they are part of the PR (the wiki cannot load files from
   the repo, so `wiki/img` holds copies).

## Ship the archify HTML pages on the site

When the owner wants the HTML that archify makes on the public site, build it in Nix; commit no HTML
(the repo's `figure` skill says so). Pattern (a sibling of the skills site):

- A derivation that pins archify with `fetchFromGitHub` at the commit of the `vendor/archify`
  submodule (`git ls-files -s vendor/archify`). Move the pin and the submodule together. Archify has
  only dev dependencies, so node alone runs it.
- Loop over `docs/archify/*.json` and `pt/*.json`, never a hard-coded list. Run `archify finalize` as the
  justfile does. With no Chrome in the sandbox it exits 2 with `browser-check:skipped`: accept exit 2
  only when the log still says `validate:pass deliver:pass check:pass`. The owner's `just figure` ran
  the real browser check.
- A shell function in the build phase that is called inside a `{ ...; } > dist/index.html` block
  writes its stdout into the page: the archify log showed up as text on the live index. Send logs to
  stderr (`echo "$log" >&2`), and add a `grep -qE` guard after the block that fails the build when
  the output holds log words.
- Add the repo's CSS as a `<style>` before `</head>`, and do not add the Google Fonts link: a visitor
  must not call a third party. Check with `grep -rl googleapis <out>` (empty) and `allowedReferences
  = [ ]`.
- Serve it like the other sub-sites: an option that defaults to the package, `= /figures` returning 301,
  and an alias for `/figures/`. Credit archify (MIT) and the font it embeds (OFL) in the index page and in
  the site doc. Build the derivation alone with `nix build --impure --expr` and `callPackage` to get its
  size and listing before the full-system evals. Count the pages: two per figure plus the index.
- The new address is not live before the deploy: mark its row in the README "not checked yet" and
  fix it after the merge with a `curl`.

## Wiki rules

- Every page is pt-BR first with an English mirror, changed together. A new page gets a row in
  `_Sidebar.md` in both lists. Wiki links use page names, not file paths: check them against
  `wiki/*.md`.
- pt-BR pages embed `img/pt/<slug>.png`, English pages `img/<slug>.png`, the README
  `docs/img/<slug>.png`; `figure-check` fails when a figure is shown nowhere.
- The wiki repository is filled by `wiki.yml` after the merge: the wiki shows the change only then.
