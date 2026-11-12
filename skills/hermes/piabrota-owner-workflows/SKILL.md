---
name: piabrota-owner-workflows
description: "Use when working for the piabrota owner. Has his PR rules."
disable-model-invocation: true
---

# piabrota owner workflows

Standing rules and procedures for work done as piabrota-hermes[bot] on the owner's repositories
(piabrota, marola-dev, h0ffmann). Load it with the `github` skill for any PR, and with
`hermes-agent` for any change to Hermes's own settings.

## Always-on rules

- **PR language.** Write every PR 100% in English, in ASD-STE100 Simplified Technical English:
  title, body, commit messages, review replies. No pt-BR half and no `---` mirror, even when a
  repo's AGENTS.md asks for a bilingual "bipr": the owner's order wins; mention the conflict once.
  No ASD-STE100 skill or checker is installed unless `skills_list` shows one. Apply the rules by
  hand (one idea per sentence; at most 20 words in a step and 25 in a description; active voice;
  simple verbs; one word per thing; at most three nouns in a row) and never say a tool approved
  the text. File content keeps its own language rule: a doc kept as `X.md` + `X.ptBR.md` is
  changed in both files in the same PR.
- **Branches and pushes.** Branch `hermes/<goal-slug>` only; `git push origin hermes/<slug>` with
  the branch named. Never merge, approve or close. Comments and issues you open end with the
  signature line from SOUL.md; commits and PR bodies carry no agent trailer and no "Generated
  with" line. Issues follow the same English-only, ASD-STE100 rule as PRs.
- **No secrets in output.** `gh auth status` echoes a masked token: check the login with
  `gh auth status 2>&1 | grep -i 'logged in'`.
- **Good news opens with the owner's phrase** (see SOUL.md) and plain answers do not.
- **Run the build before you claim it works, and say what you could not run** in the PR body.
  Read the memory cap first (`cat /sys/fs/cgroup$(cut -d: -f3 /proc/self/cgroup)/memory.max`,
  `free -m`, `nproc`): the box's real cap can be far above the "1 GB" of the brief. With room,
  build the exact attributes the change touches, never the whole system or a nixpkgs search:
  `/run/current-system/sw/bin/nix --extra-experimental-features 'nix-command flakes' build
  .#packages.x86_64-linux.<pkg> --no-link --print-out-paths` (a site package also runs its
  compiler and tests) and `.#checks.x86_64-linux.<name>`; `git add -A` new files first. Run
  long builds as one call under 600 s or let them background. Always available: `nix-instantiate
  --parse <file>.nix` (syntax only), the repo's reading-time script with `--check`, `perl`, `jq`. Not
  available on PATH: `just` (run a recipe as `nix run nixpkgs#just -- <recipe>`) and Chrome
  (`references/docs-figures-and-wiki.md` builds one from Nix). **Run the repo's lint before every push, not after CI fails.** Read
  the `check` recipe of the justfile and run each line except `nix flake check` through
  `nix run nixpkgs#<tool>` (`nixpkgs-fmt --check <the file list>`, `statix check .`,
  `deadnix --fail .`, `shellcheck`, the `jq` wiki check), with `export XDG_CACHE_HOME=<scratch>/nixcache`
  first: the default cache holds a stuck `flake-registry.json` symlink and `nix run` stops with
  "cannot create symlink". Read each exit code (`echo $?`), not the look of the output. A
  formatter failure from a hand or omp edit is fixed by running the formatter, then a separate
  commit. Never claim a lint or build that you did not run.
- **Prove a fix on the real path, not on a model of it.** When a program starts the failing
  process (a daemon that opens a tmux pane, a unit that runs a script), read that program's launch
  code for what environment and arguments the process gets before you pick the fix. A test with
  the system shell shows only that a mechanism exists. It passed for a variable that never
  reached the process. Say in the PR what only the real start after the deploy can prove
  (`references/openrig-seat-environment.md`).
