# Owner-run `just remote-*` recipes (restart, health, checks over SSH)

For "a just command to restart/check/clean X on the boxes". The owner runs it from his own machine through
SSH and his passwordless `sudo`. An agent never runs it: the deny list blocks `sudo`, `ssh` and
`systemctl` writes. You write it, test it against stubs, and say so in the PR.

## Shape

- One POSIX sh script in `scripts/` (run as root on the box), one thin recipe in the justfile, one stub-based
  test script (`scripts/<name>.test.sh`, prints `N checks, M failed`, same style as the `kvm4-health` test),
  a `just <name>-test` recipe, a docs section, a one-line AGENTS.md row. The recipe follows its siblings:
  `remote-<verb> what="all" user="h0ffmann" target=host:` with `host` from `DEPLOY_HOST` (default KVM 1).
- The justfile must parse on the oldest `just` that CI uses (Ubuntu's apt package, 1.21): parameters with
  defaults and plain recipe lines only; no attributes. No old binary is in nixpkgs, so test the parse on the
  newer ones and say that in the PR.
- Flags travel inside one quoted argument (`just remote-x "hermes --dry-run"`); unquoted, just reads them as
  its own options. The recipe validates that argument against a character class before it reaches the remote
  shell.

## A prompt over SSH

`ssh host sudo sh -s < script` uses stdin for the script, so the script cannot ask a question. Send the
script as the base64 argument of `sh -c` and keep stdin for the terminal:
`ssh -t user@host "sudo sh -c \"\$(echo $b64 | base64 -d)\" <name> <args>"`. Let the script read the answer
from `${TTY_VAR:-/dev/tty}` so a test can point it at a file. With no terminal and no `--yes`, refuse with
exit 2. `sudo` writes the script text to the box's journal on each run: say so in the PR.

## Safety rules for a restart script

- A table of groups and units is the allow list; a unit that is not in it is never touched. Match dynamic
  names (`loco-*`) with an anchored regex, not a glob, and prove it with a hostile name in a stub.
- A group acts only on units the box has, so one command serves both hosts; a group the box lacks prints
  one `skip` line and exits 0.
- Show the plan with the cost of each step before acting, ask `Proceed? [y/N]`, and offer `--yes`,
  `--dry-run` and `list` (changes nothing).
- Reload a web server, do not restart it. Start oneshots, restart timers.
- Order: `hermes-agent` first, wait for `active` (bounded poll), then `hermes-backend`: a dashboard that
  starts with no gateway can launch a stray gateway outside the agent's cgroup. Then check that every
  `gateway run` process sits in the cgroup of `hermes-agent.service` and print `ok` or the pid and cgroup.
- In `all`, put the unit that holds the agent's own session last, so a failure on the way shows while the
  session lives. Say in chat that the owner's session ends when he runs it.
- Print no journal text and no environment (a line can hold a secret): print the `journalctl -u <unit>`
  command instead. Exit 0 all as wanted, 1 a unit failed or a stray gateway, 2 usage or refused.
- Prove the order check and the allow-list check RED on a naive version, then green.

## Health-check thresholds

A threshold must sit above the cap that the system itself enforces (journald keeps at most 200 MiB, so warn
above it, not at 90 % of it), or a healthy box makes the recipe fail. A script that exits 1 on a finding makes
`just` print "Recipe failed": keep that exit code for the watchdog, and have the recipe say what the 1 means.
A unit the box does not run is not a finding.

## In the PR

Say: human-only, no Nix option or unit changed, what was proven offline, what only a real run proves (SSH,
the real units, the prompt on a real terminal), and that CI does not run the new test until the owner adds a
step (the bot may not edit `.github/workflows`). If the script is embedded by store path in `hermes.nix`,
the merge restarts the agent's units (see "Classify the change" in SKILL.md).
