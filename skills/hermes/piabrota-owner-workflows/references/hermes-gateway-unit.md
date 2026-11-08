# The Hermes gateway unit: self-diagnosis, restart loops, reloads

Use when the owner says Hermes is unstable, a unit restarts without end, a background job vanished
after a deploy, or asks you to "debug yourself" with the doctor commands. The gateway is the unit
`hermes-agent`; the dashboard is the unit `hermes-backend`.

## Self-diagnose with Hermes's own tools first, read-only

Run them in this order and read the verdict of each before you guess:

1. `hermes gateway status` ("Running manually, not as a system service" means a gateway outside
   the unit), `hermes doctor`, `hermes guide` (the hermes-guide plugin: ten checks, exit 1 means
   warnings), `hermes cron doctor`.
2. `systemctl show <unit> -p NRestarts -p ActiveState -p SubState -p ExecMainStartTimestamp -p
   MemoryMax` and `journalctl -u <unit> --since <time> --no-pager`. Filter out the repeated lines
   (`grep -v`) to see the one that differs.
3. `~/.hermes/logs/gateway.log` and `agent.log` around the first bad timestamp: a graceful restart
   logs `SIGUSR1 received ... supervisor relaunches`.
4. Which unit owns a process: `cat /proc/<pid>/cgroup`; the parent: `awk '/PPid/' /proc/<pid>/status`.
   A gateway in the cgroup of another unit escapes the memory cap of its own unit.
5. `hermes <subcommand> --help` before you invent a fix: the flag that solves a supervisor problem
   is documented there (`gateway run --external-supervisor`). Then confirm in the installed
   package (`ls -d /nix/store/*-hermes-agent-*/lib/python*/site-packages`; grep `gateway/restart.py`).

The guide plugin checks the running install, never a diff. When the owner says "use the guide to
evaluate this PR", say that in the first sentence, run `hermes guide` as the baseline of the box the
PR will change, and send the code review to omp. If `hermes guide --json` ends in a traceback
(`PosixPath is not JSON serializable`, a plugin bug in the `update` field), use the text mode: the
plugin's own skill allows that fallback. Do not retry the flag.

Do not run `hermes gateway stop` or `restart` yourself to "test": it ends the turn you are in and
kills the jobs you started. Give the owner the command and the consequence, and run it only on his
"go". The command refuses while a live session exists (the chat turn you are in counts) and offers
`--yes`, which interrupts that session: never add `--yes` unprompted.

## Restart loop with exit 0 ("A gateway already owns this host")

Symptom: `NRestarts` in the thousands, `ExecStart` exits 0, the journal repeats the message above.
Cause: the unit's `ExecStart` is a shell wrapper, so the gateway no longer sees systemd as its
parent. Without `--external-supervisor`, a reload (SIGUSR1) makes the gateway spawn a detached
replacement and exit; `Restart=always` then starts a second gateway that finds the first and exits 0,
forever. The fix is the flag in the wrapper (`hermes gateway run --external-supervisor`): the gateway
exits 75 back to the wrapper, which starts it again inside the unit. Do NOT map every 75 to 0: the real
gateway also exits 75 when another gateway already serves the host, so a wrapper that blindly
restarts on 75 (or hides it as 0) loops once a second. Check for a foreign live pid in `gateway.pid`
for BOTH exit 0 and 75 when the run lasted under about 20 s, before the reload branch. Build the test
stub from the real binary's exit codes (read `gateway/restart.py` or run the real command in a temp
home), never from an assumed 0: a stub that exits 0 passed while the real unit looped. Write the test
red on the old script first.

After the fix merges the old detached gateway still owns the host, so the loop continues until the
owner stops it once (`sudo -u hermes hermes gateway stop`). Tell him that sequence in the PR body
and in chat, and the check afterwards: `NRestarts` stops growing, the gateway PID is in the cgroup of
`hermes-agent.service`, and a test reload leaves no `gateway run` process outside the unit.

A health check must test `NRestarts` before it skips inactive units: a unit in a restart loop sits
in `activating`, so a skip-first order is blind to the case it should catch. A wrapper time ceiling
for omp (`timeout --signal=TERM --kill-after=30s <limit>` before `choom`) bounds a run that a
reload would otherwise leave half done.

While a detached gateway runs it sits in the cgroup of `hermes-backend` (2 GiB cap). The dashboard,
the gateway and every job you start share that cap, and `kvm4-health` reports a peak near 100 %.
Read `systemctl show hermes-backend -p MemoryCurrent -p MemoryPeak` before heavy background work.

### Second cause: the dashboard starts a gateway during the restart gap

