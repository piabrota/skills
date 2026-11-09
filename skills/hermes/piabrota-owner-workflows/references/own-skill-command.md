# A new command for Hermes itself (own skill, kept by a nix-os PR)

For "create a command for yourself, PR to make it permanent". A Hermes slash command is a skill:
the `name` in the front matter is the command (`/rbi` for `name: rbi`). Hermes's own writable
`~/.hermes/skills` is lost to the next reinstall; the permanent home is
`hermes/skills/<name>/SKILL.md` in piabrota/nix-os.

## Steps

1. Search `skills_list` and `hermes/skills/` for a skill with the same job. Improve it when one
   exists. Load `skill-validator` (Write mode) before the body.
2. `git -C <clone> worktree add ../<new> -b hermes/<slug> origin/main`. Do the reads with
   `git -C`, `read_file` and `search_files` from `workdir /tmp`: the repo `AGENTS.md` is huge.
3. Write `hermes/skills/<name>/SKILL.md` by hand. It is Markdown with no code, so omp is not
   needed; say that in the PR and the reply. Front matter: `name` equal to the folder,
   `description` that starts "Use when" and has at most 60 characters, `version`, `author`,
   `license: MPL-2.0`, `platforms`, `metadata.hermes.tags` and `related_skills`. Keep the body near
   100 lines and in English (repo files are English).
4. `hermes/skills/` is already in `settings.skills.external_dirs` (`hermes.nix`): add no Nix
   option. Add one row to `docs/HERMES.md` and `docs/HERMES.ptBR.md`, after the `kvm4-health`
   row. Leave `AGENTS.md` alone: its margin to the 32,000 limit is small.
5. Check the YAML with `yaml.safe_load` in `execute_code`, the name against the folder, and the
   description length. `agentskills-checker` is not on the box: say so.
6. Commit with `git commit -F`, push alone, open the PR with a body file (Summary, What changed,
   Tested, Not tested, Risk), in ASD-STE100 English.

## What the PR may claim

- A PR with only `SKILL.md` and doc rows is Markdown-only: `deploy.yml` ignores it, so nothing
  restarts, and the command appears at the next non-Markdown deploy or a manual run of
  `deploy.yml`. Apply the classification list in SKILL.md before you write a Risk section, and
  write the same fact in the docs rows: never copy "a merge restarts `hermes-agent`" from an
  earlier PR about a `.nix` change.
- The command was not loaded in a running Hermes and not run on a real prompt. Say that. On
  Discord a skill comes through `/skill`, not as a bare `/name`.

## Design choices for a workflow command

- Put every gate in the body: what needs the owner's yes, and "ask once, in one message".
- Reuse the delegation rules that already exist (subagents for fan-out only, at most two at
  once; omp for code, at most two runs; `kvm4-health` before heavy work). Do not restate
  tool parameters.
- Offer a `--dry` flag that stops after the plan, and tell the owner the default (act at once
  unless something needs his yes) so he can flip it in one line.
- Control a command's modes with exact flags (`--dry`, `--go`, `--pt`) that stand as words of
  their own anywhere in the prompt. A costly or optional quality mode (ponytail review) is
  opt-in: off by default, on only for the exact flag, never for the mere word in the text. The
  skill states what the flag adds (extra omp runs, the review run read-only, fixes only for
  findings you confirmed) and that the owner's flag is his yes to that extra run.
- A command that grows a questioning or brainstorming stage: borrow the method as plain skill text
  and credit the source and its licence. Keep the gate: a project needs his yes to the design, a
  small change goes on. Say what a hook costs only after you read its source: the hook of
  obra/superpowers adds about 5 KB on the first turn of a session (not on every call, and not for
  a subagent), and its brainstorming skill has a hard gate that clashes with the owner's
  one-question, one-decision style. Offer both routes (the borrowed text, the plugin) with that
  cost. When he then says "install it" and "keep the command", do both in one PR and document the
  two ways to send a fuzzy prompt in a section of `docs/HERMES.md` and `docs/HERMES.ptBR.md`: a
  table of how each starts, what it does, how it asks, its flags and its cost, and which one
  wins on a prompt that starts with the command. Install steps: `references/hermes-plugin-catalog.md`.
- Before you say "no plugin exists", search the catalog index in the workspace
  (`plugin-catalog-index.json`, list `entries`, fields `name`, `version`, `repo`, `flags`, `desc`)
  and the `plugin-catalog/` folder at the pinned Hermes commit, then the community: the awesome
  lists, hermesatlas.com and the upstream repo of the method (a `.hermes-plugin/` folder is the
  sign of a Hermes plugin). When the owner says "community plugin", Nous's catalog alone is the
  wrong answer: a plugin that the catalog lacks can still be installable. Report what you read,
  and that ports seen only in search results were not opened.
- A follow-up that changes the PR ("same PR") goes in as a new commit on the same branch plus a
  signed PR comment that replaces the stale body (`gh pr edit` fails here). When the new work sits
  in another worktree, push it to the PR branch with
  `git push origin <local-branch>:<pr-branch>` (a fast-forward, no force). Update both doc rows
  in the same commit.
- A body near 100 lines is the target; a command with a talking stage and a flag section can
  reach about 170. Offer the owner the cut list (red-flags table, spike step) instead of cutting
  unasked.
