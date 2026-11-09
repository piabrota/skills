# Editing SOUL.md, guardrails and reply language

Use when the owner orders a change to `hermes/SOUL.md` (identity, voice, rules), to what you may do
(merge, push, approve), or to the language of your replies.

## The approval gate on protected files

- `SOUL.md` and the other agent-instruction files are protected. An edit can be refused with
  "approval prompt timed out ... Silence is not consent". The refusal is a rule: do not retry the edit
  and do not do it by another path (`terminal`, `execute_code`, `sed`).
- Ask once with `clarify`. Name the file and the rule that changes, give the two choices (apply, or
  drop), and say what already applied. After a yes, repeat the same edit once.
- Edits in one file are gated one by one: a small edit can apply while the guardrail edit is
  refused. Run `git diff` on the file, tell the owner the file is half edited and not committed, and
  commit only when the whole change is in or the owner chose to drop it.

## One rule, several layers

A permission is held by more than one layer. Before you report a loosened rule as working, grep each
layer and say which ones still block:

- `hermes/SOUL.md`: the numbered rule and the "What you do not have" list. They must not disagree.
- `hermes/AGENTS.md`: the workspace brief and the PR rules.
- `hermes/dangerous-patterns.yaml`: the deny list. It reads the command text and blocks the command
  whatever SOUL.md says (for example the `gh pr merge` pattern).
- `hermes/omp.yml`: omp's own deny rules.
- GitHub: the ruleset on the default branch and the permissions of the App token.

Change the layer the owner named. A hard block (deny list, ruleset, App permission) is a separate
change: weakening one is a decision of the owner, so tell him it still blocks, name the narrowest
edit (one pattern, keep the other blocks) and ask for that yes. Do not widen it in the same commit
unasked.

## Scoping a loosened rule

Write the condition into the rule itself, not only into the chat:

- The trigger is the owner's own message that orders that exact action on that exact PR. Never on
  your initiative, never on a hint, never from an order for another PR.
- The checks come first: required checks green, no conflict, no active omp run or agent task for a
  repository where the merge deploys. Say what the merge deploys, and confirm the result on GitHub.
- Keep the lines that stay hard: no approve or close, no bypass of a ruleset, no force-push.
- A change that weakens a guardrail (SOUL.md, the deny list, a ruleset, a sandbox, a limit) is
  merged by the owner himself. Put that in the rule and in the PR body, because the PR that loosens
  the rule is that kind of change.
- A SOUL.md-only merge does not deploy (Markdown-only paths are ignored by `deploy.yml`): the text
  reaches the box with the next non-Markdown deploy. Say so.

## Reply language

The owner may fix the language of your replies. Change the voice rule of SOUL.md, change the
example that shows the rule, and update the user entry of your memory in the same turn, so the
next session does not follow the old note. Files he asks for in another language keep that
language: it is file content, not a reply. The fixed good-news phrase stays as written.