- **Numbers in a PR body come from a command run just before** (a count of log lines, a list of
  plugins), never from an estimate. After an omp run was cut by its limit, take a test count from
  the last complete summary line of the log, not from output you saw mid-run: a later run changes it.
  If one is wrong after the PR is open, fix it with
  `gh pr edit <n> --body-file`; when that fails, do not route around the deny list with `gh api`:
  post a signed correction comment that gives the right number and say so in chat. Name who did what: "omp made the edits, Hermes read the diff".
- **Evaluate when you cannot build.** For `.nix` and `flake.lock` changes, and when the owner waives
  verification, run the evaluation checks in `references/nix-eval-checks.md` (also the recipe for
  bumping a flake input and the proof for a Hermes release bump) and still list in the body what did not run.
- **Check the PR is still open before you push a follow-up to its branch.** The owner merges
  fast. A commit pushed after the merge lands on no base: `gh pr view <n> --json state` first, and
  if it says MERGED, open a new PR from the same branch (or a fresh `hermes/` branch off `main`).
- **Base your own PRs on `main`, never on another `hermes/*` branch.** A stacked PR merges into a
  dead branch when the owner merges its base first, and the change never reaches `main` while the
  PR shows MERGED. After the owner says "merged", prove the content is on `main`:
  `git fetch origin main` then `git cat-file -e origin/main:<a path the PR added or removed>`.
  When it is not, `git switch -c hermes/<slug>-main origin/main`, `git cherry-pick <sha>`, push, open
  a replacement PR with `--base main`, and name the replaced PR in the first lines of its body
  and in chat. When the owner asks to "stack" PRs so he merges once, put the later commit in the first PR's
  branch (`git cherry-pick origin/<other-branch>`, push, `gh pr edit` the title and body with a
  section for the added change), then comment on the other PR that it now lives in the first and
  the owner should close it (you cannot); never point a base at another `hermes/*` branch. Stack
  only on the owner's own PR branch (see `references/pr-review-suggestions.md`),
  and re-check that base's state before you report the stacked PR as delivered. Before the push,
  `git fetch origin main`: a shallow clone does not know the owner merged another PR meanwhile, and
  a PR from the old base then reverts that work. Move the branch with `git rebase --onto origin/main
  <last commit of the old base> <branch>` (a plain rebase replays merged commits and conflicts), then
  check `git diff --stat origin/main..HEAD` lists only your files and rerun the checks.
