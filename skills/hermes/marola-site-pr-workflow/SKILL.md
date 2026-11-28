---
name: marola-site-pr-workflow
description: Use when you commit or push marola-site work. Hook pitfalls.
disable-model-invocation: true
---

# marola-site: commit and push pitfalls

Porting the page to F# with Fable: read `references/fsharp-fable-rewrite.md` (toolchain, test shape, how to feed omp, porting the other pages).
Checking the built page in a browser (the only proof that it runs): `references/browser-check.md`.
When the org has no token and the fork refuses your branch, the deliverable is a stack of patches and
PR bodies: `references/patch-delivery.md`.
The .NET server, its headers and its pitfalls (run C): `references/dotnet-server.md`.

Work lives in the fork `piabrota/marola-site` (remote `fork`). Name Hermes's own branches `hermes/*`;
pushes to any branch are allowed now (the deny list still blocks force-push, branch delete, mirror
and `--tags` pushes and every `gh` write, and a ruleset guards the default branch). The owner pushes
to `marola-dev` himself. Keep ONE PR open (the owner finds two confusing). A branch cannot be renamed:
add commits to the existing PR branch.

## Rules learned

- Commit trailers: the repo asks for `Tested:` and `Co-Authored-By: Claude`; Hermes's own rule
  forbids the agent trailer, so write `Tested:` (and `MIP: none — <reason>` when `site/static/**`
  changes) and nothing else. The MIP trailer needs an EM DASH or the pre-push hook fails. Write the
  message to a file, `git commit -F`. The hook's trailer check reads `origin/main..HEAD` when the
  devkit hook does not hand it the pushed refs: in the fork clone that range is the fork's whole
  history, so upstream's own `site/static` commits fail YOUR push. Point the tracking ref at
  upstream for the check (`git update-ref refs/remotes/origin/main origin2/main`), put
  `MIP: none — <reason>` on a merge commit that touches `site/static`, then push and set the ref back
  if you need the fork's own base again.
- The push hook runs `just prepush` (trailer check plus `just quality`), so push from inside a dev
  shell: `nix develop <path> -c git push origin <branch>`. If the branch's own flake lacks what the
  gate needs — an Elm version `elm.json` pins while nixpkgs ships another, a system library a
  Haskell package links through pkg-config — borrow the shell of the branch that carries the fixes:
  `git worktree add ../shell <that-branch>`, then `nix develop ../shell -c git push …` from the
  target checkout. Fix the dev shell in the same PR when it makes the gate runnable again. A fresh
  dev shell may also need `cabal update` once before `just back-test` solves; without it the gate
  stops with "Could not resolve dependencies", which reads like the brotli failure but is the
  missing Hackage index.
- The pre-push hook runs `just quality`. Git sets `GIT_DIR` inside a hook. A self-test that runs
  `git init`/`commit` in a scratch repo then hits the REAL repo, and the push carries the fixture commits
  (author `t <t@t>`). Fixed on the PR branch in `scripts/mip-trailer-check.sh` (isolate_git_env and
  isolation_test). Any new git-based test script must unset `git rev-parse --local-env-vars`.
- After EVERY push, check the fork: `gh api repos/piabrota/marola-site/compare/main...<branch>`.
  Authors must be only `piabrota-hermes[bot]`. When the owner asks whether someone impersonated the bot,
  prove it from GitHub, not from the commit text: `gh api repos/piabrota/marola-site/activity` lists the actor,
  branch and sha range of each push, and `gh api repos/.../commits/<sha>` shows author login, email and
  signature. Check the local reflog for the same commits too, then say what you cannot rule out (a leaked
  token) and offer key rotation. Never push a polluted branch again; Hermes cannot
  force-push or close PRs, so the owner must close the PR and delete the branch.
- Run `git push` alone: a pipe (even `2>&1 | tail`), `;`, `&&` or a redirect (`> file`) on the same command line
  is blocked by the deny list. The hook prints a very long log: read the last lines of the plain output, then
  check the fork in a second call. The same goes for `git commit` followed by `git push` in one line.
- `nix develop` writes an untracked `flake.lock` and can leave an intent-to-add index entry:
  `rm -f flake.lock; git rm -q --cached --ignore-unmatch flake.lock` before every commit. The hook's own
  `nix develop` can re-add it after the commit: check `git ls-tree HEAD --name-only | grep -c '^flake.lock$'`
  is 0 before the push.
- A background job's completion notice shows only the last ~2000 characters, so test counts scroll away. Run
  the proof chain with output to a file inside the job and `grep` the summary lines (`Passed!`, `ℹ pass`, exit
  codes of build, smoke, quality) in the same command. Never rerun a ten-minute proof to recover numbers.
- Verify each omp run in this order: forbidden-path check on `git status`, the full proof chain to a file, a probe
  of the real running server (statuses, headers, hostile inputs), a read of the security-critical code itself,
  then the commit message file, `git add -A <dirs>`, `git commit -F`, and a bare `git push`. One omp run is one
  commit; do the next run only after the push.
