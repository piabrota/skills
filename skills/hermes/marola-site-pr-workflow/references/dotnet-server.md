# The .NET server of marola-site (ASP.NET Core in F#, behind nginx)

Depth for the server half of the rewrite: the process that replaces the static host. Read it before you write
an omp task for server work.

## Shape

- `Microsoft.NET.Sdk.Web`, F#, minimal APIs. No Giraffe, MVC or Razor: fewest packages. Kestrel listens on
  `127.0.0.1` only; nginx faces the world and owns TLS. Target `MemoryMax=256M`; the process starts near 75 MB.
- The pinned nixpkgs SDK carries the ASP.NET targeting pack offline, so only NuGet packages need the network.
  Prove this in a spike step first and stop with `OPEN:` if it fails.
- Tests use Expecto with `Microsoft.AspNetCore.TestHost`, like the client tests. Add a smoke script that starts
  the real server on a random port against `app/dist` and checks headers with `node` `fetch`.

## Rules that cost time

- Set every security header in ONE `OnStarting` middleware, so 404, 405, 429, 500, HEAD and 304 carry them too.
  Test each status. Kestrel's own 400 for a raw NUL path (`/%00`) never reaches middleware: cover NUL in the
  in-memory test as a decoded path, and put `add_header ... always` in nginx for what Kestrel answers itself.
- The CSP value comes from `Csp.policy ()` in `app/Shared`, plus `form-action 'self'` once a form posts to the
  server. One source, never a second copy in nginx.
- `Microsoft.Data.Sqlite` pulls `SQLitePCLRaw.lib.e_sqlite3` at a version with a known CVE, and restore fails
  with NU1903 under warnings-as-errors. Add a direct reference to the newer lib package and record it in the ADR.
- Rate limits key on the client address from `X-Forwarded-For` ONLY when the peer is loopback, and nginx must
  REPLACE the header (`proxy_set_header X-Forwarded-For $remote_addr`), never append. Test that a spoofed
  header from a non-loopback peer is ignored.
- A static page cannot carry a CSRF token. Check `Origin` (or `Referer`) against `Host`, fail closed when both
  are missing, and make nginx pass `Host $host`.
- Log without IP, query string or body (LGPD). Static roots are an allowlist: no dotfiles, no listing, tests for
  encoded dots, backslashes, double slashes and NUL.
- A form that posts to the server breaks on the old static host until the server runs there: say so in the PR.
- Tell omp to write its progress file to an ABSOLUTE path outside the repo; see the F# reference.

## What the board holds

- Contact messages go to SQLite and are read with a CLI subcommand on the box (`inbox`, `inbox --delete <id>`).
- Study intake (PDF upload from anyone, public at once): stream the body to disk while hashing SHA-256, never
  buffer it; store as `<sha256>.pdf` outside the static root; check `%PDF-` and `startxref`/`%%EOF` in the tail;
  refuse `/Launch`, `/JavaScript`, `/JS`, `/EmbeddedFile` and an `/OpenAction` that is an action, scanning PDF
  NAMES with `#xx` escapes decoded (so `/J#53` is caught). Also inflate every `/Type /ObjStm` stream
  (`ZLibStream`, cap 32 MB per stream and 128 MB per file, scanned through a buffer, never built whole) and run
  the same name scanner over it. Refuse `/Encrypt` (`pdf_encrypted`) and any object stream that is not Flate,
  does not inflate or passes a cap (`pdf_unscannable`): a skipped ObjStm lets an action into an upload that is
  public at once. Plain image and font streams stay unscanned; say so in the ADR. Prove it with a mutation (scan
  off, the ObjStm tests fail) and with real tool output (below). Serve the file with `Content-Security-Policy: sandbox; default-src
  'none'` (replaces the page CSP on that route), `nosniff` and `Content-Disposition: inline`.
- Raise the body limit per upload endpoint only (Kestrel keeps 1 MB elsewhere). A smoke upload that is refused
  before the body is read (401, 429) breaks on a large file: send a small stub file for those cases.
- API keys: random, shown once, only SHA-256 stored, constant-time compare, a cap per account. A dev-only CLI
  that mints an account must refuse unless an explicit env flag is set.
- Review omp's security code by reading the filter itself (the byte scanner, the key compare, the route
  headers) and by grepping for the obfuscation and encoding cases; a green test count does not show them.
