# Resolving a PR whose head is a fork's default branch

Scope: a person (often the owner) opened a PR whose head branch is the default branch of a fork
(for example `<fork>:main`), upstream moved on, the PR shows CONFLICTING, and the owner asks you to
resolve it and push. This differs from resolving your own `hermes/*` PR: the head carries the
fork's whole history, and a push to the head updates the live PR.

## Steps

1. **Identify the real head repo.** The PR author and the head repo can differ:
   `gh pr view <n> --json headRepository,headRepositoryOwner,isCrossRepository`. Name every later
   ref from that answer.

2. **Name the remotes before any ref command.** `gh repo clone` names remotes by its own scheme
   (the fork may land as `origin`, the real upstream as `upstream`). Run `git remote -v` and take
   every ref name from its output. A comparison of the same remote against itself returns "0 files
   differ" and "0 fork-only commits" without an error, which reads as "no divergence" and is wrong.

3. **Decide stale-or-real before you resolve.** Count both directions
   (`git log --oneline <upstream>..<head>` and the reverse) and diff the trees
   (`git diff --stat <head> <upstream> | tail -1`). A fork branch whose work upstream merged as a
   squash still shows fork-only commits, so do not trust the commit count alone: a tree diff of zero
   means the PR is stale and should be closed, not resolved. When both trees hold lines the other
   lacks, a real merge is needed; choose per file from the commit messages that explain the intent,
   never by file count or recency alone.

4. **Check the head's history for junk before it merges.**
   `gh api repos/<head-repo>/commits?sha=<branch>&per_page=10`. A fork's default branch can carry
   self-test or fixture commits from an earlier bug (junk author names, test-fixture messages). A
   normal merge carries them into upstream history permanently. If junk is present, tell the owner
   and recommend a squash merge of the resolved result, which keeps the junk out of upstream.

5. **Take-theirs-then-audit for a wide divergence.** When both trees hold lines the other lacks
   across 50 or more conflicted files, do not hand-resolve file by file. Take upstream's side on
   every conflict (`git diff --name-only --diff-filter=U | xargs git checkout --theirs --`), commit
   the merge, then audit both leak directions by reading, never by grepping alone. What the fork
   loses (`git diff HEAD <fork-tip> --numstat`): classify each file against upstream's follow-up
   commits — a workflow, a news post or a script upstream deliberately dropped is a decision, not
   a loss, and a fix the fork added may already exist upstream, so check the file upstream keeps,
   not the fork's commit list. What survives from the fork (`git diff <upstream-tip> HEAD
   --name-only`): files that auto-merged both-side changes carry fork content silently — a
   fork-only script upstream replaced with its own tool, a dependency freeze upstream does not
   track, a replaced asset. Bring each file to upstream's state (`git checkout <upstream> --
   <file>`, `git rm` the rest) until this diff names only files you knowingly keep, and amend.

6. **Clone for the merge.** A workspace clone can be a bare clone ("this operation must be run in a
   work tree") or carry an old unrelated worktree state. Make a fresh normal clone of the fork,
   add the upstream repo as a second remote, branch from the head at its remote tip, and merge
   upstream there.

7. **Probe push permission with useful work, never a throwaway.** Push the resolved result as
   `hermes/<slug>` on the fork first: it delivers the work and proves the token in one step. A
   push to the head branch itself can still be blocked by a deny list (branch-name rules) even when
   the token has rights. Report exactly which layer blocked (deny list, GitHub ruleset, or token),
   never a bare "no permission". The `permissions` field of a fine-grained App token can show
   `pull:false` while reads work; test with a real call.

8. **The workflows permission blocks the push itself.** The App token holds contents, pull
   requests and issues, not `workflows`: any commit that touches `.github/workflows/**` is refused
   at push time with "refusing to allow a GitHub App to create or update workflow ... without
   `workflows` permission". A merge commit inherits this from the workflow deltas of the side it
   merges in, so a resolution that adopts upstream's workflows cannot be pushed. Resolve the
   workflow files back to the branch's own state inside the merge commit
   (`git checkout <fork-tip> -- .github/workflows`, then require
   `git diff HEAD^1 HEAD --name-only | grep -c workflows` to print 0) and push again. The PR's own
   merge still takes upstream's untouched workflow files, so upstream's final tree keeps its
   workflows; say so in the PR body.

9. **Verify before you report.** After the push, `gh pr view <n> --json mergeable,mergeStateStatus`
   must show CLEAN, and the diff must show the resolution, not a nearly-all-deletions diff
   (a hook or a wrong branch can swap under you).

## Explain a large diff before the mechanics

When the owner says he does not know what the diff implements, open the report with a count per
top-level directory (`git ls-files '<dir>/**' | xargs wc -l | tail -1`) and one sentence per
directory on what it does versus the state it replaces, plus the lineage (who ported what, which
squash carried it upstream). Only then give the push, permission and merge mechanics.
