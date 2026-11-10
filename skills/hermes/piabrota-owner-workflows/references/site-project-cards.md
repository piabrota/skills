# Adding or changing a project card on piabrota.art (nix-os)

Use for "add repo X to the website", "make it a card like the other piabrota repos", or a change to a
card's facts. The site and the mockups draw the same data, so one change touches a few files.

## Read "card" and "listed on the website" as the home site

"The website", "the home site", "every card" and "not listed as public" mean the pages of
www.piabrota.art built from `mockups/data.nix`: the project cards (`projects`) and the services
list (`services`, each with an `access` of `public` or `login`). Do not open the service's own
vhost or code first. A service is "not listed as public" when its `access` value is stale: fix the
value and the text that says "login", and check the page really is public (its own PR merged)
before you write that in the PR.

## Where the facts come from

1. Start from the org profile, not from the site code: the Projects table of
   `piabrota/.github` `profile/README.md` (read it with `gh api repos/piabrota/.github/contents/profile/README.md --jq .content | base64 -d`).
   The row gives the name the site uses, the blurb (copy it unchanged), the website and the
   repository link. When the owner says a repository "is there, on README.md", that row is the
   source: do not rebuild the facts from the repository.
2. Language, licence, last push, archived and visibility come from `gh api repos/<owner>/<repo>`.
   When the profile row and GitHub disagree (a licence column that says "N/A", GitHub says a real
   licence), the card takes GitHub's value. Say the difference in the PR body and offer a fix of the
   profile row as a separate change in that repository, with the owner's yes.
3. Check the repository is public and has a Pages address (`gh api repos/<o>/<r>/pages --jq .html_url`)
   before you set `site`.

## Where it lives in piabrota/nix-os

- `mockups/data.nix`, the `projects` list: one attribute set per project (`name`, `lane`, `blurb`,
  `lang`, `licence`, `pushed`, `site`, `state`, and `logo` or `glyph`). Copy the neighbour's style.
  `site/data.nix` writes the Gleam data from this file on every build: never edit the generated file.
- A repository of a person, not of the org: add `owner = "<login>";` (and `repository = "<name>";`
  when the repository is not named like the project). The helpers then link to
  `github.com/<login>/<repository>` and print the origin as personal. The owner says "his private
  user" or "his own user" for such a personal account.
- `lane` is one of the lanes declared at the top of the list (company, think, host, play,
  incubating). A new project fits none by itself: pick the closest, mark it as an assumption in
  the PR, let the owner change it. "Listed as incubating" is a lane: add
  `{ id = "incubating"; label = ...; }` last in `lanes`, plus `lane.incubating` in the three locale
  files (a lane label is a key too). The lane loops are generic, so the mockups need no code change.
