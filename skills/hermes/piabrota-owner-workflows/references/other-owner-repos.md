# Work in an owner repository that is not nix-os

A repository outside nix-os has its own AGENTS.md. Its hard rules beat your habits, except the
owner's PR rules in `SKILL.md` (English ASD-STE100, `hermes/<slug>` branch, no merge).

## 1. Read before you write the task file

1. Clone once into the workspace (`gh repo clone <o>/<r> -- --depth 1 --filter=blob:none`) and
   reuse it. Read AGENTS.md with `read_file` and an offset, not from a terminal whose `workdir` is
   the clone: that re-loads the whole file into context.
2. Copy each hard rule that touches the change into the task file as a bullet. Typical ones:
   - PR text rules: no other repository's `owner/name` or URL in a PR, issue or commit message
     (GitHub makes a backlink); no trailer or attribution; the branch is named by the goal.
   - Language rule: which paths may hold which language. Put on-screen or user-facing text of
     another language in a path that the rule allows (a `pt-BR/` folder), and keep the code in
     English. Tell omp that the repo's own checker (for example a prover) cannot run here, and ask
     for a by-hand check of the rule.
   - File ownership: a feature adds its own recipe file, check file and Nix shell, and edits a
     shared file only for the one import line the rules allow.
   - Reproducible builds: a new tool goes in the repo's own Nix shell, from the repo's lock.
   - Gates of a marola-dev repo: an agent may start only on an issue labelled `agent-ready`;
     commit trailers (`Tested:`, `MIP:`, `Co-Authored-By`) can differ from your default; a rewrite
     of a "no build step" repo needs an ADR. You can push only `hermes/*`, so a repo that wants
     screenshots on a branch you cannot push needs the fork route. Ask the owner these once, in one
     `clarify`, before the first task file.
   - A cross-repo change (app in one repo, hosting in nix-os) is one PR per repo; say so when the
     owner asks for "the same PR".
   - Read-only audits by Haiku subagents (security, surface inventory) are leads, not facts:
     spot-check each claim that drives the plan with `grep -n` on the file before you report it.
     A `delegate_task` goal that holds a literal `<tag>` is rejected as an unexpanded template:
     write the real text.
3. Find what the repo already says about the thing you add (a README that lists a file that does
   not exist, a scene map that says "not made yet"). Say the mismatch in the PR; do not hide it.

## 1b. Rewriting a repo in another stack (static JS to Gleam, for example)

A rewrite is several omp runs, not one. Do the following before the first run:

1. **Fork route.** When the owner says "push to your fork", `git remote add fork <fork url>` and
   test with a push of the current default commit to `refs/heads/hermes/<slug>`. A push proves
   access; `gh api repos/<fork> --jq .permissions.push` reads `false` for an App token even when
   the push works. The owner pushes upstream himself; say that in the PR.
2. **FACTS file for omp.** Write `omp-tasks/<job>/FACTS.md` with the audit results and mark each
   line `checked` (you read the line) or `audit` (a subagent said so). omp cannot use `gh`, `curl`
   or `~/.hermes`, so anything it needs from the network or the box goes into this folder.
3. **Stage vendored libraries yourself.** Download the npm tarball with `curl`, compare its sha512
   with `dist.integrity` from the registry (no `openssl` here:
   `echo sha512-$(sha512sum f.tgz | cut -d' ' -f1 | xxd -r -p | base64 -w0)`), read the typings for
   the API you port (a new major version can change the custom-layer `render` signature and ship
   ESM only, with no UMD or CSP bundle), and copy only `dist/`, the licence and the `.d.ts`.
4. **Gleam on this box.** Take `gleam` and `beamPackages.erlang` from the nix-os system's own nixpkgs
   (`nix shell <flake>#nixosConfigurations.<host>.pkgs.gleam ...`); Hex resolves from here
   (`gleam add lustre@5`). A Nix build then fetches each locked package offline from
   `manifest.toml`, as nix-os `site/default.nix` does with `fetchurl` on the Hex tarballs.
4b. **Keep the tree clean of tool litter.** `nix develop` in a repo with no tracked `flake.lock`
   writes one, so the Gleam version floats with nixpkgs: delete the file after every shell and say
   in the PR that the toolchain is not locked. Do not use `git add -N` to preview a diff: it leaves
   an intent-to-add entry that shows as a change after the file is gone. Clear it with
   `git rm --cached --ignore-unmatch <file>`, then check `git status --short` is empty and that
   `git show --name-only HEAD` lists no lock file or `build/` output before you push.