- The pre-push hook re-runs the whole `just quality` chain (minutes): give the push `timeout` 590 and read the
  last lines only.
- Split submission work: C3a core and API (domain, store, intake, limits), C3b login, sessions, CSRF token and
  pages, C3c board CLI (hide/unhide), privacy page, feed. One omp run fits one of them.
- A study submission feature needs GitHub OAuth. The client id and secret live on the box, never in the repo or
  a task file; the owner registers the OAuth app. Build the code path with an environment variable and a stub
  for local runs.
- Login with GitHub (web flow, EMPTY scope): read only id, login and account creation date; keep the access
  token in a local variable of one request and drop it. The client secret comes from a FILE path in an env
  variable (fits systemd `LoadCredential`), never from the env value, and is never logged. Without the config the
  login route answers 503 and the rest of the site works.
- Sessions: random 32-byte cookie `__Host-msess` (HttpOnly, Secure, SameSite=Lax, Path=/); store only its SHA-256;
  absolute lifetime; logout is a POST. Put the CSRF token in a hidden field as an HMAC of the session hash with a
  key made at first start next to the database (mode 0600), and compare in constant time. A dev switch
  (`MAROLA_DEV=1`) may drop `Secure` and the prefix for plain-HTTP tests; it must also be the ONLY mode that
  lets the GitHub URLs be overridden, so a fake GitHub works in tests and cannot be pointed at in production.
- Prove the flow with a fake GitHub in the smoke script (real redirects, a cookie jar), a POST without the token
  (403), a POST with a foreign Origin (403), and a grep of the server log for token, code, secret and address.
- Probe the pages on a real server with no GitHub configured: public pages 200, account page redirects to login,
  login 503, unknown ids give the 404 page, every response carries the CSP, and the page has no script or inline
  style.
- A scan that only passes hand-built test PDFs proves nothing about false positives. Build real files with
  the TeX Live env in the Nix store (`/nix/store/*-texlive-*-env/bin/pdflatex` and `xelatex`; both write
  `/ObjStm`), mint a key with `marola-server dev-account --login x --age-days 30` (`MAROLA_DEV=1`, same
  `MAROLA_DB` as the server), and POST them with node `FormData` and `?dry_run=1`, then once for real. The key
  is `msk_` plus LOWERCASE-capable base32: match `msk_[A-Za-z2-7]*` or you send a truncated key and read 401 as
  a bug. Then hide, read the tombstone, unhide through the board CLI on the same db. Never print the key.
- Set `NIX_CONFIG="experimental-features = nix-command flakes"` in scratch scripts. Putting the feature list
  inside a quoted `--extra-experimental-features` variable breaks word splitting.
- Nix package of the whole site: `nix/package.nix` as a `callPackage` function (the nix-os repo builds it with
  its own nixpkgs), `buildDotnetModule` with the server as `projectFile` and the page builder and Fable client
  as `testProjectFile` so `fetch-deps` locks their packages too, `nugetDeps = ./deps.json`. Run the package's
  `fetch-deps` with an explicit output path (the flake copies the tree to the store). The sandbox restore cannot
  honour `RestoreLockedMode` (NU1004 with `--runtime`, NU1403 on repacked nupkgs): set it false in the
  derivation, let the hashes in `deps.json` pin every package, and keep the lock files enforced in the dev
  chain. Say this in the package comment and the commit.
- Reproducibility is measured, not claimed: `nix build --rebuild`. Fable's `project_cracked.json` holds a random
  NuGet temp path, so delete it in `postBuild`; `security.txt` carries the build day. Report size, closure
  (`nix path-info -S`) and the packaged server's resident memory (about 91 MB after four requests, so give the
  unit more than 100 MB). Check that the package also builds with the nix-os nixpkgs, whose Fable can be older.
- Vendor a file from another repo by pinned commit: `gh api repos/<o>/<r>/contents/<path>?ref=<sha> -H
  "Accept: application/vnd.github.raw"`, then prove it is the same object with `git hash-object <file>` equal to
  the API's `sha`. Store the blob id next to the commit pin and add a check that fails when the file drifts. A
  workflow that writes the pin lives in `.github/` and is the owner's to change: list it as an owner step.
- The hosting module lives in a separate nix-os PR that the owner merges after DNS exists.
