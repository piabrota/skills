---
name: update-skills
description: "Use when asked to update the piabrota/skills repository."
disable-model-invocation: true
license: MPL-2.0
---

# update-skills

## When to Use

Use this skill when the owner asks you to add, change, sync or fix a skill in piabrota/skills. Use it also when you finish a skill and must send it there.

The repository piabrota/skills holds the skills of the owner. Two kinds of change exist. Pick one first.

1. A skill that Hermes made or changed. Its folder is `skills/hermes/<name>/`. A job copies it. Do not edit that folder by hand.
2. Any other skill in the repository. Change it with a normal pull request from a clone.

## Which skills the export takes

The script `~/.hermes/scripts/export-skills.sh` takes a skill only when its origin is one of these:

- Made by Hermes on this box (a folder in `~/.hermes/skills/` that is not bundled and not from the hub).
- A skill of the pirsig plugins.
- A skill in the `hermes/skills/` folder of nix-os.

Bundled, hub, catalog and other plugin skills are written by other people. The script leaves them out.

The script keeps only the keys of the Agent Skills format in the front matter. It adds `disable-model-invocation: true`. It adds one row to `skills/hermes/README.md` and one line to `www/tags.txt`.

## Export a Hermes skill

1. Write or change the skill in `~/.hermes/skills/`. Keep the body at 150 lines or fewer. Put long data in `references/`. The skill tool accepts a description of 60 characters at most, one sentence that starts with `Use when` and ends with a period, and it warns when the body has no `## When to Use` section. The export copies the description as it is.
2. Run the dry run. Nothing is pushed.

   ```
   DRY_RUN=1 OUT_PATCH=/var/lib/hermes/workspace/skills-export.patch bash ~/.hermes/scripts/export-skills.sh
   ```

   It prints the files that the commit would change. The patch is the full commit.
3. Do the checks in "Check before the push" on the exported files.
4. Run the real export.

   ```
   bash ~/.hermes/scripts/export-skills.sh
   ```

   It prints one line with the pull request URL.
5. If a pull request from a branch `hermes/skills-export*` is open, the export updates that pull request. It does not open a second one. Tell the owner which pull request changed.

The cron job `skills-export` runs the same script every day. It prints nothing when there is nothing to do. Do not make a second job.

If the output says that the App has no installation or that there is no token file, tell the owner. Do not look for another token.

## Find what changed

The background review writes its edits under `~/.hermes/skills/`. To list the skills that changed after a date, run `find ~/.hermes/skills -name SKILL.md -newermt '<date>'`. Do the same for the `hermes/skills/` folder of the nix-os clone.

After a dry run, the clone `/var/lib/hermes/workspace/skills-src` holds the commit on a local branch. A later `git apply --check` of the same patch there says that the files already exist. This is expected.

## Change the export script

Since 2026-11-05 the master copy is `hermes/scripts/export-skills.sh` in piabrota/nix-os (PR 138), and activation installs it to `~/.hermes/scripts/`: change it by a nix-os PR through omp, or the next deploy overwrites a hand copy. Test a change from a copy in the cron environment: `env -i HOME=/var/lib/hermes PATH=<the PATH= line of /etc/systemd/system/hermes-agent.service> DRY_RUN=1 OUT_PATCH=/tmp/x.patch bash <script>`. Cron runs the script with the unit's PATH, which has no `awk` or `perl` (the 2026-11-05 01:45 run failed on this); the script adds `/run/current-system/sw/bin` and stops early if a tool is missing. The token file for the App is `/run/hermes-github/piabrota`. Never read or print it.

The secret scan of the script skips plain placeholders such as `xxxx`, `...` and `your-`. A skill folder from an external directory sits at depth 2 or 3.

## A separate pull request for one skill

Use this when the owner wants a new pull request, and an export pull request is open.

1. Run the dry run. It leaves the clone on the branch `hermes/skills-export-dry`.
2. In the clone `/var/lib/hermes/workspace/skills-src`, fetch main and switch to a new branch from it:
   `git fetch --depth 1 origin main`, then `git switch -c hermes/<goal> origin/main`.
3. Take only that skill from the dry-run branch: `git checkout hermes/skills-export-dry -- skills/hermes/<name>`.
4. Copy the row of that skill from `skills/hermes/README.md` and its line from `www/tags.txt` on the dry-run branch.
5. Check, commit, push and open the pull request as in "Commit and pull request".
6. Write in the pull request that another pull request adds lines at the same place of the README and the tags file. The second merge needs a rebase.

## A manual export of all pending changes, with a new reference

Use this when the owner says "export the skills now" and wants a reference in the same pull request.

