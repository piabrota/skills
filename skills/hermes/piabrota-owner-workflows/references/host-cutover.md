# Preparing a new VPS host and a DNS record for a nix-os move

Use when the owner moves a service to a second host (new VPS, new subdomain) and asks "which
records do I change" or "what must I do before I merge".

## Read the checklist at the PR head

The migration checklist and the deploy doc live on the PR branch, not on `main`. Read them with
`git show FETCH_HEAD:docs/<file>` after `git fetch --depth 1 origin <branch>`. Answer from them,
and name any step that your own review changed.

## Check DNS without `dig`

The box may have no `dig`. Query DNS-over-HTTPS from `execute_code` with `urllib`:
`https://cloudflare-dns.com/dns-query?name=<name>&type=<A|AAAA|CAA|NS>` with the header
`accept: application/dns-json` (`https://dns.google/resolve` as a second resolver). Read
`Status` (3 means the name does not exist) and the `Answer` list with TTLs.

- Before the owner edits: the new name should not exist (nothing to delete, no wildcard that
  covers it). Record the apex and `www` answers, which must not change. Read `CAA` (an empty list
  lets any CA issue) and `NS` (which panel holds the zone).
- After the owner says "record created": query both resolvers and report the answer and TTL.
  Never report a record as live before you have queried it.

## What to tell the owner for a new subdomain

- Exactly one `A` record: host label only (the registrar appends the zone), answer the IPv4 from
  the provider panel, TTL 600. The provider's own hostname for the VPS often resolves to the same
  address; use it as a cross-check, and say the panel is the authority.
- Do not touch the apex and `www`: they stay on the old host.
- No `AAAA` yet. When the VPS has IPv6, a CA prefers it if a record exists, so the IPv6 firewall
  must open ports 80 and 443 first, or issuance fails.
- The record must resolve before the first deploy that enables ACME. Without it the certificate
  order fails. NixOS then keeps a self-signed placeholder and the services still start, so the
  deploy goes through and visitors see a certificate error (seen on the box); a rollback is not
  proven, so do not promise one either way.

## A new name shows a certificate error or the wrong site

Diagnose with read-only calls, in this order, and show the owner the facts:

1. DNS: the DoH `A` answer of each new name (above), next to the address of the host whose nginx
   declares that vhost (`site.nix` on the public-web host, the roles of the other host in its
   `hosts/<name>/`). A name that points at the wrong host reaches that host's default vhost, so the
   page shows ANOTHER site's `<title>` (a subdomain of the web host answered with the room).
2. Prove the vhost exists on the intended host before DNS is right:
   `curl -sk --resolve <name>:443:<intended ip> https://<name>/` (read the `<title>`).
3. Certificate: `curl -svk -o /dev/null https://<name>/ 2>&1 | grep issuer`. An issuer of
   `minica root ca` is the NixOS placeholder: ACME has not issued yet. Let's Encrypt means it did.
4. The ACME unit: `journalctl -u acme-order-renew-<name> -n 40` on the host you run on. It usually
   shows only the wrapper's "Failed to fetch certificates ... DNS records" line, not the CA's
   reason: say that you cannot read the real error. `curl -s -o /dev/null -w '%{http_code}'
   http://<name>/.well-known/acme-challenge/x` answering 404 proves port 80 reaches nginx.
5. The retry is the owner's: after the A record is right, `sudo systemctl start
   acme-order-renew-<name>` on the host that serves the name (you cannot SSH to the other host and
   you never run a unit start). The timer also retries on its own. If it fails again, ask for the
   last 60 journal lines instead of guessing.

## Order before the merge

1. Merge stacked fix PRs into the move PR first.
2. Re-read the move PR's mergeability: `gh pr view N --json mergeable,mergeStateStatus`. `main`
   moves, including through your own merged PRs. On `CONFLICTING`, name the files with
   `git fetch --depth 60 origin main <branch>` and
   `git merge-tree --write-tree origin/main origin/<branch>`. Offer to prepare the join on a
   `hermes/*` branch with the move PR's branch as base.
3. New host (owner's hands): snapshot in the panel; check the disk and label in
   `/etc/nixos/hardware-configuration.nix` against the host module; firewall 22, 80 and 443; the
   GitHub `prod` secrets (the host address, and the line `<ip> ssh-ed25519 ...` from the host's
   public key in the known-hosts secret); the first deploy from the owner's computer; the
   dashboard's basic-auth file; checks (deploy user can log in, units active, HTTP 401 on the
   dashboard, `hostname` prints the pinned name).
4. Old host: no action before the cutover. A deploy to it between the cutover and the merge
   restarts the service there and starts two consumers of one bot token, so do the cutover and the
   merge in one sitting and merge nothing else between them. Delete nothing for a week.
5. The checklist's `ssh kvm1` / `ssh kvm4` commands need aliases in the owner's `~/.ssh/config`.

## When the owner says "check" mid-migration

Re-read the live state before you answer; the owner acts between your turns:

- `gh pr view N --json state,mergedAt,mergeStateStatus` for the move PR and every stacked PR. If
  the owner merged the base first, the stacked PRs now target a merged branch: say that their
  fixes (host name, checklist) are not on `main`, and offer to reopen them against `main`.
- Check which machine you run on: `nproc`, `free -m`, `df -h /`, the public IP, `/etc/hostname`,
  and `systemctl show hermes-agent -p ActiveEnterTimestamp,MemoryMax`. After the cutover you may
  be the new host; do not talk about "the old VPS" as if you were on it.
- Check the endpoints from the box: DoH answer for the new name, `curl -s -o /dev/null -w '%{http_code}'`
  on the dashboard (401 means nginx and TLS are up), and `nc -z` on 22, 80 and 443.
- `gh run list --workflow deploy.yml` and the job steps show whether the new host's job really
  deployed or was skipped for a missing address secret.

## Limits to state

- The owner may want the host named after the label in the provider panel (for example
  `piabrota2`), not the raw `srvNNNNNNN` name the provider assigns. Set `networking.hostName` to
  the label, keep the provider's name as the address, and say that only a `hostname` run after the
  first deploy proves the OS name.

- A host name the owner gives is pinned in `networking.hostName`; the flake attribute, directory
  and secret names keep the old label until the owner asks for one name per VPS. Then the VPS
  name in the provider panel, `hosts/<name>/`, `nixosConfigurations.<name>` and `deploy.nodes.<name>`
  are the same string, and the rename goes in the same PR as the docs. Keep the old node name as
  an alias while the workflows use it, ship their patch, and leave alone what is not a host name
  (a skill named after the plan, the plan name, secret names, an owner's ssh shortcuts, the text
  of drawn figures, which cannot be redrawn here).
- You cannot tell whether the name in the provider panel is the OS hostname: ask the owner to run
  `hostname` after the first deploy.
- The public host key is not a secret; the owner, not you, confirms it came from the new VPS.
  Never ask for a private key or a password in chat.