- **Resolve conflicts in your own PRs yourself, without asking.** When the owner posts the PR link
  with "solve conflicts", or `gh pr view <n> --json mergeable` says CONFLICTING, fetch `main` and
  merge it into your `hermes/*` branch (`git merge --no-edit origin/main`, no rebase, no force-push). If a rebase already ran (an omp run resolved the conflicts mid-rebase), do not push it: the remote branch would need a force-push. Make a merge commit that holds the rebased tree: `git commit-tree "$R^{tree}" -p <old remote head> -p origin/main` (message on stdin), push it by hash as a fast-forward (`git push origin <sha>:refs/heads/hermes/<slug>`), and move the local branch with `git switch -C hermes/<slug> <sha>`.
  The usual cause is a sibling PR that added a row to the same `AGENTS.md` table: keep both rows,
  and for a row both changed keep your shorter wording and re-apply the other side's new clause to it (do not drop
  main's change). A merge can push `AGENTS.md` over 32,000 characters even when each side fit: run
  `sh scripts/context-size.sh` after the merge and shorten your own new row first. Do not flip a PR's draft
  state when `gh pr view` shows it changed. A diff3 block has a `|||||||` base section:
  find the marker lines with `grep -n -E '^(<{7}|={7}|>{7}|\|{7})'`, delete the markers and the
  unwanted sections by line number in one `sed -i`, and grep again for zero markers. Then rerun the
  cheap checks (host eval, context size, the wiki check), commit, push in its own call, and confirm
  `gh pr view <n> --json mergeable` before you report. Before the merge, `git fetch` the PR branch and read its log: the owner may
  have pushed commits on top of yours, and the PR's real tip is the remote one. A shallow clone fails
  the merge with "refusing to merge unrelated histories": deepen both refs once
  (`git fetch --depth 300 origin main <branch>`; worktrees share the clone's history) and retry.
  When `AGENTS.md` conflicts in many hunks that are only rewording, take main's file
  (`git checkout --theirs -- AGENTS.md`), then re-apply only your own additions, found with
  `git diff <merge-base> HEAD -- AGENTS.md`. A conflict in the owner's PR is a different
  case (`references/omp-harness.md`).
- **Ship before you answer side questions.** When the owner interrupts a long task with another
  question, the owner assumes finished files are already a PR. Push and open the PR as soon as
  the files are done (or say plainly that it is staged and not pushed), and give the link in the
  next message. Never leave work only in a local branch across turns. When he says to open the PR "with what you
  have" and review later, commit the tree as it stands, open a DRAFT, list the failing checks, the
  unreviewed parts and the unmeasured numbers in the Tested section, and offer the review as the next
  run. Do not hold the PR for the review. When he asks "where is the PR", the first
  sentence says whether it exists; if not, name the real blocker (a killed run, a missing step) and
  give no time you cannot back. When the owner asks for an
  update that "is not there yet" (README, wiki, DeepWiki), check first whether the PR is open and
  unmerged: `main`, the GitHub page and DeepWiki change only after the merge, so say that in the
  first sentence and give the PR link.
- **The deny list reads the whole command text.** Run `git add`, `git commit` and `git push
  origin <branch>` as three separate calls, and push with no pipe, no `;` or `&&` chain, no `cd`
  prefix (set the terminal `workdir` instead) and no second refspec. A blocked word inside a harmless `grep` or `sed` pattern blocks the call (for example `sudo`, `.env`, the name of a
  secrets file or of the secrets folder, even inside a doc sentence you are rewording with `sed`: use the `patch` tool for that edit; an installer word like `npx`, a Dockerfile `ENV` keyword, or `env`
  next to `-i` flags, which reads as dumping the environment): drop the word from the pattern, or
  search source with `search_files`, and search for the shape instead. The same holds for words inside a
  prompt string on an `omp` command line (the phrase for pushing to git trips the push rule): put
  such text in a task file, or reword it. The same holds for a commit message or a PR title that
  names a permission-widening setting (an approval bypass, a policy that turns prompts off): write
  the message to a file and run `git commit -F <file>`, and word the title by the effect ("set the
  rig policy"). The PR body may name the setting: it travels as a file. When a call is blocked,
  split or reword it; never look for a way around.
- **An explicit order stands.** When the owner says "install X" or "do Y", do the work and put the
  cost and the risk in the PR body or the reply. Do not stop to ask for a "yes" he has already
  given. Stop only for a rule that forbids the act, and then name the rule in the first sentence. A rule from a repo's AGENTS.md (no GUI, no fonts, a size cap) is the owner's default, and he overrides it (Node, two fonts, Blender): price the exception by measurement, put it behind an option that is off by default, and build it. Do not offer the compliant route as the recommended pick. When a `clarify` question comes back cancelled or unanswered, the owner is not blocked on it: do the part that is unambiguous, ask the open question once at the end of the reply, and never ask it twice.
- **Hermes cuts a context file at 32,000 characters** and drops the middle (the log says
  `Context file ... TRUNCATED`). Keep nix-os `AGENTS.md`, `hermes/AGENTS.md` and `hermes/SOUL.md`
  under 30,000 (`wc -m`; the nix-os justfile has a `context-size` recipe). Run it on a fresh `origin/main` worktree
  BEFORE you write any task that touches `AGENTS.md`: main can already be over the cap, and then your PR
  must shorten wording to get under it and say so. Run
  `scripts/context-size.sh` with the worktree as its cwd, as `(cd <worktree> && sh scripts/context-size.sh)`:
  from another directory it prints nothing and exits 0, which looks like a pass. Shrink by cutting rows of the
  file table and moving the detail to the doc the row links, never by cutting the rule sections.
- **A terminal call over 600 s becomes a background process** and `process_manage wait` is clamped
  to 180 s per call: for an omp run, start it, do the next file work (the next task file, the PR
  body), and end the turn when only the wait is left; the completion notice returns.
- **Verify the PR after `gh pr create`:** `gh pr view <n> --json
  state,headRefName,headRefOid,additions,deletions,files` and `gh pr checks <n>`; report pending
  checks as pending. Compare `headRefOid` with the commit you meant to push, and distrust a diff
  that is nearly all deletions: a push hook can add commits to the branch (`references/other-owner-repos.md`).
- **Never touch `.github/workflows`** (rule 2, no App permission, deny list). For a CI change,
  see "CI speed requests" below. omp may edit it anyway (a lint line, a new test step): after every run
  read `git status --short .github`, restore the file (`git checkout -- .github`) before the commit,
  and give the owner the lines to add in the PR body.
- **Code edits and code reviews go through omp.** Standing order of the owner: every task that
  writes or reviews code, config or scripts runs in `omp` (skill `hermes-omp`), even a one-line
  fix; you do not write code with your own file tools. You do the branch, the diff review, the
  commit, the push and the PR. Edit by hand only Markdown with no code and small slips in omp's
  diff, and say so. Before the run tell the owner in one message: repo, branch, mode (write or
  review-only), task file path, and the models and thinking level read from `hermes/omp.yml`.
  After it: files changed, checks omp ran, checks you ran, what is unverified, run time, PR link.
  The owner finds the `hermes-omp` interface unclear, so name it ("omp made the edits") and never
  present omp's work as yours. Procedure: `references/omp-harness.md`; to wrap omp for another program, its section "Wrapping omp".

## Other repositories of the owner (h0ffmann/*, marola-dev/*)

For "fetch the trails / places / boundaries from an API" for a marola or piabrota site, load `references/open-data-fetch.md`: vet the source's terms first, the Overpass recipe, the trail filter, the output shape.
For a page that omp built, look at it in headless Chromium before the commit: `references/real-browser-check.md` and `scripts/cdp_check.mjs`.
For "add X to repo Y" outside nix-os, or a rewrite of a repo in another stack (the fork route, a FACTS file, staged vendor libraries, runs A/B/C), load `references/other-owner-repos.md`: read the repo's own hard rules first, copy them into the task file, and test on the repo's pinned toolchain as well as the box's. The same file has the two-PR route for piabrota/room (code there, then a nix-os pin bump).

## Bulk English cleanup (ASD-STE100 across a repo)

For "convert the docs to ASD-STE100 / cut Markdown verbosity", load `references/ste100-bulk-conversion.md`:
pilot on two files with Haiku subagents, check them with `scripts/md_structure_check.py`, measure,
then split the real run into one PR per doc group.

## Applying a patch prepared earlier

1. Fetch, then compare the old base with the new head: `git log --oneline <old>..origin/<default>`
   and `git diff --stat <old> HEAD -- <files the patch touches>`.
2. `git apply --check`, then apply. A clean apply does not prove the text is still true: re-read
   claims that point at files that changed, and write in the PR body the base they were checked on.
3. Use the branch name the owner gave.

## Classify the change before the PR body

- In piabrota/nix-os a merge deploys, except a merge that changes only Markdown: `deploy.yml` has
  `paths-ignore: ['**.md']`. That includes `hermes/SOUL.md`, `hermes/AGENTS.md`, `hermes/omp-append-system.md`
  and `hermes/skills/**/SKILL.md`: a PR with only those does NOT deploy, and the change reaches the box
  with the next non-Markdown deploy or a manual `deploy.yml` run on `main`. Say that in the PR body
  and in chat. A new skill (a `SKILL.md` plus doc rows) is the same case: do not write "the deploy restarts `hermes-agent`" for it just because its folder is in `settings.skills.external_dirs`; apply this list first, then state the risk. A `.nix` file, `hermes/omp.yml` or `hermes/dangerous-patterns.yaml` change deploys. Say "this merge deploys and restarts
  the unit" in the PR body and in chat.
- When the owner says "same PR" for a docs change and a config change, keep one PR and put the
  deploy part first in the body.
- A script that `hermes.nix` embeds by store path (the `kvm4-health` wrapper, the gateway wrapper) is part of the
  `hermes-agent` and `hermes-backend` unit files: any edit of it makes the merge restart both and end the agent's
  own runs. Compare the unit files before and after (`nix eval` of `config.systemd.units."<name>.service"`),
  say it in the first lines of the PR body, and put such a change in its own commit.
- Prose that contradicts a changed setting (identity file, docs in both languages, comments, the
  repo's AGENTS.md file table and rules) changes in the same PR. Grep the repo for the old claim
  (for example "Sonnet and nothing else") before you commit; it hides in `hermes.nix` comments,
  `docs/HERMES*.md`, `docs/AWESOME-HERMES*.md`, `hermes/SOUL.md` and the AGENTS.md file table.
- A new doc in nix-os gets a row in the AGENTS.md file table. A new research doc the owner wants
  English-only is the owner's order: say so in that row.
- A new file that Nix reads with `${./path}` must be `git add`ed before any flake build or check
  (flakes ignore untracked files). Use `git add -A <dirs>` before the commit and check
  `git status --short` shows no `??` line.

## CI speed requests and workflow edits

For "make CI faster", a job or host rename that workflows name, or any change under
`.github/workflows`, load `references/ci-speed-requests.md`: measure first, deliver the workflow
change as a patch file (never a PR), alias a renamed node, warn about a ruleset's required check,
and the design rules for a gated job. For "update X every day with the ops bot", load
`references/pin-bump-automation.md`: a tested script plus a draft workflow the owner copies; the same file has the daily no-agent cron job that refreshes generated data into a PR in another repository.
To measure or reduce a CI score (code smell, lint count), load `references/code-smell-refactor.md`.

## OpenRig seats

For a seat that does not start (`command not found` in the pane, "runner to report ready"), load
`references/openrig-seat-environment.md`: how OpenRig builds the pane, the fix, and the proof.
For a runtime or spec change of a rig (shared agents, model-id form, unfree package, auth, a rig that does
not follow its spec), the design of a new rig, including a document or PDF rig, or "run rig X 24/7"
(a keeper timer that restores it after a deploy), load `references/openrig-runtime-and-spec-changes.md`.
For a rig that must serve another org's repositories with that org's bot App, or two runtimes to compare, load
`references/rig-for-another-orgs-repos.md`.
For a rig or toolkit that renders media (Blender, ffmpeg, a pixel or loudness test), load
`references/headless-media-tools.md`.

## README, wiki and figures (docs PRs)

For "update the docs / README / wiki / archify images" or an address index, load
`references/docs-figures-and-wiki.md`: facts by command, omp writes and Hermes draws the PNGs
(Chromium from Nix), honest status wording, wiki mirror rules.

## Restyling pages and dashboard theme

For "this page is horrible / must match piabrota identity", a new page, or a Hermes dashboard
theme: load `web-ui` and then `references/site-look-and-dashboard-theme.md` before the task file.

## Skills export (piabrota/skills)

For "send the skills you updated to piabrota/skills" or the daily `skills-export` job, load the
skill `update-skills`: it has the export script, its checks and the pull request steps.

## Feeds and digests (RSS, trending, podcasts)

For "build me a feed / watch these sources / trending repos or podcasts", load
`references/personal-feed.md`: interests from evidence, probe each source, parse huge podcast
feeds, wire the script into Hermes cron, and the overnight hand-over.

## Org profile repo (piabrota/.github)

- Members and projects tables are in `profile/README.md` and `profile/README.pt-BR.md` (Board =
  Equipe). Change both. Run the repo's reading-time script with `--write`, then with `--check`, after any edit.
- GitHub Apps are not organisation members: list them in a separate agents table. Take IDs and
  avatars from `gh api apps/<slug>` and `gh api 'users/<slug>[bot]'`.
- Pinned repositories are set only in the GitHub UI (org page, "Customize pins", up to 6 public
  repos of that org). No README edit or API call sets them: do not promise it.
- The projects table of that profile is also the source of the cards on piabrota.art. For "add repo X
as a card on the website", a stat on every card (commit counts), a service "listed as public", load `references/site-project-cards.md`: where the facts and the three
locale keys live, the personal-owner field, and the mockup regeneration; the same file has the
  recipe for a pinned fact on the /hermes page (version, commit) with its build guard, and for a card
  that links nowhere or a grid with gaps.

## Model routing, project surveys, service costing

For "use a cheaper model for X", a model-ID bump, a survey of forks or plugins, a plan issue with
researched facts, or "can the box run service Y", load `references/model-routing-and-surveys.md`: the real routing levers, the grep
before a model bump, how to classify and measure projects, and the three-table costing answer.
After the owner says yes to hosting a service on a nix-os host (or to publishing another repo's
generated files at a new subdomain), load `references/add-service-to-host.md`:
hostname check, the `hermes-web.nix` pattern, packaging from a pinned source (an npm app too),
the omp run order, a web UI behind basic auth, making a page public with robots.txt and agent
blocks, giving pages their own subdomain (redirect, DNS, README rows), the operating skill for a third-party tool, and
how to give memory numbers.

## Loading skill repos into Hermes

For "load the skills of repo X as commands", a bare skill-repo URL with "add this in a new PR", or a
change to `settings.skills.external_dirs`, load `references/loading-skill-repos.md`: pin with
`fetchFromGitHub`, copy an allowlist or one skill under a category folder, vet each skill, test with
a temp `HERMES_HOME`.
For "create a command for yourself" (a new `/x` that stays after a deploy), load
`references/own-skill-command.md`.
For a pasted installer or "run this to set up tool X" (`curl | sh`, a hub CLI), load
`references/third-party-tools-and-installers.md`: vet the script as a file, check upstream, report, run nothing.

## Owner plugin requests (pirsig-notes, pirsig-videos)

- Load the plugin skill first (`pirsig-videos:video-indexer`, `pirsig-notes:smart-notes`). The
  tools (`pirsig_video_fetch`, `pirsig_note_search`, `pirsig_video_check`, `*_submit`) are deferred:
  find them with `tool_search`, read the schema with `tool_describe`, call with `tool_call`.
- Fetch, write and check come first; show the owner the titles, kinds and `⚠` marks, and call a
  `*_submit` only after the owner says to send. The PR text is a fixed English template.
- When the fetch fails (YouTube's bot check on the VPS address), stop: tell the owner, open no PR,
  and look for no other route to the captions. This includes a Playwright or headless-browser
  request. Load `references/video-fetch-blocked.md` for what to offer (a fetch on the owner's
  computer, a pasted transcript, oEmbed for the title) and why a browser does not help.

## Reviewing the owner's PR

For "review PR N" (with or without "add suggestions I can approve in 1 click"), load
`references/pr-review-suggestions.md`: post one `COMMENT` review with `suggestion` blocks for
small safe fixes, list decisions you cannot make for the owner, never approve. `hermes guide` checks the running install, not a diff: use it as a baseline of the box and review the diff with omp. For "review with
OMP" use `references/omp-harness.md` (review-only run), and when the owner then says "fix it
yourself", the same file and `pr-review-suggestions.md` give the stacked-PR route: you may push only
`hermes/*`, so open a PR whose base is the owner's PR branch.

## Moving a site or generator into nix-os

For "move the site implementation to nix-os / serve it at www.piabrota.art/<path>", load
`references/move-site-between-repos.md`: copy the program verbatim, pin the content by commit,
build with Nix, serve with an nginx alias, then a second PR that removes it from the source repo,
then the rename sweep (old `owner/repo` names and the dead `github.io` address in the program's
strings, the source README and the homepage facts) and the live URL check after "merged".

## Moving a service to a new host (DNS, order of steps)

For "which DNS records do I change" or "what do I do before I merge" on a host move, load
`references/host-cutover.md`: DNS checks through DNS-over-HTTPS, the one-record answer, the order
of stacked PRs, VPS prep and cutover, and what stays unverified.

## Owner-run remote commands (`just remote-restart`, health, checks)

For "a just command to restart or check the services", load `references/remote-ops-recipes.md`: allow list,
plan and prompt over SSH, restart order (agent before dashboard, own session last), thresholds, the PR text.

## Gateway unit loops, reloads, "debug yourself"

For a unit that restarts without end, a background job killed after a deploy, or "use the doctor
commands", load `references/hermes-gateway-unit.md`: the read-only diagnosis order, the
`--external-supervisor` loop, and the rule that a reload kills jobs you started.

## Pending memory writes, memory cap

For "approve the pending memory" or "why is memory only 2200", load `references/memory-pending-approvals.md`:
merge the overlapping staged proposals into one net batch, check the size first, clear the staged files.

## Dashboard errors (Chat tab, nginx auth)

For a pasted error from `hermes.piabrota.art` ("retrying in 30s", queued message), load
`references/hermes-dashboard.md`: reproduce the TUI's bootstrap to read the hidden verdict, then
present the fix options and let the owner choose.

## Inventory and deploy-state answers

- "List your skills / plugins / tools" is answered from live commands, not from memory of earlier
  PRs: others install plugins and skills between sessions. `skills_list`; `hermes plugins list`
  (a wide boxed table: filter rows with `grep -E '^│ [a-z]'`, `awk -F'│'`, and re-grep a name that
  the table truncated with an ellipsis); `omp --version`; `command -v <tool>`. Say which entries
  you did not know about, and that being listed does not prove a skill works (no credentials, no
  binary).
- "Is it live / did the deploy happen?" Check all three: `gh pr view <n> --json state,mergedAt`,
  `gh run list --workflow deploy.yml --limit 1`, and the box itself (`systemctl show hermes-agent -p
  ActiveEnterTimestamp`, the key in `~/.hermes/config.yaml`). A deploy run "in progress" may be a
  later merge: say you do not know which commit it is unless you read it.
- Offer a small real task (one skill command, one delegated run) as the proof for anything the
  checks above cannot show, such as whether the subscription accepts a newly pinned model ID.
- "Is service X working?" after a merge: load `references/service-check.md`.

## Tuning the omp coding worker

The owner's rule (2026-11-04): every task that writes or reviews code goes through omp, and the
layers must be visible. `docs/HERMES-OMP.md` in nix-os is the map; point the owner to it.

When the owner asks how to edit or improve the omp harness, load `references/omp-harness.md`: the
layers (task file, per-run flags, target repo context, skill, prompt file, overlay
`hermes/omp.yml`, wrapper, version), which setting wins, the levers that improve code quality on
Sonnet, and the rules that must not loosen. The owner wants every layer visible and a way to tune
it himself: answer with the layer table (file, who edits, when it takes effect), then offer the
PR (deploy first in the body) instead of listing options without a next step.

## SOUL.md, guardrail and reply-language edits

For an order to change `hermes/SOUL.md`, the merge rule, the reply language, or any rule that the deny
list also enforces, load `references/soul-and-guardrail-edits.md`: the approval gate on protected
files, the layers to grep, and how to scope a loosened rule.

## Output hygiene

- This SKILL.md is exported to piabrota/skills, whose check wants a body of about 150 lines and
  5,000 tokens. Add new depth to a `references/<topic>.md` and leave a pointer here; keep only a
  rule that applies to every task in this body.

- Do not `cat` a large AGENTS.md, a big `git diff` or a whole docs site page into the tool output:
  repo AGENTS.md files re-load into context as subdirectory context and flood it. Use
  `grep -n`, `sed -n 'a,bp'`, `--stat`, or strip HTML with perl and `head -c`. A command whose
  working directory is inside a repository (or a command that `cd`s into one) re-loads that
  repo's AGENTS.md into the output even when it only runs `grep`: use absolute paths, `git -C`, or
  `read_file` with an offset, and run from a neutral directory. The first `search_files` or
  `read_file` call into a directory with its own AGENTS.md loads it too (once per directory), so
  search one file's directory, not the repo root, when you only need a line. Starting `omp-run`
  with `workdir` in the repo loads it once too: do all reads of AGENTS.md before, and do not
  `git worktree add` from inside a dirty old clone: use `git -C <clone> worktree add ../<new> -b hermes/<slug> origin/main`.
  Check `git -C <clone> worktree list` for the directory name first: when `worktree add -b` fails
  because the directory exists, the branch was already created. Pick a fresh directory and add the
  worktree on the existing branch without `-b`.
