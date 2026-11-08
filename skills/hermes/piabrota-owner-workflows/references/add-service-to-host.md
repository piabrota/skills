# Adding a self-hosted web service to a nix-os host (behind nginx, like the Hermes dashboard)

For "host X on <name>.piabrota.art" after the costing answer (`model-routing-and-surveys.md`) and
the owner's yes. The pattern to copy is `hermes-web.nix` on nix-os `main`
(`git show origin/main:hermes-web.nix`): read it before you write the task file.

## Before the task file

1. **Confirm the hostname with DNS-over-HTTPS** (`curl -s 'https://dns.google/resolve?name=<fqdn>&type=A'`).
   If the whole registrable domain answers NXDOMAIN, it is a typo: use the owner's real domain next
   to the sibling service (the sibling's A record gives the box IP), say so once in chat, and go on.
   Do not ask twice.
2. **The A record is the owner's step and comes before the merge**, or the ACME order fails on the
   deploy. Put it in the chat and in the PR body.
3. **Branch from `origin/main`**, not from the branch the workspace clone sits on:
   `git fetch --depth 1 origin main`, then `git switch -c hermes/<slug> origin/main`.

## Shape of the module

- `piabrota.<name>.enable` with a `domain` option; imported only in `hosts/<host>/default.nix`.
- The service binds to `127.0.0.1`; the firewall opens only 80 and 443 (nginx).
- nginx is the gate, as for Hermes: `forceSSL`, `enableACME`, `basicAuthFile` pointing at a string
  path outside the store (`/var/lib/<name>-secrets/htpasswd`, written by hand on the box; without it
  every request is a 500), `limit_req`, the Origin check, the four security headers.
  If the app has its own login, keep both gates and say which one the owner meets first.
- Secrets (auth secrets, API keys) go in an env file on the box under `/var/lib/<name>-secrets/`,
  loaded with `EnvironmentFile`; never in the module (the store is world-readable). Say in the PR
  which keys the file needs and that the service stays down or refuses to start without it.
- Something every vhost must serve (a favicon, a security.txt): one small module that exposes a `locations`
  set, and one line in each vhost (`locations = config.piabrota.<x>.locations // { ... }`), so a new vhost gets
  it by the same line. Serve a third-party app's asset on the path its own HTML names (read its built
  `index.html`); use `sub_filter` only when the app names none, because it needs the upstream
  `Accept-Encoding` stripped. An `add_header` inside a `location` drops every header of the server block and
  NixOS's nginx check (gixy) fails the build: repeat the standard headers in that location.
- `MemoryMax` and `CPUQuota` or `CPUWeight` on the unit, and systemd hardening (skill
  `systemd-hardening`). A database the app needs is a real `services.postgresql` limited to that app
  only when the owner accepted it; PGX is for data you can lose.

## Packaging from a community source

- Fetch a pinned file with `gh api 'repos/<o>/<r>/contents/<path>?ref=<full sha>' -H 'Accept:
  application/vnd.github.raw' > file` into a directory of the repo (`<name>/`), the way `omp/` and
  `pgx/` hold their packages. omp cannot fetch; Hermes copies data files (lockfile, hashes) byte for
  byte and omp edits the `.nix`.
- The header of the `.nix` credits source, commit and licence. Remove the source repo's updater,
  `flake` and `maintainers` arguments so `callPackage ./<name>/package.nix { }` works. Expose it as
  `packages.x86_64-linux.<name>`. Add no flake input and do not touch `flake.lock`.
- A licence file you cannot read from the source is not invented: say in the PR that the header
  names the licence and that the owner may add the file.

## Packaging a Node (npm) app

- **Never test by installing.** Your deny list blocks package managers that fetch code (`npm
  install`, `npx`, `pip install`), including a throwaway install in a scratch folder. A block is a
  rule: do not try `npm pack`, a `curl` of the tarball or another route. Write the same ban in the
  task file for omp ("Nix only to fetch and build"), because omp's own rules do not see yours.
  Fetch inside Nix (`fetchFromGitHub`, `fetchNpmDeps`), then run the *built* files.
- **Build from the source tag when the repo has a root `package-lock.json`.** The npm tarball has
  no lock file, and making one needs `npm`. Read the project's own release script
  (`scripts/build-package.sh`) and repeat its steps as Nix phases. Try the build without an
  optional heavy part (a web UI in maintenance mode) first, and report which choice worked and
  its size.
- **Native modules** (`better-sqlite3`) compile from source in the sandbox (`python3`,
  `pkg-config`, node headers); no prebuilt download. Use `lib.fakeHash` for `src` and `npmDeps`,
  read the real hash from the failure, never invent one.
