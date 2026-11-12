# Fetching public data once (trails, boundaries, places) for a marola or piabrota site

The owner's rule: use an API, fetch the data once, store it as versioned files, and let the site
read the files. The site never calls the source at run time.

## 1. Vet the source before the first request

1. Ask for the licence and the terms in the first reply. A source with an open licence (OpenStreetMap,
   ODbL, needs attribution) is fine. A user-content site with no public API and no open licence
   (Wikiloc: tracks belong to the authors, the terms allow use only as the service authorises) is
   not a source: do not scrape it and do not copy its tracks into an open repo. Offer instead: the
   open source for the same thing, a link-out per item, or a written permission request.
2. A bot wall ("Just a moment..." from Cloudflare) on the terms page means: read what the search
   snippet and help page say, state that you could not read the full text, and do not try to get
   around the wall.
3. Put the attribution and the licence in the output file (`source`, `osm_base` timestamp).
4. Carry the same limit into every text you write afterwards (ADR, PR body, docs): say "no public
   API and no open licence", never "the terms forbid copying" when you could not read the terms.
   A claim about a clause you did not read is a guess, and an ADR makes it look like a fact.

## 2. Overpass recipe

- Run Python in `execute_code` (the terminal has no `python3`). The tool limit is 5 minutes per
  call: one or two Overpass queries per call, saved to a file each, with `time.sleep(8..20)` between
  queries. Send a `User-Agent` that names the project. Retry a 502, 504 or timeout once or twice
  after a pause; the public servers are often busy, and a second mirror (`overpass.kumi.systems`)
  is only a fallback.
- **Count first** with `out count;`, then download. It tells you the size and shows a wrong filter
  before you pay for the geometry.
- **`out tags geom;` on a relation returns only `bounds`, with no members.** Use `out geom;` when
  you need the polygon. Use `out tags center;` when you need only names and tags.
- **Select by administrative code, not by radius, for boundaries.** Brazilian municipality relations
  carry `IBGE:GEOCODIGO` (7 digits). The light form is
  `rel["IBGE:GEOCODIGO"="<code>"]["boundary"="administrative"]->.m; .m map_to_area ->.a;
  rel(area.a)["boundary"="administrative"]["admin_level"~"^(9|10)$"]; out geom;`. The same query
  with `around:<r>` timed out on the busiest server. Neighbourhoods (bairros) are `admin_level` 10,
  sometimes 9 or `place=suburb`. IBGE's own API has municipality polygons but no bairro polygons.
- Stitch the `outer` member ways into closed rings (join by end points), test a point with ray
  casting, and let the smallest polygon that holds the point win. A city-wide polygon named like the
  city swallows ways that no small polygon covers: report them, do not rank them as a bairro.
- Count what falls outside the target municipality (neighbouring towns inside the radius) and
  report the number; do not drop it silently.

## 3. Trails need a filter before they are "trails"

The query `highway=path|footway|track|steps` with a `name` returns mostly city alleys and
staircases (about 85 % in Rio). Street-style names (Rua, Travessa, Avenida, Beco, Escadaria,
Servidao, Alameda, codes like `CL 380162`) are not trails. Real hiking data is the minority: a
`sac_scale` tag, a way in a `route=hiking|foot` relation, or a `highway=path` with a trail-style
name. Print the kept names per city and read them: a first filter let ordinal street names
("Primeira Travessa ...", "1a Avenida ...") and "Vila ..." through, so match ordinals too. When a
city ends with almost no real trail (OSM has close to none around Salvador), ship none for it and
say so; do not pad the list. Show the counts per class to the owner and get a yes on the filter
before you build the file that the site reads. Never rank "top bairros by trail km" from the unfiltered mix.

## 4. Output shape

One file per area, grouped by bairro (OSM relation id), then by trail name, each trail with
`length_km` (haversine over the node list), `difficulty` (`sac_scale`, verbatim or null), `surface`,
and the geometry as lines. Add the municipality IBGE code, the licence line and the OSM base
timestamp. Keep raw files next to the derived ones so the filter can be re-run without a new fetch.
Ask where the files live (marola-oods keeps versioned data); do not commit them to a site repo on
your own.
