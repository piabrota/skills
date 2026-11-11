# Restyling pages: the public site, the figure pages, the Hermes dashboard

Load this when the owner calls a page ugly or off-brand ("horrible", "must match piabrota
identity"), or asks for a new page or a theme. Frontend work is a class with its own skills: load
them before you write the task file, not after the first bad result.

## Load first

1. Skill `web-ui` (the owner's recipe: look first, plan with tokens, build, pre-flight, verify).
2. In piabrota/nix-os, the vendored `.claude/skills/frontend-design/SKILL.md` and
   `.claude/skills/web-design-guidelines/SKILL.md` (with `references/command.md`), and the repo's
   `site/DESIGN.md`. Where `web-ui` and `DESIGN.md` differ, `DESIGN.md` wins: the site loads Google
   Fonts although the generic skill says "no CDN font"; the archify pages embed their own fonts and
   load none.
3. For copy: `ste100` (English) and `ptbr` (pt-BR). For the dashboard: `hermes-agent` (skins) and
   the Hermes source `web/AGENTS.md`.

Put the store paths of these files in the task file under "read first". omp reads `/nix/store`
and the workspace, never `~/.hermes`: copy a skill reference you need from `~/.hermes/skills`
into `omp-tasks/<topic>/` first.

## Look before you order

- Screenshot the live pages with the Chromium wrapper (`references/docs-figures-and-wiki.md`,
  "Render on this box"): `<wrapper> --headless --disable-gpu --hide-scrollbars
  --window-size=1280,900 --virtual-time-budget=5000 --screenshot=<png> <url>`. Look at each PNG
  with `vision_analyze`, and at one finished page of the site (`/hosts/`) as the reference frame.
- Write at most five concrete defects in the task file. Name the finished page as the model: a task
  that says only "an index of the figures" produced a bare list with no brand, hero or footer.
- Ask omp to render its result at 1280 and 390 px, dark and light, to open each PNG with its read
  tool, and to report what it fixed after looking. Then look at the final render yourself.

## Order and parallel runs

- A merged change that breaks a live page (a log in the output, a 500) is a hotfix: its own small PR
  from `main`, merged alone. The larger restyle branch takes the hotfix commit by `git cherry-pick`
  from `main`, so it holds the same commit; it is never based on the hotfix branch.
- Two omp runs at once are fine on two worktrees when the files do not overlap. Each task file
  names the other run's files as off limits, and a shared file (the AGENTS.md row budget, a docs
  page) gets a character budget for each run. Commit each run before you merge the branches, and
  resolve the small overlaps yourself.
- Do not call a restyle done from the task report. Open the renders (`vision_analyze`), at 1280
  and 390 px, dark and light, for each page type, then commit.

## "There is no identity" across several sites: one modular kit

When the owner says the sites do not look like one family, do not restyle page by page.

1. **Audit by rendering every site** (home, skills, metrics, each generated index, one page of each foreign
   repository, one archify diagram) and compare each with `site/DESIGN.md`. Name the identity once (tokens, three
   fonts, eye mark, hero with stats, `§` sections, pills, cards) and list per site what it lacks.
2. **Build a kit, not a theme:** one tokens file, one small CSS file per module with a prefix (`pb-`), so a page
   takes only the modules it uses; pure functions that return escaped HTML; ONE list of the sites (a check fails
   when a vhost is missing from it); and a build-time injector that puts an in-flow, always-dark brand bar into every
   HTML page that comes from another repository, idempotent, with all its CSS under its own class and no edit of
   the page's own CSS or scripts. A drift test compares the kit's token values with the home's `style.css`.
3. **Stage 1** puts the generated indexes and foreign pages on the kit; **stage 2** moves the home, skills and
   metrics onto it. Say the stage split in the first reply, and list the files that still hold a copy of the tokens.
4. **Run what omp wrote, as written.** `node --test <directory>` fails on Node 24 (it takes files, not
   folders): a `just` recipe must name the test files. Run each recipe a PR adds once yourself, and fix
   the recipe and every doc line that quotes it.
5. **Render pitfalls:** a page with root-absolute asset paths (`/style.css`) loses its CSS from `file://`: serve the
   folder or reuse an earlier render, or you will judge a broken screenshot. Take `*.html` from a folder listing,
   not `ls | head -1` (it returned a JSON receipt that Chromium printed as text). Look at every image before you
   quote it.

## Pages built inside a Nix derivation

A shell template that writes a page (an index, a bar injected into another page) must reuse the
site's own frame and `style.css` classes. Keep the package's `allowedReferences = [ ]`. A bare
`<ul>` page is a bug, not a minimal version.

## Hermes dashboard

- The Documentation tab frames one static file, `hermes-web/docs/index.html`, served by nginx at
  `/piabrota-docs/` (`hermes-web.nix`). Keep it one self-contained file (inline CSS, same
  origin, readable at 760 and 390 px, light and dark). Do not touch the nginx `sub_filter` or the
  docs URL the flake check guards.
- Two separate theme mechanisms exist. A dashboard theme (`dashboard-themes/<name>.yaml`, key
  `dashboard.theme`) repaints the React pages. A skin (`skins/<name>.yaml`, key `display.skin`)
  colours the CLI, the TUI and the desktop app. The Chat tab embeds the real `hermes --tui` in a
  PTY, so its colours come from the skin, not from the dashboard theme. Ship both for a branded
  dashboard.
- A dashboard theme's `palette` makes the primary colour white. To keep the one red accent, add a
  `colorOverrides` block (`primary`, `primaryForeground`, `ring`, `card`, `border`,
  `mutedForeground`) with the site's tokens, and say in a comment why.
- Nix owns the config: install both files through `hermesHomeFiles` in `hermes.nix` and set the
  keys under `settings`, never with `hermes config set` on the box. Check the key names in the
  pinned Hermes source (`hermes_cli/skin_engine.py`, `hermes_cli/web_routers/dashboard_ui.py`).
  Check the accent's contrast on the background (4.5:1) with a short `node` calculation.
- Neither file can be proven before the deploy and a dashboard reload: say so in the PR.
