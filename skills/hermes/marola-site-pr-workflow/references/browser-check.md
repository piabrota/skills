# Real-browser check of the built marola page

Unit tests and the fake-DOM `client_check.js` do not prove that the page runs. Run this after every omp run
that changes what the browser loads, before you commit it. There is no `browser_exec` browser on the box:
use headless Chromium from nixpkgs and drive it over the DevTools protocol (CDP).

## Procedure

1. Build the dist folder with fixtures: `just app-build --fixtures` (inside `nix develop path:.`). Remove the
   untracked `flake.lock` after.
2. Serve it with the repo's own .NET server, in the background, on a free port: build it once
   (`RestoreLockedMode=true dotnet build app/Server -c Release`), then run
   `MAROLA_PORT=<port> MAROLA_STATIC=app/dist MAROLA_DATA=<tmp>/data MAROLA_DB=<tmp>/m.db dotnet app/Server/bin/Release/net10.0/marola-server.dll`
   inside `nix develop path:.`. It sends the real CSP and security headers, so a blocked origin shows up as a
   violation. Start it from a script file, keep its PID in `SP=$!`, and stop it with `kill $SP`. Never write `pkill -f marola-server.dll` in a terminal call: the pattern sits in that call's own shell command line, so it kills the shell that runs it (exit -15) and leaves the server alive. Check for leftovers with `pgrep -f marola-server | wc -l` and kill by PID. The old `scripts/serve.mjs` no longer exists.   Wait for
   readiness before the first request: loop up to 15 times, `node -e "fetch(url).then(()=>process.exit(0)).catch(()=>process.exit(1))"`,
   `sleep 2` between tries (a fixed 4 s sleep fails cold: every `fetch` returns "fetch failed"). Then fetch
   each generated page once and check status, content type and that the CSP header is present
   (`/about.html`, `/en/about.html`, `/contact.html`, a missing path that must answer 404, and dotfile paths
   such as `/.env` and `/.git/config` that must answer 404 while `/.well-known/security.txt` answers 200).
3. Start Chromium: `nix shell nixpkgs#chromium --command chromium --headless=new --no-sandbox
   --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --remote-debugging-port=<p>
   --user-data-dir=<tmp> --window-size=<w>,<h>`. SwiftShader gives WebGL without a GPU; the map needs it.
   Set `XDG_CACHE_HOME` to a writable path and point `FONTCONFIG_FILE` at a small fonts config, or text
   renders as boxes.
4. Attach with a small Node script (WebSocket to the page target from `http://127.0.0.1:<p>/json`). Enable
   `Runtime`, `Log`, `Network` and `Page`; collect `Runtime.consoleAPICalled`, `Runtime.exceptionThrown`,
   `Log.entryAdded` (CSP violations appear here) and `Network.loadingFailed`. Navigate, wait ~8 s for tiles,
   take `Page.captureScreenshot`, print the collected log.
5. Repeat for every area (`?area=floripa|rio|salvador&lang=en`) and for a phone viewport (390x844).
6. Measure facts from the DOM, not from the picture: the scratch driver takes the expression in an `EVALX`
   environment variable and runs it with `Runtime.evaluate` after the wait. Marker names:
   `[...document.querySelectorAll('.maplibregl-marker')].map(m=>m.getAttribute('aria-label'))` proves an area
   centres on its own beaches. Phone nav: `getBoundingClientRect()` of each child of the nav gives the distinct
   `top` values (one row means all within a few px), any child with `right` beyond `innerWidth` (clipped), and
   `scrollWidth` against `clientWidth` (sideways scroll). For a generated page count `<script`, ` style=`,
   `<h1`, `canonical` and `hreflang` in the fetched HTML. A DOM number is evidence; a screenshot read is not. The driver prints the `EVALX` result on its own line BEFORE trailing lines such as "requests to other origins:", so `tail -1` returns nothing useful: redirect the output to a file and `grep -o '{"nav.*}'` (or the first JSON line). Return JSON from `EVALX` so the grep is easy.
7. Look at each screenshot with `vision_analyze`. Pass means: base map and tiles drawn, markers and trails
   drawn, no console error, no exception, no CSP violation, no failed request. Ask for an enumerated
   description ("list what you see: the base map and its city, trail lines, the nav item texts, any error
   text or black area"). A yes/no question can return only the image and no text; when no description came
   back, ask again with the list form and never report what the picture shows from memory.
   Drop the base map style's own console warnings (`highway-shield`, `road_shield` filters) before you read
   the log: they come from the third-party style, not from the page.

## Pitfalls

- The plain `--screenshot` mode leaves the console log empty: use CDP to see errors.
- The fixture board gives Floripa beaches for every area, so Rio centres on Floripa and its trails are not in
  view. To see Rio trails, fly the camera to Rio or use a Rio board; say so when you did not.
- Black or unstyled dots usually mean a CSS class that the new views emit has no rule in `style.css`: compare
  the class names the old page used with the ones in the rendered DOM.
- Scratch scripts in `~/.hermes/cache/scratch` are deleted 24 h after the last write: recreate them from this
  recipe, and keep the screenshots in `workspace/screens/<name>/`.
- Run the whole build, serve and browse sequence as ONE background job with `notify`; it takes minutes cold.
  Write it as a script file and start the file: a foreground terminal call that contains `&` is refused, and
  a backgrounded server inside a foreground call is lost.
- A phone viewport shows nav wrap bugs that 1280 px hides: look for a clipped second row at the top edge.
  Measure at 390 and 375 px, and measure the server-rendered dynamic pages (`/submit`, `/studies`, their `/en/`
  twins) as well as the static ones: a repo script that measures only the static pages does not cover them,
  although they share the layout and its strip.
- An unlabelled-input audit on `contact.html` flags one input: the honeypot (`hidden`, `aria-hidden`). That is by
  design; count it out before you call it an accessibility bug.
- omp has no browser and reports "browser check not possible" or "fit is my estimate" for CSS and layout work. That
  is Hermes's step, not a gap to leave: run this recipe for the page, the generated pages in both languages and a
  phone viewport before the commit, and say in the commit and PR what you saw.