- Reproduce hook bugs only in scratch repos with `GIT_DIR` set; never point `GIT_DIR` at the real repo.
- A doc that states numbers or tokens (DESIGN.md contrast ratios, token values) is checked in two ways before
  you accept it: recompute the numbers yourself from the CSS with a short script (WCAG luminance), and require
  a repo check that fails when the doc and the CSS disagree (every `:root` token documented, same values, no
  stray hex), proved on the OLD doc first. Keep failing ratios in the doc, labelled as failures, rather than
  dropping them.
- The omp wrapper stops every run at 35 minutes: use `--max-time 34m`, work in steps, and write a
  progress line after each step.
- When the owner asks that the site end up "top" in a field (FP, security, agent harness), promise only what a
  command can show. Turn each wish into a check that fails on drift (design check, a ratchet over counts of
  `mutable`/`null`/`raise`/blocking calls with a committed baseline, a route-versus-OpenAPI parity test) and a
  scorecard doc where "pass" appears only next to the command that proves it and "unknown" names the check that
  would settle it. Do not refactor in the same run to improve a baseline; commit the numbers as measured.
- What this branch cannot change (`.github/`, repo settings, CODEOWNERS names) goes into ready-to-copy drafts
  under `docs/owner-steps/`, never a vague "please fix". Pin every action in a draft by commit SHA resolved with
  `gh api repos/<o>/<r>/git/ref/tags/<tag> --jq '.object.type+" "+.object.sha'`; when the type is `tag`, follow
  with `gh api repos/<o>/<r>/git/tags/<sha> --jq .object.sha`. Resolve the SHAs yourself and put them in a file
  the omp task names, because omp has no `gh`.
- omp may touch a forbidden-looking file when a repo generator rewrites it (`site/static/i18n.js`, `golden.json`,
  `nix/deps.json`). Read that diff: accept it only when it holds exactly the new generated keys or entries, and
  name the generator exception in the next task's rules so the run does not hide it.
- The token pushed only `hermes/*` before the any-branch push rule; other branches push now, but a
  commit that changes `.github/workflows/**` never does (the App token has no `workflows` scope).
  A branch built on upstream `main` cannot enter a stale fork at all, even when its own commit
  touches no workflow file: its ancestry carries upstream's workflow commits, which the fork does
  not have, so GitHub refuses the push with the same `workflows` error. That case ends in patches
  to the owner, not in a fork PR.
- After a stack change the PR description is stale, and the deny list blocks both `gh pr edit` and
  `gh api -X PATCH` on a PR body. Do not look for another route: post the new description as a
  signed `gh pr comment --body-file` that starts with "the description above is out of date", and
  tell the owner to paste it into the body.
- Asked "good to merge?" on a draft that holds half a rewrite, answer no in the first word and list
  the gating items (unbuilt parts, open decisions, unverified checks). The push into `marola-dev`
  is the owner's, and a merge needs his order for that exact PR.
- The owner often answers a design question in one word. State the reading you build on in your next reply
  ("I read 'anyone' as open submission"), build it with the safeguard the risk needs (a takedown path for a
  claim that can hurt people), and ask again only if the reading changes the cost. Do not re-ask.
