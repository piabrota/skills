# Delivering a stack when no write path exists

Use this when the target org gives no token, and a fork push is refused because the branch descends
from upstream's workflow commits. The work is done; only the delivery is blocked. Build the real
history anyway, so the patches are reviewable and apply in order.

## 1. Build the stack in the clone

1. `git fetch origin2 main` and branch A off it: `git switch -c hermes/<topic-1> origin2/main`.
   Commit A with its own `Tested:` trailer.
2. Branch B off A: `git switch -c hermes/<topic-2>`, commit B.
3. Gate B, not only A: the tree that matters is the top of the stack. Run the repo's checks inside
   the dev shell of the branch that carries the dev-shell fixes, as the SKILL.md says.
4. Name the split so each PR reads alone: A is the tooling or prerequisite change, B is the product
   change. A description that needs B to make sense belongs in B.

## 2. Export

```
git format-patch -1 <A sha> -o <dir>
git format-patch -1 <B sha> -o <dir>
```

One directory per stack, one body file per PR next to the patches (`pr-1-body.md`,
`pr-2-body.md`). In body 1: "PR 1 of a stack of two", what only it fixes, and that the next PR
builds on the branch. In body 2: "base this on PR 1's branch, not on `main`", the dependency, and
why the product change needs it. Both bodies end with the footer: the model, the edits, the gate.

## 3. Hand it over

The reply gives the directory path and the exact sequence, not a paste of the patches:

```
git am <dir>/0001-<first>.patch
git push origin HEAD:hermes/<topic-1>        # PR 1, base = default branch
git am <dir>/0001-<second>.patch
git push origin HEAD:hermes/<topic-2>        # PR 2, base = hermes/<topic-1>
```

Say in the same message: the two walls that stopped you (no org token, and the ancestry carrying
upstream's workflow commits), that CI has not run on either patch, and what only the deploy can
prove.

## 4. After the base merges

A stacked PR whose base merged is not delivered: if nobody moves it, it merges into a dead branch
and the change never reaches `main`. After PR 1 merges, `git rebase --onto origin/main <PR 1 head>
<branch>`, push, and the second PR's base can move to `main`. State this follow-through in the
hand-over, or in PR 2's body, so it does not get lost.
