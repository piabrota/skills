# Check an omp-written page in a real browser before you commit

omp's smoke tests run on a stub DOM and a stub map. They cannot see CSS, layout, a real library
behaviour or a CSP block. Hermes owns this check: omp has no browser run.

## Steps

1. Build the page, then serve the built folder with a static server that sends the real CSP header
   (not `file://`, which drops root-relative CSS and skips the policy).
2. Run `node <skill>/scripts/cdp_check.mjs <url> <out.png> <w> <h>` once for a wide view (1280x800)
   and once for a phone view (390x844), for each area or route the change touches. Run each URL as a
   separate call; the browser needs about 25 s per page.
3. Read the printed lines: an `EXCEPTION`, a `NETFAIL` with a `blocked` reason, a CSP line, and the
   list of other origins (it must match the CSP the code claims). Read the screenshot with
   `vision_analyze` and, for a small detail (a marker colour), crop with `region`.
4. Probe a suspect element with `EVALX`, for example the computed fill of a marker:
   `EVALX="getComputedStyle(document.querySelector('.dot')).fill"`.
5. Fix a small CSS or selector slip by hand and say so. A logic or structure fault goes back to omp.
6. Rebuild, rerun, and put the honest list of what you saw, and what you did not see, in the PR.

## Pitfalls

- `chromium --screenshot` with `--virtual-time-budget` shows a half-loaded page (a blank map with only
  the attribution): it does not wait for network or WebGL. Use the CDP script, which waits and
  captures after the page settles. Console output of the flag mode is empty at default log level.
- Under a CSP with no inline style, code must set a colour through a class, and a class with no CSS
  rule renders black. Stubs pass either way: check the computed style of one element per variant.
- A rule that hides a nav item on a phone by an attribute the new markup does not carry (a
  `data-i18n` selector) fails silently. Grep the old CSS for attribute selectors when the markup
  is rebuilt, and look at the 390 px view.
- A fixture that holds one area's data for every area makes the other areas look wrong (the map
  centres on the fixture's beaches). Say so; do not report those areas as checked.
- A feature behind a disabled "soon" button cannot be reached by a visitor, so a URL parameter that
  selects it may do nothing in the old site too. Say "not exercised in a browser", not "works".
- Software WebGL (`swiftshader`) is slow but draws MapLibre maps. A `highway-shield ... filter`
  warning from the OpenFreeMap style is the style's, not the page's.