- When the owner asks to be told that the PR is ready, count the numbers from GitHub first (`gh api
  repos/<o>/<r>/compare/<base>...<head>`: commits, authors, files, additions, deletions) and post ONE signed
  `gh pr comment --body-file` in this order: the move from the old hosting to the new one, step by step (build, run,
  proxy, login, host, data, switch), with the unbuilt steps named as unbuilt; what the site does; how it was
  checked (every number from your own run, and each claim that is only the coding tool's report labelled as such);
  a "Not proven" list (never run on the real host, real third-party login, load, limits of a scanner, versions that
  differ from the host's); then the owner-only steps as a numbered list. Recommend a squash merge when early
  commits hold an abandoned stack. Do not write "top", "best" or "secure".
- `omp-run` that exits after 1 turn at `$0.0000` is not the task failing: omp's model call died. Read the
  newest `/var/lib/hermes/.omp/logs/omp.<date>.*.log` (`grep cowork transport rejected` / `provider error`)
  for the cause. A refused model call (for example a 403 from the API edge) kills EVERY turn until it clears:
  retrying the same run twice is enough, then fall back to a hand edit of the smallest lines plus a repo lint
  you run yourself, and say in the PR body that omp could not run.
- When the owner reports the live site or a board as not updated, fetch the artifact's own timestamp
  (`curl .../data/<area>/latest.json`, read `generated_at`) and compare it with the wall clock BEFORE
  assuming the build failed. A healthy build can still carry yesterday's date: the boards timer fired
  in UTC the previous local evening (`01:00 UTC` = `22:00 -03`), so `today` was wrong while everything
  else was fresh. The fix is the `calendar` option in nix-os (`*-*-* 04,10,16,22:01:00 UTC` for 01:01,
  07:01, 13:01, 19:01 America/Sao_Paulo; Brazil has no DST, so UTC offsets hold all year). Its merge is
  the deploy; meanwhile the site self-corrects at the next local run.
- The site's content comes from the nix-os pin (`marola-site/default.nix`), so a merge into
  `marola-dev` reaches nothing until a nix-os merge deploys it. Diagnose in this order: the newest
  `/nix/var/nix/profiles/system-*` mtime on the box (when it last switched), the service's
  `ExecStart` store path and `ActiveEnterTimestamp` (a new path plus a fresh timestamp mean the
  new build is live), then the live artifact itself. GitHub's `prod` environment runs ONE
  deployment at a time: pushes a few minutes apart cancel the earlier deploy runs and only the
  last one lands, and a full build takes 15–20 minutes — so "it did not refresh" right after fast
  merges means the run is still in flight. Report the timestamps instead of guessing.
- The area picker reads `/data/areas.json`, and the server prefers the board folder over the
  package. That file must come from the package (the pin's `site/areas.json`) and every other
  `/data/<x>` from `MAROLA_DATA`; when a new area is missing from the picker, read which copy is
  served before blaming the build. The board build rebuilds every area, so each new area raises
  its wall time: a run killed at the unit's `TimeoutStartSec` says so in the journal (`Consumed …
  CPU time over … wall` at exactly the limit), and raising the limit in the nix-os module is the
  fix — the timer will kill it again until that merges.
- The contact form writes to the site's SQLite database; nothing is emailed. Read a submission as
  root: the server path from `systemctl cat marola-site`, then
  `MAROLA_DB=/var/lib/marola/marola.db <that path> inbox`, with `--delete <id>` to remove one. The
  data directory is closed to `hermes`, so the answer to "where do I read the message" is that
  command, never a read of the file.
- A client-rendered page cannot be verified from the served HTML: the nav is drawn by the Elm
  bundle after load. Check the deployed bundle in its store path for the nav keys, the `i18n/*.json`
  catalogs for their labels (fetch one live), and that the HTML's asset hash names that same bundle
  file. Then say plainly that a browser is the last proof and that a page fetched before the switch
  needs a hard reload.
- When a CI job is called slow, find the expensive step before proposing anything: a report job
  that builds the whole system closure pays minutes for a build it does not need. Tools that parse
  `.drv` files (vulnix does) work on the derivation closure — `nix eval --raw
  .#nixosConfigurations.<host>.config.system.build.toplevel.drvPath` then `nix-store -qR` — which
  skips the build and the multi-GB cache restore; note that the `.drv` closure is wider (build
  inputs included), which is acceptable for a report and must be said out loud. A commit that
  changes `.github/workflows/**` cannot be pushed (no `workflows` scope), so deliver the exact
  replacement YAML to the owner instead.
- Run each lint as its own command and trust its own exit code. After a pipe (`nixpkgs-fmt ... | tail -3`),
  `$?` is the pipe's status, and a green `fmt=0` is tail's, not the linter's. And when every
  `nix run nixpkgs#<tool>` fails with `cannot create symlink .../nix/flake-registry.json; already exists`,
  move that 0-byte cache file aside (`mv` it, then rerun): nix wants to replace it with a symlink.
- Name the real stack in the first reply when the owner's word differs from the code (a request for
  one language, a branch named for another): the PR looks empty or wrong until the net diff shows
  only the final stack.
- Resolving a cross-repo PR's conflicts (the owner opened it with this fork's `main` as head into
  `marola-dev`): clone the fork, add upstream as a second remote, branch off, and merge upstream
  `main`. Resolve every conflict on the UPSTREAM side — upstream carried the same work and moved
  past it — then audit what the fork loses BY READING, not by a grep count (the owner distrusts
  grep-only claims): `git diff origin2/main HEAD --name-only` over the resolved tree lists the
  fork content that auto-merge kept; decide each against upstream's deliberate deletions.
- A merge commit cannot carry `.github/workflows` changes: GitHub refuses the push. Resolve the
  workflow files back to the branch's own state inside the merge commit — GitHub's own merge of
  the PR then takes upstream's untouched workflows, so the final state is still correct. Verify
  `git diff HEAD^1 HEAD --name-only | grep workflows` is empty before pushing.
- Deliver the resolution as a PR on the fork whose base is the fork's `main`; merging it moves the
  cross-repo PR's head and clears its conflicts. Recommend a squash of the cross-repo PR when its
  history holds polluted commits.
- When the cross-repo PR reads as an enormous diff, the fork's `main` is simply behind upstream:
  merge upstream `main` into the branch (a clean `git merge` is normal once the fork already carries
  an earlier resolution — check for `CONFLICT` lines, not for a clean result), reset `.github/workflows`
  to `HEAD^1`, and verify `git diff origin2/main HEAD --name-only` lists only those files. Open a PR
  on the fork whose merge makes the fork equal to upstream; the cross-repo PR then has nothing to
  bring and the owner closes or merges it as a no-op. Say that in the body, with the one file that
  still differs.
- Before you promise a push or a `gh pr create` on `marola-dev`, check the credential path: the
  helper's `HERMES_GIT_MAROLA_REPOS` allowlist covers only the OpenRig marola repositories, and
  `/run/hermes-github/` holds one token file per installed owner (`ls`, no content). A missing
  token for that org means reads work (public) and writes fail with "could not read Username": the
  route is the fork plus the owner's push, or the App installed on the org — say which, do not retry.