1. Put the new reference in the source skill in `~/.hermes/skills/<skill>/references/`, and a one-line pointer in its `SKILL.md`. A file added by hand in `skills/hermes/` is lost at the next export. A skill from nix-os is read-only here. Its fix goes in a nix-os pull request.
2. Run `gh pr list -R piabrota/skills --state open`. If an export pull request is open, the real script updates it. Without one, run the dry run, then branch: `git fetch --depth 1 origin main`, `git switch -c hermes/<goal> origin/main`, `git checkout hermes/skills-export-dry -- skills/hermes www/tags.txt`.
3. Search the exported files for a claim that the owner has since corrected. A skill from nix-os is exported as it is deployed. If a nix-os pull request has a corrected file, copy that file from its branch into the export branch with `git show <branch>:<path> > <file>`. Say it in the pull request body. Do not publish text that you know is wrong.
4. Continue with "Check before the push" and "Commit and pull request".

## Change a skill that is not in skills/hermes

1. Reuse the clone `/var/lib/hermes/workspace/skills-src`. Do not make a new clone.
2. Fetch main and switch to a branch `hermes/<goal>` from it.
3. Read `AGENTS.md` of the repository before you edit. The repository wins over this skill.
4. Obey these rules of the repository:
   - Write English in ASD-STE100: short sentences, active voice, no semicolons, no phrasal verbs.
   - A description has 300 characters or fewer. A body has 150 lines or fewer.
   - A skill body has no links, no credits and no history. Credits go in `README.md`.
   - Search `skills/` for a skill with the same job before you add one. Two skills with one job are a defect.
   - A new skill needs a row in `README.md` and a line in `www/tags.txt`.
   - A skill that the repository copies as is keeps its text. The list is `AS_IS` in the file `check.py` of the repository.
   - Never edit a skill of another author unless the owner asks.
5. For a skill with code or a long procedure, use the `skill-validator` skill.

## Check before the push

Python is not on the PATH. Use the one from nixpkgs, with a cache folder that the sandbox can write.

```
export XDG_CACHE_HOME=/var/lib/hermes/.hermes/cache/scratch/nixcache
(cd scripts && nix run nixpkgs#python3 -- check.py)
nix run nixpkgs#python3 -- skills/dev-flow/agentskills-checker/scripts/agentskills_check.py skills/<category>
```

Both must exit 0. Warnings for files copied as is are allowed. Report every warning to the owner.

Then check these by hand:

- The body names no script that is missing in the skill folder. The checker warns about it.
- The added lines hold no token, key, account ID, IP address or e-mail. The repository is public.
- Search for token shapes only. A search that holds the names of secret files starts the deny list and does not run.

## Commit and pull request

1. Write the commit message in English. End it with the trailer `Tested: <the command and its result>`. Add no agent trailer.
2. Run `git add`, `git commit` and `git push origin hermes/<goal>` as three separate calls. The deny list blocks them in one command.
3. Open the pull request with `gh pr create --base main --head hermes/<goal>`. Use the sections Summary, What changed and Tested. Write ASD-STE100.
4. Never push to main. Never merge. Never force-push.
5. Say in the pull request that the skill is public after the merge, and that the owner must read it first.

## Report to the owner

Give the pull request URL, the checks with their results, each warning, and what you did not check. Say if the export updated an old pull request instead of opening a new one.

## Pitfalls

- A cron job can fail with nobody told. Its `Deliver` target `origin` can be a local chat that no one reads (`hermes cron list` then says "ran, but the result was not delivered"). `hermes cron run <id>` from the CLI cannot deliver and prints "failed" even when the script succeeded: read `~/.hermes/cron/output/<id>/<latest>.md`. After a time the owner expects an export, check `hermes cron list` (Last run) and that file. Set delivery with `hermes cron edit <id> --deliver discord --failure-deliver discord`.
- "Why was there no export pull request?" is answered from the run records, not from the PR list. The job runs daily and opens a PR only on a diff. Read three things: the job's Last run in `hermes cron list`, the day's record `~/.hermes/cron/output/<job-id>/<date>.md` (a no-diff day reads `Status: silent (empty output)`), and the newest merged export PR on piabrota/skills, which dates the last real export. A "late" dispatch inside the job's grace is on time for this question; say the job ran and stayed silent because no skill changed.

- A body over 150 lines costs tokens in each use. Split it into `references/` files.
- Before you create a skill, search the `references/` of the existing skills for the same topic. The background review often files a recipe there. Move the content into the new skill and leave a one-line pointer, so one topic has one home.
- The checker flags a backticked path that is not inside the skill folder, also in a code block. Name the file in words, or run the command from its folder: `(cd scripts && ... check.py)`.
- The export carries every pending change, not only the skill you made. Name the other skills in the pull request, and tell the owner to read them.
- Edits in `skills/hermes/` by hand are lost when the export runs again. Change the source skill in `~/.hermes/skills/`.
- A dry run changes only the local clone. It pushes nothing and calls no `gh` command.
- The export needs the GitHub App token file. Without it the script waits and prints one line.
