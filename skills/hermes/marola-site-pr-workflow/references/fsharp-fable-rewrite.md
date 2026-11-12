# F# with Fable port of the marola-site page

Depth for porting the page to F# compiled by Fable inside one PR. Read it before you write an omp task for
this work.

## Toolchain facts (check again after a nixpkgs bump)

- `fable`, the .NET SDK and `fantomas` come from the dev shell's pinned nixpkgs. Never `dotnet tool install`:
  tools come pinned from Nix. The pinned Fable can be newer than the version the owner names; say so in the ADR.
- NuGet packages restore from committed `packages.lock.json` files; the recipes set `RestoreLockedMode=true`.
  A new project needs its lock file committed, or the locked restore fails in CI.
- Fable emits plain ES modules and copies its own runtime to `out/fable_modules/`. No npm and no bundler are
  needed: a build script copies the `out/` tree and the `ffi/*.mjs` files into the dist folder. Browser paths
  in the output are relative, so serve the whole tree.
- Test the same sources twice: Expecto on .NET and Fable.Mocha on Node. Fable.Mocha calls the global
  `describe` and `it`; a 10-line `run.mjs` that takes them from `node:test` removes the need for mocha.
- A full `just app-test` or `just quality` run takes more than 10 minutes cold. Start it in the background with
  `notify`, not in the foreground.

## Shape that tests without a browser

- Split the client in two projects. `Core` is pure (model, msg, `update` that returns commands as DATA, view
  functions that return a small virtual DOM). It compiles with .NET and Fable and has no `Fable.Browser`, no
  `Import` and no `Emit`. `App` is Fable only (DOM patcher, fetch, history, audio, FFI bindings, `main`).
- Own a ~200-line virtual DOM with a `diff` that returns operations: the tests need no DOM, and no
  `innerHTML` is needed. Do not add React, Feliz or Sutil: React needs npm.
- After each omp run, grep `app/Client/Core` for `innerHTML|outerHTML|insertAdjacentHTML|document.write|eval(|new Function|Fable.Browser|Import|Emit`
  and expect no match. Check `git status app/Shared`: the core is changed only to add a helper with a test.

## Feeding omp a port

- Extract the old source as a read-only spec outside the repo: `git archive <commit> <paths> | tar -x -C
  omp-tasks/<ref>/`. omp then reads the old behaviour without touching git history.
- Ask for a table of old test to new test in the progress file. A port without it hides dropped cases.
- Name the progress file by ABSOLUTE path (`/var/lib/hermes/workspace/omp-tasks/<name>.progress`). A relative
  `omp-tasks/...` lands inside the repo, where `git add -A` would commit it. Check `git status` for a stray
  `omp-tasks/` directory and move the file out before each commit.
- Before `git add -A app`, confirm `.gitignore` covers `bin/`, `obj/`, `out/` and `dist/` of every project, or
  build output enters the commit.
- Parity with the old JavaScript comes from a golden file that `scripts/golden.js` writes from the OLD code.
  Keep it as the single oracle, and prove it with a mutation (change `band`, one test must fail on both
  targets, then revert).
- Split by step and stop each run before the next layer: pure core, then views, then the browser glue. Verify
  each run yourself (format, tests on both targets, quality, the grep above) before you commit.
- After each run, list `git status --short` against the forbidden paths of the task (`.github`, `wrangler`,
  `.claude/skills`, `app/Client/ffi/*.mjs`, `site/static`). A forbidden file that changed is either a generated
  file (`site/static/i18n.js` from the i18n bundler, `golden.json`) or a breach: read the diff, confirm it is
  only the generator's keys and that the generator's `--check` passes, and name it in the commit.
- Keep the old static site untouched until the new page runs in a real browser. The PR must say what a
  visitor sees today (no change) and which parts are not built.

## Porting the other pages (about, support, news, members, contact, 404)

- Render each page from F# to a static file per language (`/page.html` and `/en/page.html`): `<html lang>`,
  canonical, hreflang pt-BR, en and x-default, and the language switch as two plain links. No client JavaScript,
  no inline script or style, so the CSP stays as it is. Add `Vdom.toHtml` (escape text and attribute values; no
  raw-HTML node) to the pure core and test the escaping.
- Text comes from the existing catalogs through `I18n.t`; prose moves into `site/content/pages/<page>.<lang>.md`
  taken from the old HTML, never retyped from memory. Write the small Markdown subset renderer in F# with tests.
- Give a multi-page port a fallback in the task: a page that does not fit the run keeps serving its old static
  file from `site/static`, the progress file says `OPEN: <page>`, and the nav never links to a missing file. Split
  the pages across runs (shared layout plus the small pages first, the generated ones like news and members
  next) and finish a run with `just quality` green.
- Keep the Python builders (`news_build.py`, `members_build.py`, `site_meta.py`) until the cutover and port their
  self-test cases to F# one for one, named after the Python ones. Add equality tests that build the pages from
  the repo's real content and compare the key facts with the old pages (post titles and order, member names and
  order, counts). A test that rebuilds its expected data from the old HTML is weak: say so in the PR.
- A page build that fetches its source over the network (the members table is read from a pinned commit of
  another repository) breaks the offline Nix build and makes `just app-build` need network. Vendor a copy into
  the repo with the commit SHA recorded, and keep an environment variable for the offline source. Flag it in
  the packaging step.
- Do not edit the old `site/static/*` files while the port is open: they are the rollback until the cutover.
- Put the quick CSS and fixture fixes (phone nav, a fixture per area so each city centres on itself) in the
  first step of a run: they are small and Hermes needs them to check the pages in a browser.
