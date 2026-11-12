---
name: marola-site-pr-workflow
description: Use when you commit or push marola-site work. Hook pitfalls.
disable-model-invocation: true
---

# marola-site: commit and push pitfalls

Porting the page to F# with Fable: read `references/fsharp-fable-rewrite.md` (toolchain, test shape, how to feed omp, porting the other pages).
Checking the built page in a browser (the only proof that it runs): `references/browser-check.md`.
The .NET server, its headers and its pitfalls (run C): `references/dotnet-server.md`.

Work lives in the fork `piabrota/marola-site` (remote `fork`), branch `hermes/*`. The owner pushes to
`marola-dev` himself. Keep ONE PR open (the owner finds two confusing). A branch cannot be renamed:
add commits to the existing PR branch.

## Rules learned

- Commit trailers: `Tested:`, `Co-Authored-By: Claude <noreply@anthropic.com>`, and `MIP: none — <reason>`.
  The MIP trailer needs an EM DASH or the pre-push hook fails. Write the message to a file, `git commit -F`.
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
- Screenshots cannot go to the `pr-screenshots` branch (token pushes only `hermes/*`).
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
- Name the real stack in the first reply when the owner's word differs from the code (a request for
  one language, a branch named for another): the PR looks empty or wrong until the net diff shows
  only the final stack.
