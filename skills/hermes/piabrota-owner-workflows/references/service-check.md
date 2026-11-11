# Checking that a deployed service works (units, HTTP, journal, integration)

For "check if X is working correctly" after the owner merged a service into a nix-os host. All
steps are read-only. Run them from a neutral directory (a command inside a repo reloads its
AGENTS.md into the output).

1. **Is it deployed?** `gh pr view <n> --json state,mergedAt` for each PR, and `gh run list
   --workflow deploy.yml --limit 2`. A green run proves the build and the switch, not the service.
2. **Units.** `systemctl show <unit> ... -p ActiveState -p SubState -p NRestarts -p MemoryCurrent
   -p MemoryMax`. `NRestarts` counts since the unit last started, so a deploy resets it: a restart
   loop that healed shows 0. Count the loop in the journal instead: `journalctl -u <unit>
   --since <deploy time> | grep -c 'Failed with result'`, and read the first and last time stamps.
3. **DNS and TLS.** `dig +short A <fqdn> @1.1.1.1` against the box IP; `curl -s -o /dev/null -w
   '%{http_code} %{ssl_verify_result} %{time_total}'` on the public URL. Without `dig`, ask a DNS-over-HTTPS
   resolver (`curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=<fqdn>&type=A'`).
   **A certificate warning on a new name** ("all the new addresses have certificate errors"): for each name
   read the issuer (`curl -svk ... 2>&1 | grep issuer`). A `minica root ca` issuer is NixOS's self-signed
   placeholder: the ACME order has not succeeded, and nginx serves the placeholder. Then compare the A record
   with the host that has the vhost in the config (two hosts can serve one domain; the wrong one answers with
   its default vhost and shows another site's title). Then read `journalctl -u acme-order-renew-<fqdn>`: the
   wrapper's "Failed to fetch certificates" line hides the real ACME error, so say that you cannot see it. A
   record that was missing at the order time and fixed later needs a new order: the owner starts
   `acme-order-renew-<fqdn>.service` (a root action; check the repo's `just` recipes for a cert-fix command)
   or waits for the retry timer. Port 80 answering 404 on `/.well-known/acme-challenge/x` shows that the
   challenge path is reachable.
4. **Health.** The public and the loopback health URL (`/api/health` or the app's own). Read the
   whole JSON: a `warnings` list can sit next to `status: ok`. A first-day "no backup yet" warning
   is expected; say to recheck after the schedule, and do not read the backup folder.
5. **Ports.** `ss -ltnH | awk '{print $4}'`. Expect only nginx on `0.0.0.0:80/443`, the app on
   `127.0.0.1`, the database on a socket. A closed port of a peer service (for example the Hermes
   API server) explains an integration that fails.
6. **Journal, summarised in code.** The app logs JSON: `journalctl -u <unit> -o cat --since <t>`,
   then in `execute_code` count `level >= 40` entries by `msg` or `err.message`. Print the counts
   and one example, not the stream. For a restart loop, read the lines just before the first
   `Failed with result` ; the first error of the first failed start is the cause. Errors after it (a database
   `CONNECTION_ENDED`, a pool teardown) are usually fallout of the process exiting. Before you name
   a cause, list the owner's recent merged PRs (`gh pr list --state merged --limit 5`): a fix may
   already be in, such as a sandbox that blocked a socket family.
7. **Hardening added without a test** (a syscall filter, a capability drop): search the unit journal
   and `journalctl -k` for `EPERM`, `seccomp`, `Operation not permitted`. No hit while the app
   serves requests is evidence; say it is not a proof.
8. **Integration failures.** An error code in the app log (a failed verify of an agent) is a
   symptom; find the peer's side with the port check. The env file is unreadable to you and the
   deny list blocks even a `grep -c` on it, so name the missing key as inferred from the closed
   port and the doc, give the owner's steps from the service doc, and never ask for the key in chat.
9. **Reproduce the sandbox before you blame it, or a tool inside it.** `systemd-run --user` takes
   a system unit's hardening keys. Build the unit file (`nix build
   'path:$PWD#nixosConfigurations.<host>.config.systemd.units."<name>.service".unit' --no-link
   --print-out-paths`), read its `Environment="PATH=..."` and command variables, then run the real
   command with the unit's keys as `-p` (`NoNewPrivileges=yes`, `SystemCallFilter=...`,
   `SystemCallErrorNumber=EPERM`, `CapabilityBoundingSet=`, `RestrictAddressFamilies=...`), the
   unit's PATH as `-E PATH=...`, and `-E NAME` with no value to pass a secret from your own
   environment without printing it. Always add `-p RuntimeMaxSec=90`, a `timeout`, and
   `< /dev/null`: a child that reads stdin hangs the call, and a timed-out client leaves the unit
   running. Mount-namespace keys (`ProtectSystem`, `PrivateDevices`) are not covered: say so. Never
   stop units by a glob such as `run-*`: it matches system mount units. Stop the one transient
   unit by the name `systemd-run` printed.

10. **A fix that failed after the deploy: read the launcher, not the shell.** A launcher that
    starts children (a tmux-based agent runner, a service manager, a process supervisor) often
    scrubs the environment: `env -i`, an allowlist of names, a login shell on top. A fix that you
    tested with variables set by hand in your own shell models the wrong environment. Before you
    write the second fix, `grep -n -E 'env -i|inherit|allowlist|update-environment'` the launcher's
    source at the pinned version, copy the exact launch shape (`env -i ... <shell> -l`) into the
    test, and test with the variables the launcher really passes (for example `USER` empty). Do
    not set an option that hands the daemon's environment, with its token, to the children: keep
    the scrub and give the child what it needs by the supported channel (a per-user profile, the
    spec's `env:`). Call the fix unproven until you relaunch on the deployed system and read the
    child's own output (a pane capture, its log). Say that in the PR body.

Report: what works first (with the numbers), then the problems in the order of what blocks the
owner, each marked verified or inferred, then minor warnings you did not investigate. Offer to
repeat the check after the owner's step.
