# Headless media tools in a rig (Blender, ffmpeg)

Use when a seat or a toolkit renders video, frames or audio on a box with no GPU and no display,
or when the owner asks whether such a tool is free or fits.

## Spike before you promise (Blender)

1. Ask "is it paid" from the pinned nixpkgs, not from memory:
   `nix eval --json <nixpkgs rev>#<pkg>.meta.license` and `.meta.unfree`. A free licence needs no
   change to `unfree.nix`.
2. Measure cost before the design: `nix build <rev>#<pkg> --dry-run` (paths to fetch; it counts only
   what the box lacks, so it understates the closure), then the real size with
   `nix path-info -S --json <store path>` (`closureSize`). Fetch in a background terminal call with
   `notify`: a big closure exceeds a foreground call.
3. Run one frame from `execute_code` with `Popen`: `blender -b --factory-startup --threads 2
   --python <script> -- <engine>`, with `HOME`, `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` pointing at a
   scratch folder (it writes config). Time it, and read peak memory from
   `resource.getrusage(RUSAGE_CHILDREN).ru_maxrss` (KiB, the largest child so far: use a fresh
   interpreter for each engine). Look at the PNG with `vision_analyze` before you call it valid.
4. Test each engine in its own run. With no GPU or display, EEVEE aborts with EGL errors and a
   segmentation fault (rc -11); Cycles on the CPU renders. The toolkit sets the engine to Cycles and
   the device to CPU after it loads the scene file, so a scene cannot select EEVEE. Treat Workbench
   as untested until you run it.
5. Label every number: measured (one scene, one box) or extrapolated (frames times seconds per
   frame). Put both in the docs and the PR. Add a frame budget to the toolkit's profile and refuse
   a shot above it, because a long render shares the memory cap of the rig's unit with the other
   seat.
6. The toolkit's tests run a stub `blender` placed first in a temp `PATH`. The stub writes real-size
   PNGs, logs its arguments, and mimics the real exit codes. Check the log: the engine and sample
   flags are there, EEVEE never is, and the home folders are inside the project. Never run the real
   program in the suite; run it once by hand as a smoke test and say it is not in the suite.

## Reading one pixel of a clip with ffmpeg

- On a yuv420p clip, `crop=1:1:X:Y` rounds to the 2x2 chroma grid and gives a 0x0 frame. ffmpeg then
  prints "Invalid too big or non positive size" and "Nothing was written". Convert first:
  `-vf format=rgb24,crop=1:1:X:Y -f rawvideo -pix_fmt rgb24 -`. Compare with a tolerance (about 10
  per channel), because the codec is lossy.
- A failing pixel helper looks like a toolkit bug. `ffprobe` the clip (size, duration, frame count)
  before you touch the toolkit: an intact clip points at the test.