- **Long builds** go detached (`setsid nohup nix build ... > log 2>&1 &`) and are polled with
  short calls; a foreground run killed at the 600 s limit keeps the derivations it finished, so a
  rerun continues.
- **Smoke test** the built daemon in a scratch `HOME` and `*_HOME` on a free port: it must bind
  loopback, answer the project's own status command, and you record its RSS. Stop it by the PID
  you started.
- Run the unit's sandbox in user mode (`service-check.md`, step 9) and keep `AF_NETLINK` in
  `RestrictAddressFamilies`: Node and tmux need it.
- **A shell the unit starts (a tmux pane, a pty) does not get the unit's `path`.** Read how the
  daemon starts the pane before you pick a fix (`references/openrig-seat-environment.md`). A test
  with the system bash alone is not proof: it showed a fix that did nothing on the real box.

## A web UI in front of a daemon that controls agents

For "deploy the UI at <name>.piabrota.art" (a tool whose UI can type into running agents):

- **Auth first.** The vhost needs basic auth plus TLS, and an option that defaults to off. Reuse the
  sibling dashboard's htpasswd file (`/var/lib/hermes-web-secrets/htpasswd`, root:nginx, readable by
  nginx) as an overridable path when the owner wants the same login: the deploy then works with no
  manual file, and a separate file stays a one-line change. Never write or ask for a password.
- **Give the owner the login commands**, since only root can write the file. List users (names
  only): `sudo cut -d: -f1 <file>`. Add a user or reset a password, with no `-c` because `-c`
  overwrites the file: `sudo nix shell nixpkgs#apacheHttpd -c htpasswd -B <file> <user>`, then
  `sudo chown root:nginx <file>` and `sudo chmod 0640 <file>`. nginx reads the file on each request,
  so no reload is needed. The file cannot be read by Hermes: say you do not know its users.
- **DNS before the merge.** `dig +short A <fqdn> @1.1.1.1` must already give the box IP, or the ACME
  order fails on the deploy.
- **The daemon checks Host and Origin.** Read its browser-boundary middleware and put the public name
  in its allowed hosts and origins (`https://<fqdn>`), or the proxied UI gets refused. A tunnel to
  `localhost` needs neither.
- **Proxy the WebSocket** (upgrade headers, long read timeout) or the terminal pane stays blank.
- **Build the UI from the pinned source**: the daemon serves it from a fixed `ui/dist` beside the CLI
  package, behind a setting that is off by default (an env switch in the unit turns it on). Report
  the closure growth and that upstream may keep the UI in maintenance mode.
- The owner's order to deploy at a name means the vhost is turned on in the host file in the same
  change. A first draft that leaves it off needs a second small omp run to flip it.

## A service that spans both hosts (a hub and agents, such as monitoring)

nix-os has two hosts, and a service that watches both is easy to design for one. State in the first
reply and in the task file which host runs which part, and treat the small host's RAM as the budget.

- **One module, imported by `configuration.nix`, everything off by default.** Options per role
  (`hub.enable`, `agent.enable`, `agent.hubUrl`, `agent.environmentFile`); each `hosts/<name>/default.nix`
  turns on its own role. The big host runs the hub and an agent. The small host runs the agent only,
  and the agent dials out: no port, no nginx and no ACME on that host. Prove it with a before/after
  toplevel drv of each host: the module off equals `main`, and the small host's growth is the
  agent's closure only.
- **No basic auth on a vhost that a remote agent must reach.** The gate would stop the agent. Use the
  tool's own login and the agent's token, and say so in the PR.
- **Agent secrets (key, token) live in an env file on each box, written by hand**, and the unit gets
  `unitConfig.ConditionPathExists` on that file: a deploy before the file exists then starts nothing
  and fails nothing. The first admin account of a hub is created in its web UI: tell the owner to do
  it right after the first deploy, and read the hub's environment options to close open sign-up
  (use only options found in the docs or source).
- **Read the agent's source for what it collects before you promise a metric.** A dashboard that
  lists systemd units may show status only. The owner wants memory of a unit against its
  `MemoryMax`: if the agent does not collect that, say so with the file and line, and name the
  fallback (`kvm4-health`) and the heavier alternative with its measured closure.
- **Measure the real binaries in a scratch dir**: idle RSS from `/proc/<pid>/status` (`VmRSS`) on free
  high ports for 60 s, stopped by the PID you started. Size `MemoryMax` from it, small on the small host.
- The owner's DNS step (an A record to the big host's address, found with `dig +short <sibling>`
  of a service already on it) comes before the merge, as in the checklist above.

## Order of omp runs

One omp at a time, in this order, because each task depends on facts only the earlier build shows.
Write the later task files while the first run works, and start each from the completion turn.

