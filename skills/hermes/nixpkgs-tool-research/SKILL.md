---
name: nixpkgs-tool-research
description: Use when asked for a Nix tool or a pinned package.
disable-model-invocation: true
---

# Researching and adding a tool for the nix-os hosts

Extends `nixos-vps` (read-only, in the store). Load both. Read-only research needs no omp; the PR that adds the tool goes through `hermes-omp`.

## 1. Look at the rev the hosts really build
The registry `nixpkgs` on this box differs from the one in `flake.lock`: a build or a `nix run nixpkgs#x` there gives another version. `flake.lock` also holds several nixpkgs nodes (one belongs to the `hermes-agent` input), and the node named `nixpkgs` is NOT the one the hosts use. Resolve the root input, never a node name:
```
REV=$(gh api repos/piabrota/nix-os/contents/flake.lock --jq .content | base64 -d | jq -r '.nodes[.nodes.root.inputs.nixpkgs].locked.rev')
N="nix --extra-experimental-features nix-command --extra-experimental-features flakes"
$N eval --raw github:NixOS/nixpkgs/$REV#<pkg>.version
$N eval --json github:NixOS/nixpkgs/$REV#<pkg>.meta | jq -c '{description,license,unfree}'
$N path-info --store https://cache.nixos.org -S -h "$($N eval --raw github:NixOS/nixpkgs/$REV#<pkg>.outPath)"   # closure size from the cache
P=$($N flake metadata --json github:NixOS/nixpkgs/$REV | jq -r .path); ls $P/nixos/modules/services/monitoring   # which NixOS modules exist
```
Use the terminal tool (the `nix` tools do not resolve in `execute_code`). A package that errors with "does not provide attribute" is not in that rev.
Then read the module file in `$P/nixos/modules/...` (options, `package` option, hardening, `DynamicUser`, `environmentFile`) before you promise a design. Print the version of the first eval and check it against the lock before you quote any option name or size to the owner.

## 1b. Check the tool does what the owner wants to watch
Read the tool's source at the version you will pin and state what it collects and how often (the file and line). If it falls short of what the owner said he wants (for example a snapshot every 10 minutes where he wants a live value), say so in the chat and in the PR, and name the cheaper fallback and the heavier alternative with their cost.

## 2. Judge it against the budget
Compare closure size, resident RAM and daemons per host. Say what you measured and what you took from experience; do not give a RAM figure you did not measure. Compare with the tool the owner named (for example Grafana 536 MiB closure) in one small table.

## 3. Two hosts: piabrota (KVM 1, 4 GB, web only) and piabrota2 (KVM 4, Hermes)
- One module file, imported by `configuration.nix`, with `piabrota.<name>.*` options, all off by default. Each `hosts/<name>/default.nix` turns on its own role. A host that does not run the server gets no nginx, ACME or port from the module.
- Server on piabrota2, client or agent on both. The small host dials out; it opens no port.
- A new name needs its DNS A record before the merge, or the ACME order fails and deploy-rs rolls the switch back. The DNS is at Porkbun and the owner sets it. Give him the exact record and the address: `dig +short` an existing name on the same box (`rig.piabrota.art`) and quote it.
- A gate in front of a service must not stop the machine that connects to it: no nginx basic auth in front of an endpoint that an agent on the other host uses; use the service's own login and token.
- Keys and tokens live in an env file on each box, written by hand. Add `ConditionPathExists` on the unit so a missing file does not fail the deploy.
- The owner dislikes manual steps. Before you hand him a setup list, sort every value: a secret stays on the box; a public value (a public key, a display name) goes in the PR as an option; and prefer a design with no secret at all (see section 5). Count the manual steps in the PR body and cut them.
- Describe a tool's UI steps only as far as its docs or source confirm. Where you are unsure of a label, say "if the page offers ...". When the owner reports another screen (other tabs, other buttons), take his words over the docs and rewrite the steps for what he sees. Tell him what to copy, and say plainly what NOT to run (an install script that installs outside Nix).
- Names: a tool that names a system from its hostname shows `nixos` on piabrota2 until its next reboot (`/etc/hostname` already says `piabrota2`). Set the display name from an option, never from the hostname.