A reload makes the gateway exit 75, and `Restart=always` waits `RestartSec` (5 s). In that gap the
dashboard's Chat-tab TUI (a child of `hermes-backend`) loses its websocket, retries after 1 s and 2 s,
finds no gateway and starts an unmanaged one (`gateway run --quiet --idle-exit`, detached) in the
cgroup of `hermes-backend`. The unit's own gateway then finds it, exits 0 and loops. The flag
`--external-supervisor` cannot stop this: the spawner is a client, not the gateway. Hermes recognises
only a service named `hermes-gateway.service`, so the client does not see the unit `hermes-agent`.
Suspect it when `NRestarts` climbs after a deploy that reloaded the unit, with the flag already set.

Prove it from logs, not from a guess: `logs/gateway-exit-diag.log` (the exit-75 time, then a
`gateway.start` with `"detached": true` and `--idle-exit` in argv a few seconds later),
`logs/tui_gateway_crash.log` (the reconnect attempts), `gateway.pid` (JSON with the foreign pid),
`/proc/<pid>/cgroup`, and the journal's "already serves" line.

Fix shape (a wrapper change in the unit, not a Hermes setting): on exit 75 the wrapper starts the
gateway again at once, in the same process, so the gap is gone; when a child exits 0 within seconds and
`gateway.pid` names another live pid, the wrapper waits for that pid to exit and then starts its own,
instead of exiting; more than five exits of 75 in 60 s exit 1 so systemd's counter still works. Test
it with a stub gateway and a temporary home, never against the live gateway. Only a real reload with
the dashboard TUI open proves it. The stray gateway that exists when the fix merges is cleared once by
the owner: `sudo systemctl restart hermes-backend` ends it together with the dashboard TUI and every job
in that cgroup (omp runs too): ask for it when no background job runs. Never signal the stray gateway
yourself: your own session may live in it.

A change to the unit's `ExecStart` also changes the derivation of the web-only host: the public
`/hermes` page renders the unit as YAML. So the check "that host's drv equals main's" does not hold for
a `hermes.nix` change. Prove the change is not the cause instead: evaluate a copy of the tree that has
main's `hermes.nix`, the same way (`path:`), and compare. Say in the PR body that the public page changes.

## "Two hermes processes are running": what is normal

Two long-lived Hermes processes are the expected state: the gateway (`hermes gateway run
--external-supervisor`, in `hermes-agent.service`, with its bash wrapper as parent) and the dashboard
(`hermes dashboard`, in `hermes-backend.service`). A metrics page that groups by executable name shows
both as "hermes". Prove it with `ps -eo pid,ppid,etimes,rss,args | grep -i [h]ermes`, `cut -d: -f3-
/proc/<pid>/cgroup` for each, and `gateway.pid` (the pid must be the one in `hermes-agent.service`;
`NRestarts` 0). Abnormal: a second `gateway run` outside that cgroup. A `<defunct>` python child of
the dashboard holds no memory and is not that bug. Say which unit each process belongs to.

## A new secret in hermes.env needs a switch, then a reload

The NixOS module copies `hermes.env` into Hermes's `.env` during activation, not when the unit
starts. After the owner adds a key (for example `API_SERVER_KEY`), a reload or a restart alone does
not load it. The order is `sudo /run/current-system/bin/switch-to-configuration switch` (runs
activation again), then `sudo systemctl reload hermes-agent`. Check by the effect (the port opens),
never by reading the file. Put the order in the PR body of any change that needs a new key, and
tell the owner not to paste the key in chat.

## After "merged": let the deploy finish before you test

A merge that deploys reloads `hermes-agent`, and the reload ends the turn you are in and kills jobs
you started. Before a test run, a long omp run or a measurement, read
`gh run list --workflow deploy.yml --limit 1 --json status,conclusion`. If it is pending or in
progress, wait with `timeout 280 gh run watch <id> --exit-status` (repeat once). A watch that ends
with the gateway shutting down means the deploy landed: do not re-run the restart or the watch,
check `systemctl is-active` of the touched units and answer the owner's latest message first.
After it, confirm the effect on the box (a removed unit is inactive, a closed port is closed).

## A reload or restart kills background jobs

- Jobs you start from the terminal (omp, long builds) are children of the gateway. When a deploy
  reloads or restarts the unit, they receive SIGTERM: the omp error file ends with
  `[Stopped by SIGTERM]` and only some files exist. The completion notice may never arrive,
  because the process that would deliver it restarted.
- At the start of every turn after a long or overnight run, check the facts before you answer:
  `ps -eo pid,etime,args | grep omp`, the size of the output file, `git status --short`.
  Say plainly that the run died, then rerun the same task file (files already written stay).
- Before a long run tell the owner not to merge a PR that deploys until the run ends, and say
  which merges deploy (`.nix`, `hermes/omp.yml`, `hermes/dangerous-patterns.yaml`).
- The same applies to the owner's own `gateway stop`: the supervisor reaps the gateway's child
  process groups, so ask him to run it when no background job runs.
