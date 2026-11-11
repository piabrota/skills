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
3. Find what the repo already says about the thing you add (a README that lists a file that does
   not exist, a scene map that says "not made yet"). Say the mismatch in the PR; do not hide it.

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