4c. **`nix develop` can fail in a worktree** with "libgit2 object not found" (the git flake source cannot see the shallow history). Use `nix develop path:.` there; it writes the same untracked `flake.lock`, so the cleanup in 4b applies.
5. **Split the job** into runs that each end on a check: A typed shared core with parity tests
   against the old code (a script that loads the old functions in a `vm` sandbox and writes a golden
   JSON), B client and map, C server, hosting and docs. Start A only; read its diff before B.
5b. **A feature the owner adds mid-job** (for example "let scientists submit studies like site X") goes into the run that owns the server, not into a run still getting the client to compile. Read the model site's public spec first (its agent `skill.md`, API docs; a logged-out form shows little), then answer with: what the model does, where you will differ, the defaults you chose, and ONE question that only the owner can answer (who approves). Defaults for any upload feature: a moderation queue before anything is public when a wrong claim can hurt readers (bathing-water safety); accept PDF only and compile no uploaded source (LaTeX or similar) on the box that also runs the agent, until a sandbox exists; size and type checks; sign-in through GitHub so the server holds no passwords; rate limit; a privacy notice and a delete route (LGPD); the SHA-256 and receipt time as the priority record.
5c. **One PR for the whole job.** The owner finds two open PRs for one rewrite confusing and says
   "work in a single PR". Keep one branch and one PR from the first push to the end. A change of
   stack mid-job (Gleam, then F# with Fable) is more commits on the same branch: port the old code
   as the specification and parity oracle, delete it in a later commit, and rewrite the ADR; the
   net diff then shows only the final stack. Never open a second PR for a stack change. If a polluted
   branch forces a replacement PR (no force-push), name the PR to close in the first line of chat
   and say that no further push goes to the old one.
5d. **A one-word answer that reverses an earlier choice** ("Gleam" after "F# with Fable") is not
   a comparison. Before a multi-hour run, state the trade in a few lines (what each stack costs on
   this box, what carries over) and the cheapest moment to switch; the owner may switch back. Probe
   the toolchain before the task file: `nix eval --raw <pin>#fable.version`, the dotnet SDK and
   `fantomas` versions from the same pin, NuGet reachability with a read-only index query. Name a
   version drift from what the owner wrote (pinned 5.26 against "5.2") in the reply and in the ADR.
   Make the task's first step a spike that proves restore, a .NET test and the same test through
   Fable on Node, with a stop line (`OPEN:`) if the sandbox blocks NuGet, and require a committed
   NuGet lock file for reproducibility.
5e. **F# with Fable on this box (what worked).** Take `fable`, the dotnet SDK and `fantomas` from the
   pinned nixpkgs in the repo's dev shell; set `DOTNET_CLI_TELEMETRY_OPTOUT`, `DOTNET_NOLOGO`,
   `DOTNET_CLI_HOME` and `NUGET_PACKAGES` to scratch paths. Layout: `app/Shared` (pure F#, no
   .NET-only API, so Fable can compile it), `app/Tests` (Expecto on .NET), `app/Tests.Fable`
   (Fable.Mocha on Node, the same test files through a shared `.props`). Commit NuGet lock files and
   restore in locked mode. Thoth.Json decoders read strings as numbers: have omp write strict
   number decoders, or a string passes as a float. Ignore `app/**/bin` and `app/**/obj`, and stage
   by directory (`git add -A app docs scripts justfile flake.nix AGENTS.md .gitignore`) so build output and the
   tool-litter lock file stay out. Keep the old tests' golden file as the single parity oracle and
   move it with `git mv`. A run of six steps (spike, types, pure functions, parity, delete the old
   stack, docs) fits the 34-minute cap when each step writes a progress line. Re-run the gate
   yourself in the background (a call over 600 s auto-backgrounds), then commit and push.
6. **List the repo rules that the rewrite breaks** (a "no build step" line, a phase rule that says
   a hosted server is a later phase) and give them to the owner as decisions, with an ADR in the PR.
   Do not claim the result ranks "top" on a quality; name the checkable gaps you close.

## 2. Test on both toolchains

The box's tool and the repo's pinned tool can differ (Manim 0.20.1 on the box, 0.21.0 in the
repo's nixpkgs). Write code that uses only API in both. Prove the repo's pin with its own shell:
`nix develop .#<shell> --command <tool> --version`, then run the real check with it. Read the
repo's pin with `getFlake` and the paper or lab input's nixpkgs, not with a guess.

Stage new files (`git add -A`) before you run a repo checker: a checker that lists tracked files
(an invariant that every recipe is imported) fails on a file it cannot see, and passes once staged.

## 3. Data in generated outputs

When the repo says that a number comes from a generated file (`results.md`), the new code reads
the file; it never types the number. Its test checks the parser on the real file, and checks the
shape, so a new run of the generator does not break the test.

## 4. Deliver

- Render or run what you made on the box with the matching skill (for media: `hermes-manim`).
  Look at frames, then send the files to the owner with `MEDIA:`.
- Push `hermes/<slug>` and open the PR with the repo's rules in the body: name the checks you ran
  and the ones you could not run (a prover, `just`).
- **The repo's own push hook is a gate.** A marola repo runs `just quality` and a trailer check on
  `git push`. Read a rejection and fix the commit message; never bypass the push with `--no-verify`.
  The `MIP: none — <reason>` trailer needs the em dash the repo writes, not a hyphen (the owner's
  no-em-dash rule covers copy, not a trailer format). A commit touching `site/static/**` needs it.
  Amend only your own unpushed commit (`git commit --amend -F <file>`), then push in its own call
  with no pipe.
  **A hook's self-test can write into your real repo.** A hook runs with `GIT_DIR` set, so a
  self-test that does `git init <tmp>` and then `git -C <tmp> commit` commits on YOUR branch
  (symptom in the hook output: `re-init: ignored --initial-branch`; fixture commits by `t <t@t>`
  named "root", "page", "side page", a `side` branch, a merge, `origin/main` moved). Git then
  pushes the polluted tip. After every hooked push compare the remote tip with the commit you
  meant: `gh api repos/<fork>/branches/<b> --jq .commit.sha` against `git rev-parse HEAD`, and
  read `git branch -vv` and `git reflog -12`.  Run the repo's checks yourself outside the hook
  (no `GIT_DIR`) and have omp fix the self-test before the next push: unset every variable of
  `git rev-parse --local-env-vars` at its top (a three-variable list misses `GIT_OBJECT_DIRECTORY`
  and others), and refuse to commit unless `git -C <tmp> rev-parse --show-toplevel` is `<tmp>`.
  Add a regression test that runs the self-test body with `GIT_DIR` set to a scratch repo and fails
  if that repo's HEAD, refs or commit count change. Set ONLY `GIT_DIR` in that test: with
  `GIT_WORK_TREE` and `GIT_INDEX_FILE` too, the unfixed fixtures fail early and the test passes on
  the bug. Prove it yourself in scratch repos (never with the real repo as `GIT_DIR`): the old
  script changes the scratch repo, the new one does not, and a copy of the new script with the
  unset line deleted fails the test. The next push then runs the fixed hook for real; compare the
  remote tip and `gh api repos/<fork>/compare/main...<branch>` author list afterwards. Repair without force-push: `git checkout -f -B hermes/<slug>-v2
  <good sha>`, put `main` and `origin/main` back with `git update-ref` to the upstream sha (read it
  with `gh api`; upstream is untouched because you push only to the fork), push the clean branch,
  open a new draft PR, and tell the owner to close the old PR (you cannot). If the approval gate
  times out on a ref reset, stop and ask; do not reach the same result another way.
  **"Am I being impersonated?"** Answer from the record, read-only: `gh api repos/<fork>/activity
  --jq '.[]|"\(.timestamp) \(.actor.login) \(.ref) \(.before[0:7])..\(.after[0:7])"'` lists each
  push with its actor; `gh api repos/<fork>/commits/<sha> --jq '{a:.author.login,e:.commit.author.email}'`
  shows commits with no GitHub login. Match the odd commits to a script by message and second of
  creation, and say what cannot be ruled out (a stolen App key: rotate it). The repo's trailer rule (`Tested:`, `Co-Authored-By`) beats the "no agent trailer"
  default of nix-os for that repo; list in `Tested:` only the checks you ran.
- **Look at it in a real browser before the commit** (`references/real-browser-check.md`): omp's
  stub tests passed a page whose dots rendered black.
- A clone of a public repo works with no App install, so a clone proves nothing about push. When
  the push asks for a Username, the App is not installed on that repo: stop, look for no other
  route, and say so in the first sentence. Hand over the commit, a `git format-patch -1 --stdout`
  file and the PR body file in the workspace, and give the owner two options: install the App on
  the repo, or run `git am` on the patch himself. Say it before a long omp run when the repo is
  new to you, because the run is wasted if the owner cannot receive it.
  Find out which owners the App covers without a push: `journalctl -u hermes-github-token -n 6` prints
  one line per owner ("token for one hour" or "the App is not installed there"). An installation URL
  of the `piabrota` organisation cannot cover a personal account's repository: the owner installs the
  App again on the personal account and picks the repository; the token unit then logs the owner
  within 45 minutes and no restart is needed.
- Media check by frames: tile six frames of each clip into one PNG
  (`ffmpeg -i clip.mp4 -vf "fps=6/<duration>,scale=480:-1,tile=3x2" -frames:v 1 sheet.png`; use the
  `ffmpeg` of the `ffmpeg-headless` store path of the Manim closure) and read it with
  `vision_analyze`. Then cut full frames at the seconds where a label fades in near an edge or near
  another label: a sheet is too small to show a transient overlap. Join the clips with the concat
  demuxer (`-f concat -safe 0 -c copy`) for one preview file.

## piabrota/room (the 3D room, its grid map)

For a change to what `room.piabrota.art` or `grid.piabrota.art` shows.

- **Two PRs, in order.** The change goes to piabrota/room. nix-os builds a pinned commit
  (`room-site/default.nix`: `rev`, `hash`, `npmDepsHash`; the header says a new room commit shows only
  after a nix-os PR moves them; the npm hash comes from `nix run nixpkgs#prefetch-npm-deps --
  package-lock.json`). A merged room PR changes nothing live until the pin moves, so say it in the
  first reply and in the room PR's Risk section. **Look for the automation before you open a pin PR:**
  when nix-os `main` has `.github/workflows/room-pin.yml` (the AGENTS.md file table lists it), a scheduled job
  opens the pin PR itself on the branch `agents/room-pin` (check `gh pr list --head agents/room-pin --state all`
  and `gh run list --workflow room-pin.yml`). Then a manual bump only duplicates it: report whether that PR is
  open and when the job last ran, and open your own only if the job is missing or failing. Without the
  automation, open the pin PR after the owner says the room PR is merged (check `gh pr view <n> --json state`); the owner
  may not say it, so check the state yourself when you finish another room task. The pin PR is small: the new `rev`, its `hash` from `nix flake prefetch
  github:piabrota/room/<rev>` (prefetch the OLD rev first: it must equal the current pin, which proves the
  method), `npmDepsHash` unchanged when `package-lock.json` is identical in both trees (`cmp`; the build with the
  old value is the proof), then build `config.piabrota.room.root` of the `piabrota2` system and grep the built
  JavaScript for the new labels. The `piabrota` system must equal `origin/main`; `piabrota2` changes and nginx
  reloads, with no unit restart.
- **Words, labels and places live in `src/config.js` only** (invariant 3). Write that into the task
  file as "no place name or label in the code file", and have omp grep for it at the end. Every new
  config list gets a check in `scripts/check.mjs`, and omp must show the check failing on one bad value
  before it passes on the real one.
- **The room's PR rules differ from nix-os's.** At least three screenshots and a clip of about 15 s in
  `docs/record/` (each image at most 2 MB, `public/` untouched), and a replay row plus the prompt as
  typed in both `README.md` and `README.pt-BR.md`. The row needs the PR number, which does not exist
  yet: let omp write `#TBD`, open the PR, then fix both rows in a second commit (no force-push). Take
  the "how long" cell from file times (`stat -c %y` of the task file and of the newest changed file),
  not from omp's guess.
- **Run in the room's own shell:** `nix develop` of its flake gives Node 22, `just` and ffmpeg;
  `just check` is the gate (invariants, then the build). Headless Chromium with software WebGL draws
  the MapLibre map, so a still of a map view can be read with `vision_analyze`: look at every still
  for the right place, the marker, the active control and cut text.
- **A place fact in the task file is a hypothesis.** The grid's land data holds a coastline and no
  state borders. Have omp derive each box from coast vertices near the place and count the mesh nodes
  inside, comment the method in config, and report where the data disagrees with the task (a river
  mouth named as a state's end that lies on another state's line). Say in the PR which end points came
  from general knowledge. State the honest limit of the data: a 9 km mesh shows a city-sized view as a
  few large triangles.
- **A visitor control keeps the room's rules:** eased moves with a jump under reduced motion, a mark on
  the active control cleared by the visitor's own drag or zoom (a move event with `originalEvent`),
  Tab reaches it, and no number key or global key (the number keys are the shots).