- A "big" or "as big as mu" card is CSS, by name, in `site/static/style.css`: mu is the one tile
  with `grid-column: 1 / -1` filled with `--accent` (the site's red). Extend those rules with a
  selector list for the new name, and update the line in `site/DESIGN.md` that says how many tiles
  are filled. Put a filled tile's lane last or first so the full-row tile does not split a row.
- **A transparent logo on the red fill.** Most repo logos are SVG with a clear background and dark
  ink (light ink under `prefers-color-scheme: dark`, which an `<img>` follows from the visitor's OS).
  Dark ink on `--accent` is unreadable, and the colour changes with the theme. Do not put a plate
  or a second image behind it. Set `filter: brightness(0) invert(1)` on `.project-logo` of that tile:
  every stroke turns white (`--on-accent`) in both themes and the background stays clear. Give the
  logo `width: min(100%, <px>)`, `height: auto` and its real aspect ratio, and stack `.tile-top` as a
  column so a wide logo sits above the tags. Read the SVG's `viewBox` first (`gh api
  repos/<o>/<r>/contents/<path>?ref=<sha> --jq .content | base64 -d | head -c 400`). A PNG logo
  with a solid background needs another route: tell the owner, do not filter it.
- `logo` is a raw.githubusercontent address at a pinned commit and is never stored in the repository.
  A project with no logo takes a `glyph` (a text mark), as the profile prints it.
- Blurbs in the other languages are keys `project.<name>` in `site/locale/pt-BR.json`, `zh-CN.json`
  and `ja-JP.json`. The build stops when one file lacks a key, so add all three. `en.json` carries the
  page words, not the blurbs. Write the pt-BR blurb in plain Brazilian Portuguese and say in the PR
  that the zh-CN and ja-JP texts were not checked by a native reader. The ja-JP file spaces its
  words (easy-Japanese style): copy the spacing of the neighbour keys, and fix an unspaced text
  that omp wrote from your plain draft.
- The mockup SVGs in `docs/mockups/` and `wiki/mockups/` are generated: run `just mockups` (as
  `nix run nixpkgs#just -- mockups` with a scratch `XDG_CACHE_HOME`) after the data change.
  `checks.mockups` fails when a committed SVG is not the output. Every mockup that lists the
  projects changes (all six in one run), so expect a wide diff: the new project must show in the
  index inventory, and any other moved element needs a reason. Say in the PR which pictures you
  did not compare by eye.
- Grep for places that state a count or list the projects (`grep -rniE "<a neighbour project>" .`):
  tests in `site/test/`, the mockup tests, `docs/MOCKUPS*.md`, the wiki pages, `.devin/wiki.json`.
  Change only what is now untrue; a pt-BR doc and its English mirror change together.

## A card that links nowhere, or gaps between cards

- **A tile with no `<a>` is data, not a typo.** Read the built page first (`curl` the live HTML and grep
  `data-name="<name>"`). In `mockups/data.nix` a project in `closed` is drawn by `closed_tile`, which links
  nowhere by design ("the repositories are private"). Before you add a link, ask GitHub
  (`gh api repos/<o>/<r> --jq '.private, .license.spdx_id'` and an anonymous `curl -s -o /dev/null -w %{http_code}`):
  when the repository is public, the entry is stale. Move it to `projects` (personal: `owner`, `lane`, `glyph`
  when no logo, `state = "none"` when no site, no `commits`), keep the blurb and its three locale keys, and
  make the closed lane draw nothing when the list is empty (return `[]`, no heading, no "0"); keep the type
  and strings for a future closed project. Fix every doc that calls the project private or closed
  (`git grep -n -i <name>`), regenerate the mockups, and say in the PR that the card moved to the open
  projects and that keeping it closed means making the repository private. Pick this reading and proceed; the owner overrules in one line.
- **Gaps come from the grid, not the cards.** `repeat(auto-fill, minmax(300px, 1fr))` leaves empty cells
  whenever a lane's last row is short. Use fixed column steps (1 below 600 px, 2 from 600, 3 from 960) on a
  4-track and a 6-track grid, every tile `span 2`, and stretch the last row: remainder 1 spans the whole
  row, remainder 2 at 3-up shares it in halves. Count the full-row filled tiles out of the sequence with
  `:nth-child(3n+1 of :not([data-name="mu"], ...))` so the lane after them still splits in halves. A plain
  tile that spans more than 2 tracks reads as a row (logo and tags left, name, text and footer right), by
  one rule, so it does not look stretched. Pin the footer (`margin-top: auto` on the first footer element),
  drop a fixed `min-height`, keep one 14 px gap both ways. Check every grid class of the page that shares the
  rule (`.services`, `.people`, `.partners`) at 3-up, 2-up and 1-up, and update `site/DESIGN.md` with the rule.
  Count cells in a screenshot per width before and after; a service list that is one card short of a multiple
  of the column count is a gap too.

## A stat on every card (commit counts, human and agent)

For "every card of an owned repository must show a small count". The Nix build has no network,
so the numbers are static data in `mockups/data.nix` (a `commits = { human; agent; }` set on each
qualifying project and one `commitsAsOf` date), refreshed by a read-only script, never fetched by
the page.

- **Which cards:** `origin == "own"` and no `repository` override. A card that points at another
  repository (`hermes` points at nix-os) and every personal card are left out unless the owner
  asks; say the cut in the reply.
- **Classify authors by the GitHub login**, read with
  `gh api --paginate 'repos/<o>/<r>/commits?per_page=100' -q '.[]|(.author.login // ("~"+.commit.author.name))'`:
  agent = login ends with `[bot]` (piabrota-hermes, piabrota-ops, dependabot and other Apps) or is
  exactly `claude` (the account GitHub maps Claude Code's author to; it shows in many repos and a
  `[bot]`-only rule misses it). Everything else is human. Probe the real author mix before you fix
  the rule.
- **State the floor.** A commit a person made with an agent's help under their own name counts as
  human (the repo bans agent trails), so the agent number is a lower bound. Put that in the docs
  and in the card's tooltip, in all four locales.
- Put the first numbers in the task file from your own API read, and have the refresh script
  (`scripts/commit-counts.sh`, a `just` recipe, a stub-`gh` test) reproduce them. A project with no
  data shows nothing, never a zero. A scheduled refresh needs a workflow, which Hermes cannot
  write: say so and offer the paste-and-PR route.
- `AGENTS.md` sits close to its cap: one mention of the script costs characters; tell omp to
  shorten other words in the same rows, never to drop a rule.

## A fact about a pinned input on the /hermes page (version, commit)

For "the page must show / pin the version we run". The /hermes page is built from the evaluated
system: `site.nix` hands `site/hermes.nix` the Hermes settings and the `flake.lock` node, and
`site/data.nix` writes them into the Gleam data. Do not hardcode a version anywhere in the page
code or tests.

- Read the release tag from `flake.lock` (`nodes.<input>.original.ref`), the commit from
  `.locked.rev`; pass `original` to the helper beside `lock`. Show it as a hero fact, a key in the
  YAML and a link to the release (`releases/tag/<tag>`); the generic fact list needs no Gleam change,
  a new link line does (`data.nix` constant plus the page).
- A version held by hand elsewhere (`hermesVersion` in `hermes.nix`) can drift from the lock: add an
  `assert` in the helper that stops the build with both values in the message, and say in the docs
  that a bump changes both in one PR. Prove it as in `nix-eval-checks.md` ("Prove a build-time
  guard").
- The page test checks the shape (a `version` fact that starts with `v`, the YAML key, the link
  equals base URL plus the tag), not the literal tag, so a bump does not break it.
- The site derivation reaches `piabrota` (KVM 1) only; no unit restarts.

## Order of work

1. Read the profile row and the GitHub facts (above). Write them into the task file.
2. omp edits `mockups/data.nix`, the three locale files and runs `just mockups` (Nix, JSON and SVG
   regeneration are code and config); name the files it may edit and forbid `.github/`.
3. You read the diff, run `nix-instantiate --parse` on the Nix files, `jq empty site/locale/*.json`,
   and the mockups check. `just site-test` is not needed: `nix build -L "path:$PWD#site"` runs the
   Gleam tests (read the `N passed, no failures` line) and builds the page data from the new entry.
   Re-run it after any hand fix, such as a locale edit. A build that omp already made is cached
   and prints no test line: relay the count as omp's, and say you did not see the tests run.
   Read the page data for the new entry with `nix build "path:$PWD#site-data" --print-out-paths`
   and grep the `Project(name: "<name>"` line (`origin`, `repo`, `href`). Then look at the real page, not only the SVG
   mockup (steps below). The box has no fonts, so any render uses a fallback font: say so in the PR.
3b. **Screenshot the built site.** Build Chromium from Nix (`references/docs-figures-and-wiki.md`,
   "Render on this box"). Open the page over HTTP, never `file://`: the built HTML links `/style.css`
   with an absolute path, so a `file://` shot is unstyled and proves nothing. Serve the store path
   with `execute_code` (`subprocess.Popen([sys.executable, "-m", "http.server", "8765", "--bind",
   "127.0.0.1", "--directory", <site path>], start_new_session=True)`; the terminal has no
   python3) and stop it afterwards. Then `chromium --headless=new --no-sandbox --disable-gpu
   --hide-scrollbars --window-size=1280,4000 --virtual-time-budget=10000 --screenshot=<png>
   http://127.0.0.1:8765/index.html`, and again at `390,7000` for a phone. Make the window as tall
   as the page: the shot is one viewport, and a card in the last lane is cut off otherwise. Open the
   PNG with `vision_analyze` and a `region` crop of the card. Check the logo colour, size, clipping
   and the fit at 390 px. A dark-mode shot is optional when the logo uses the filter above.
   Without a server, a `file://` shot also works: copy `index.html` and `style.css` into one scratch
   folder, `sed` the stylesheet `href="/style.css"` to a relative path, and set `FONTCONFIG_FILE` to a
   `fonts.conf` that names store font folders (`nixpkgs#dejavu_fonts`, `nixpkgs#inter`). Emoji and CJK glyphs
   still draw as boxes: that is the render, not the site; say so in the PR. Looking at one width of four is
   not looking at four: report which widths you read.
4. A site-only merge deploys the static site, not the Hermes unit: classify it with the list in
   SKILL.md ("Classify the change") before you write the risk line.

## The matching profile row (piabrota/.github), same request

"Add repo X to the website and to .github" is two PRs, one per repository; open both and link them
in each body. The profile PR is Markdown with no code, so you edit it by hand:

- Append one row to the Projects table of `profile/README.md` and `profile/README.pt-BR.md`, same
  columns (`nenhum` is the pt-BR word for "none" in the website column). Take the logo from the
  repository at a pinned commit (`raw.githubusercontent.com/<o>/<r>/<sha>/<path>`), check the file
  exists at that sha with `gh api 'repos/<o>/<r>/contents/<path>?ref=<sha>' --jq .path`, and put the
  stage word first in the blurb in bold ("**Incubating.**", "**Em incubação.**").
- Other rows use `width="64"`. A wide logo (for example 4 to 1) is unreadable at 64: use 128.
- Run `bash scripts/reading-time.sh --write`, then `--check`, and commit the badge lines too.
- Work from a fresh branch off `origin/main`; an old clone can sit on another `hermes/*` branch.
  Leave the "How it fits" figure alone and say in the body that it does not show the project.
