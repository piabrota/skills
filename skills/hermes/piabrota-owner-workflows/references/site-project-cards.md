# Adding or changing a project card on piabrota.art (nix-os)

Use for "add repo X to the website", "make it a card like the other piabrota repos", or a change to a
card's facts. The site and the mockups draw the same data, so one change touches a few files.

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
- `lane` is one of the lanes declared at the top of the list (company, think, host, play). A new
  project fits none by itself: pick the closest, mark it as an assumption in the PR, let the owner
  change it.
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

## Order of work

1. Read the profile row and the GitHub facts (above). Write them into the task file.
2. omp edits `mockups/data.nix`, the three locale files and runs `just mockups` (Nix, JSON and SVG
   regeneration are code and config); name the files it may edit and forbid `.github/`.
3. You read the diff, run `nix-instantiate --parse` on the Nix files, `jq empty site/locale/*.json`,
   and the mockups check. `just site-test` is not needed: `nix build -L "path:$PWD#site"` runs the
   Gleam tests (read the `N passed, no failures` line) and builds the page data from the new entry.
   Re-run it after any hand fix, such as a locale edit. Open the new card in the SVG before you call
   it right. The box has no fonts, so a PNG from `resvg` shows shapes with no text: read the row's
   text in the SVG source and say in the PR that the card was not seen in a browser.
4. A site-only merge deploys the static site, not the Hermes unit: classify it with the list in
   SKILL.md ("Classify the change") before you write the risk line.