## 4. A pinned version newer than nixpkgs
When the owner asks for a pinned version:
- Put `version`, source `hash` and the build hashes (`vendorHash`, `npmDepsHash`) at the top of one `<tool>/package.nix`, like `openrig/package.nix`. Start from nixpkgs' own derivation (credit it, MIT) and set the module's `package` option to it, so the server and the agent are one derivation.
- Prove the hash method on the OLD pin first: the hashes you compute for nixpkgs' version must equal nixpkgs' own. Only then trust them for the new tag.
- A pin newer than nixpkgs is not in `cache.nixos.org`: it builds on the GitHub runner of `deploy.yml`, not on the VPS. Give the build time and the peak memory.
- A module of the locked nixpkgs can be older than the pinned tool: its `ExecStartPre` or flags may name a command the new version dropped, and the unit would never start. Run each command of the module against the built binary, and `mkForce` the fixed list in your module.
- Write a `pkgs.testers.runNixOSTest` check that boots the module with nginx on one VM (agent skipped without its file, login limit, the agent connecting through nginx). It found the real faults that an eval did not.
- Do not add a daily bump job unless asked.
- Open the PR as a draft when the merge needs a step first (a DNS record, a first admin account): put those steps, in order, at the top of the PR body.

## 5. The owner finds the tool too complicated: build a minimal one
When he asks for "a basic view" instead of a product (processes, memory, vCPU per host), do not tune the tool: replace it. The pattern that fits the two hosts and needs no compiler, daemon or secret:
- **Collector**: one POSIX `sh` + `awk` script reads `/proc` and `/sys/fs/cgroup` and writes one JSON file atomically (temp file, then `mv`). A systemd timer runs it every 10 s as a oneshot, so nothing stays resident. Take the display name from an option. `PROC_ROOT` and `CGROUP_ROOT` variables let a test point it at fixtures.
- **Per-unit memory against its limit**: list `*.service` under `system.slice` whose `memory.max` is a number, with `memory.current` and `memory.peak`. It answers "how near is hermes-agent to its 8G", which snapshot tools do not.
- **Page**: one static `index.html`, vanilla JS, inline CSS, no external request, under about 20 KB, in the look of `site/DESIGN.md`. It polls the JSON and marks a host offline when the file is older than 30 s. Put every string in the DOM with `textContent`: process names are data from the box.
- **Escaping and privacy**: the awk script must escape backslash, quote and control characters, and the test must show a naive escaper breaking `jq` on a hostile process name. Output `comm` only, never a command line (it can hold a secret). Parse `/proc/<pid>/stat` after the LAST `)`.
- **Auth with no new secret**: nginx basic auth against the file the Hermes dashboard already uses (as the rig UI does).
- **Small host to the big host with no secret**: the small host serves its own JSON on one location of its existing vhost, allowed only for the big host's public IPv4 (`allow <ip>; deny all;`); the big host pulls it with `curl -4` on a timer and keeps the old file when a pull fails, so the page shows stale, then offline. State the limit in the docs: anyone on that address can read it, so the JSON holds nothing secret.
- Replacing a deployed tool in the same name: the PR removes the old units and package; its data stays on disk, so the docs give the one `rm` command for the owner.
- Then open the page in a real browser (the `browser_exec` tool, fixtures for healthy, stale, missing and hostile cases) before you open the PR, and report what you saw. Serve each fixture case from its own scratch dir on its own port (the page fetches absolute `/data/` paths, so one server cannot hold four cases). The terminal has no `python3`: start `[sys.executable, "-m", "http.server", port, "--directory", dir]` from `execute_code`. Start the servers in one `execute_code` cell and clean them up in another: a cell that also calls `os.kill` is flagged and asks the owner for approval, and unattended it is refused with "do not retry by another tool" (obey it; the servers die with the kernel). If `browser_exec` reports that Chromium is not installed, use the Chromium that the `docs-figures-and-wiki` reference of `piabrota-owner-workflows` builds from Nix for a headless screenshot; if you cannot get one, open the PR as a DRAFT, say plainly that nobody has looked at the page, and give the owner the preview recipe (`just metrics-preview` or the equivalent) instead of calling the page done.