1. Package, flake attribute, `nix build` of that attribute, and written answers (certain, likely,
   unsure) from the built `dist/` about: the headless start command, whether it needs a config file
   or only environment variables, a plain `node` entry file, and what it refuses at start in
   `authenticated` mode. Tell omp not to start the server; do the smoke test yourself after (or
   allow a scratch-port start for a daemon you must measure).
2. Module, host wiring, docs, AGENTS.md file-table row (and the existing research doc that says
   "do not run it" is rewritten, in the same PR, English only if the owner said so). Deny-list
   rules for the commands the agent must never run on the new tool go in
   `hermes/dangerous-patterns.yaml` in this run: add rules, remove none.
3. When the owner wants Hermes to operate the tool, the operating skill (below), checked against
   the built binary.
4. A review run by omp that edits the branch directly (`omp-harness.md`, "The review should change
   the code directly"), then your own diff read, checks and a separate commit, then the PR.

If the tool takes declarative team or agent specs (a rig, an agent folder), create them in run 2 as
files in the repo (`<name>/specs/`), written fresh and not copied from the tool's examples. The
module installs them read-only under `/etc/<name>/specs` and starts nothing; the tool's own
plan/validate command checks them against a scratch daemon and home; the operating skill points to
these files and shows how to add an agent, change a role and validate, with no second example.
Use only the runtimes installed on the box. A tool's plan or validate command can pass while a
file the spec names is missing (delete one and re-run to see): check every referenced path with a
script too, and say in the docs what the command does not check.

Grep the built bundle with `-o` and a short context; never print a multi-megabyte file.

## The operating skill for a third-party tool

The owner wants the tool's documentation *inside* the skill, so Hermes can operate it without the
web. Source: a shallow clone of the release tag in the workspace (read only) plus the built
binary's real `--help`.

- Summarise in your own words for an operator; do not copy paragraphs or tables. A quote of at most
  about 15 words is fine for an exact flag or error. `SKILL.md` has an Attribution section (author,
  licence, link, version read, "summarises, does not copy"), and each reference ends with a
  `Source` line (doc file or command, version).
- Layout: `SKILL.md` under 200 lines (rules, five common jobs, which reference to open);
  `references/` with commands, concepts, spec format with one validated example, runtimes, an
  operations runbook, safety, troubleshooting.
- Mark each command allowed, needs the owner, or denied for Hermes, matching the deny list and the
  module design (systemd, not Hermes, starts the daemon).
- Check mechanically: a script that takes every command and flag named in the references and finds
  it in the real `--help` tree; label anything taken from docs and not run as "from the docs, not
  run".
- Say which runtimes work on this box (only those whose CLI is installed; the unfree `claude` is
  not) and give the seat count that fits the unit's `MemoryMax`.

## Making a resident tool automatic ("as automatic as possible")

The goal: after the merge and the deploy, no manual step for the owner or Hermes. Design it as
three small pieces and list what stays manual in the docs, each with its reason.

- **Start by itself.** A companion oneshot unit (`RemainAfterExit`, `After`/`BindsTo`/`PartOf` the
  daemon unit, `WantedBy=multi-user.target`, `Restart=no`) waits for the daemon in a bounded loop
  (about 120 s), then starts each rig from a declarative list option (default empty, the host sets
  it). It restores from a snapshot when one exists and starts from the spec file otherwise, so a
  second run leaves one rig, not two. `PartOf` makes a deploy restore the rig by itself.
- **Survive a deploy.** `ExecStop` (best effort, `-` prefix, a bounded `TimeoutStopSec`) snapshots
  the rigs before systemd ends the cgroup. Add a periodic snapshot timer only if the tool can
  snapshot without stopping the workers; if it cannot, skip the timer and say so.
- **Know its health.** Extend `kvm4-health` (or a tiny separate script when it is more than about
  30 lines) to print the worker states read-only, and warn when one is not ready after 5 minutes.
- **Do not automate an update.** The version is a pin; document the three lines that bump it.
- **The first live check** that needs the real credential is a runbook for Hermes to run once
  after the first deploy (harmless task to a worker, a read of the secrets folder that must be
  refused), never a step the task file performs with a copied secret. If a worker cannot run tools
  without a prompt, the runbook says stop and report: the one-line policy change is the owner's
  decision, written with the argument for and against.
- A tool may start workers with a scrubbed environment (read the runner's allowlist in source
  before you rely on `EnvironmentFile`); the shim that starts the worker then reads the narrow
  token file itself, and the docs say so.
- A new secrets folder gets its own entries in `hermes/omp.yml` (`restrictedFolders` and a bash
  deny pattern) in the same PR; a diff review that reads only the module misses it.

## Memory numbers in an answer

A sum of `MemoryMax` values is a ceiling, not a use. When the owner asks whether the box is full,
answer with `free -m` and `MemoryCurrent` / `MemoryPeak` per unit next to the caps, and never say
"only N GiB left" from a sum of caps. A tmux server and every seat it starts live in the unit's
cgroup, so that unit's cap is the budget for all of them. Size a new unit's cap from measured idle
use plus the worker count you plan (idle daemon, then one worker each), not from a round default,
and state the sum of caps before and after in the PR: the owner turned a service off once because
that sum looked too large, even though real use was a fraction of it.

## Turning a service off

For "remove it for now": flip the module's `enable`, keep the code and the import, prove with a
before/after host eval (`omp-harness.md`, "Turning a module off"), and list data left on disk with
the erase commands marked destructive. The PR says it deploys and reloads Hermes.
When the owner then reports "merged", read `gh pr view <n> --json state` again before you act:
the state can still read OPEN, and then you say so instead of assuming.

## Removing a service for good ("take it out of the repository")

For "remove X and every trace" after an earlier PR replaced it. Start from `origin/main`, not from
memory: `git grep -il <name>` and `git ls-files | grep -i <name>` show what is really left; the
replacing PR often removed all code and only a docs section remains. If only Markdown remains, edit
it by hand (say so), in both languages with the same headings, and keep the other sections. The
body lists the data still on the box with the erase commands marked destructive for the owner to
run, says the old commits keep the name (no history rewrite, no force-push), and says what stays
because something else uses it (a DNS name, an nginx host). Offer to sweep the other repositories;
do not do it unasked. A docs-only merge does not deploy.

## Publishing another repo's generated files at a new subdomain

For "bring the alerts of repo X to <name>.piabrota.art": the service is a generator, not a server.

1. Resolve the repo and the name against the owner's repo map and `gh api repos/<o>/<r>`; the owner
   may correct a typo in the repo name or domain, so state the spelling you assume in the reply.
   Check the DNS record with `dig +short A <fqdn> @1.1.1.1`: an empty answer goes in the reply as
   the owner's first step, with the question of which host it points to.
2. Split the work in two PRs in two repositories. The app repo gets a command that writes static
   files (page, feed, JSON, a health file) from its own database, with no network; the page
   escapes every source string, uses no script or external resource, and never invents text the
   source did not state. Serving it (nginx vhost, ACME, a timer that runs the poll then the
   publish command, `ReadWritePaths`) is a nix-os PR that follows. Say in the first reply that the
   second PR is a separate step.
3. Read the repo before you write the task file, without cloning more than needed: `gh api
   repos/<o>/<r>/git/trees/HEAD?recursive=1`, then the README, the hosting doc and the entry point.
   Reuse the existing writer (a `write_feed` function) instead of a second feed code path.
4. A Rust workspace has no `cargo` on this box: the task file tells omp to use `nix develop
   --command`, `CARGO_BUILD_JOBS=2`, a `CARGO_TARGET_DIR` under the workspace or scratch (never
   in the repo), only the crates it touches, and to stop a build after 12 minutes and report what
   it could not run.
5. Queue the omp run behind a running one (one omp at a time): finish the repo read, the task file
   and the branch while it works, and start it from the completion turn.

## Wiring the service to Hermes and its Claude token (the Paperclip pattern)

- Only an adapter whose CLI exists on the box can run. One that starts a proprietary CLI
  (`claude`) is unfree and unsupported (`allowUnfree` is off): do not package it. Say so, and offer
  the omp route (`omp-harness.md`, "Wrapping omp").
- A peer that calls the Hermes API server needs `API_SERVER_KEY` in `hermes.env`. NixOS activation
  copies that file into Hermes's `.env`, so after the owner adds the key he runs
  `switch-to-configuration switch` and then `systemctl reload hermes-agent`: a reload alone loads
  nothing. The key is also pasted into the peer's UI. Ship one helper command that appends the key
  once and prints it only with `--show`; never ask for the key in chat.
- A PR that edits `hermes/omp.yml` reloads Hermes at the merge: say so in the first lines of the
  body, with the deploy warning.
- Before you open the PR, reproduce the unit's sandbox with the real command (`service-check.md`,
  step 9), and list in the body what that user-mode test cannot cover.

## In the PR body

Deploy first: "this merge deploys piabrota2 and adds a resident service". Compare the system
derivation of every host before and after: the public site on the other host lists the packages of
piabrota2, so a new command can change that host's derivation too; say "this deploys both hosts"
when it does. Then: the DNS record,
the files the owner must create on the box (htpasswd, env file), the rules of AGENTS.md the change
breaks and that the owner accepted, the closure difference or that it was not measured, rollback
(revert the PR; remove `/var/lib/<name>` and the database by hand), and what did not run.
