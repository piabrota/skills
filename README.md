<div align="center">

<img alt="技 (waza, skill) brushed in its seven strokes, drawn from Desmos equations, by @h0ffmann" src="docs/drawings/waza.svg" width="200"/>

# skills

<sub>🇨🇭 · 技 · <i>waza</i> · a swiss army knife of agent skills · <a href="https://www.piabrota.art/skills/">website</a> · <a href="docs/awesome-skills.md">awesome-skills</a> · <a href="docs/common-skills.md">common-skills</a> · <a href="agents/README.md">agents</a> · <a href="#in-one-minute">in one minute</a> · <a href="#the-skills">the skills</a> · <a href="#token-budget">token budget</a> · <a href="#install">install</a> · <a href="#structure">structure</a> · <a href="docs/drawings/README.md">the drawing</a> · <a href="#license">license</a></sub>

[![skills: 52](https://img.shields.io/badge/skills-52-1682D4?style=flat-square)](#the-skills)
[![writing: ASD-STE100](https://img.shields.io/badge/writing-ASD--STE100-1682D4?style=flat-square)](AGENTS.md)
[![license: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-1682D4?style=flat-square)](#license)
[![Ask DeepWiki](https://img.shields.io/badge/Ask-DeepWiki-1682D4?style=flat-square)](https://deepwiki.com/h0ffmann/skills)

</div>

## In one minute

- This repository is a set of agent skills. A skill is one folder with a `SKILL.md` file. An agent
  reads the file when a task needs it.
- Each skill comes from a real project of h0ffmann, piabrota or marola-dev. Each skill is written
  for those projects. It is not a copy of a public skill collection.
- The skills are in ten category folders. A skill name is unique in all folders.
- The whole repository is in ASD-STE100. The pt-BR skills follow `ptbr-writer`.
- The repository is small for the agent. A description costs tokens in each session. Thus
  `scripts/check.py` makes the budgets hard limits.
- Fork it, delete what you do not use, and run `just link`. `AGENTS.md` has the rules for a change.
- The README layout comes from piabrota/nix-os. The skill structure comes from davidondrej/skills.

## The skills

A ⏸ skill runs only when you call it by name. Its description does not load in a session.

### `writing/`

| Skill | What it does | From |
|---|---|---|
| `ste100` | Writes or rewrites English in ASD-STE100 | asd-ste100 and write-en (astrbot, alerts) |
| `easy-translate` | Easy pt-BR, Easy Japanese or controlled Chinese, from one source | alerts, closed-source, h0ffmann |
| `essay` | Checks that an essay keeps the form of Montaigne | closed-source |
| `ptbr-writer` | Rewrites pt-BR technical text by level of rigour | gramatico, with a `name` |
| `ptbr` | The same skill under its short name | gramatico, with a `name` |
| `ptbr-routing` | Selects the pt-BR skill and level before it loads | gramatico, as is |
| `cientifico` | Writes and reviews scientific pt-BR text with sources | gramatico, as is |
| `retorica` | Rhetoric for pt-BR (in development, no rules yet) | gramatico, as is |
| `ptbr-humanizer` | Makes the pt-BR copy of a site sound Brazilian | marola-site |

### `research/`

| Skill | What it does | From |
|---|---|---|
| `paper` | Writes a citable text where each claim has a mark | marola-research |
| `cite-release` | Keeps the Zenodo and `CITATION.cff` data of a release correct | marola |
| `citation-score` | Scores how much of a text is cited, from 0% to 100% | closed-source |
| `open-text` | Gets the full text of a free work and indexes it | closed-source |
| `eli5` | Explains a part of the project to a new reader, picture first | marola |

### `dev-flow/`

| Skill | What it does | From |
|---|---|---|
| `mip` | Writes an Improvement Proposal, a numbered design document | marola-devkit |
| `mip-tasks` ⏸ | Turns an accepted MIP into stacked PRs | marola-devkit |
| `mip-overnight` ⏸ | Works the MIP tasks one at a time, with no human present | marola-devkit |
| `triage` ⏸ | Turns an idea or a bug into an issue that is ready to claim | marola-devkit |
| `easy-issues` ⏸ | Solves small open issues, one tested PR each | marola-devkit |
| `github-better-outreach` | Writes the gh command that sets the best 20 topics of a repository | rax |
| `bipr` ⏸ | Opens a bilingual PR, pt-BR first | gramatico, as is |
| `pr-images` ⏸ | A `bipr` PR with before and after images | alerts |
| `handoff` | Saves and resumes sessions as notes in an Obsidian vault | marola-devkit |
| `voice-note` | Transcribes a voice note with local Whisper | marola-devkit |
| `agentskills-checker` | Checks skill folders against the Agent Skills specification | agentskills.io |
| `skill-validator` | Writes, reviews, debugs and evolves a skill | effective-agent-skills, davidondrej/skills |

### `nix/`

| Skill | What it does | From |
|---|---|---|
| `nix-lab` | Writes a self-contained flake lab or dev shell | picasso |
| `nixos-vps` | Changes a live VPS that a merge deploys | nix-os |
| `nix-debug` | Finds why an evaluation, build or boot fails | picasso, nix-os |
| `systemd-hardening` | Hardens a systemd service written in Nix | picasso, nix-os |

### `figures/`

| Skill | What it does | From |
|---|---|---|
| `figure` | Adds or explains a Mermaid or Archify figure | gramatico, as is |
| `archify` | Validated architecture and flow diagrams | archify, a submodule |
| `svg-diagram` | One hand-written SVG map for a README | marola |
| `ddraw` | A one-line drawing or a kanji as Desmos equations | pirsig |

### `web/`, `notes/` and `code/`

| Skill | What it does | From |
|---|---|---|
| `web-ui` | Changes or reviews what a visitor sees | marola-site |
| `maps` | Areas, points and data fields on a web map | marola-site, alerts |
| `citizen-science` | Keeps an open-data site checkable and easy to join | marola-site |
| `news-post` | A news post in pt-BR and English, with sources and a reading time | marola-site |
| `zk-method` | Checks notes against the Zettelkasten method | pirsig |
| `pirsig-slips` | Works with ideas on paper slips, as in Lila | closed-source |
| `pirsig` | Drives the Pirsig second brain and its Hippo rhizomes | pirsig |
| `lean-code` | The smallest correct diff | marola-devkit, marola-site |
| `loco` | Writes or debugs a Loco app (Rust and SQLite) | pirsig |

### `ww3/`

`ww3-port`, `wfip`, `release`, `noaa-notices` and `ww4-status` come from ww3-gpu, the port of
WAVEWATCH III to the GPU. `ww3-port-rust` is the `ww3-port` skill of chaceon. All are as is.

### `ouroboric/`

`sharingan`, `retro` ⏸ and `writing-styles` borrow ideas from ouroboric-dev. `ponytail-review` is
as is from havamal. `skills/ouroboric/README.md` gives the credit and the index of their skills.

### Not here

`docs/common-skills.md` lists the skills of other authors that the projects use, with their install.
Some skills of the source projects are not here. A skill with the same job replaces a duplicate.
A skill for one tool of one project stays in that project. Examples: `open-pr`, `write-pt-br`,
`translate-ja`, `zenodo-release`, the `mapbox-*` skills, `routing`, `voice-to-feature`,
`linkedin-*`, `readme-style` and `open-pencil`.

## Token budget

An agent loads a skill in three steps. Each step costs more tokens and occurs less frequently.

| Step | What loads | When | Limit (`scripts/check.py`) |
|---|---|---|---|
| 1 | `name` and `description` | Each session | 300 characters each, 12,000 in all |
| 2 | The body of `SKILL.md` | When the agent uses the skill | 150 lines |
| 3 | A file next to the body | When the body names it | None. Keep it small |

- A ⏸ skill has `disable-model-invocation: true`. It costs no tokens in step 1.
- A skill body has no `@` import and no link. An import loads a file eagerly.
- `python3 scripts/check.py` prints the cost of step 1. Today: 45 descriptions, about 2,750 tokens.
- The same script lints for ASD-STE100: sentence length, semicolons, phrasal verbs, marketing
  words and the em dash. It also limits `README.md` and `AGENTS.md` in lines and links.

## Install

The repository is a Claude Code marketplace. Its plugin `waza` has all the skills. Copy one line,
in a session (Claude Code 2.1.275 or newer) or in a terminal:

```text
/plugin install waza --marketplace piabrota/skills
claude plugin install waza --marketplace piabrota/skills
```

An older Claude Code needs `/plugin marketplace add piabrota/skills` and `/plugin install waza@h0ffmann`.
The plugin also adds the DeepWiki MCP server of `.mcp.json`. For another agent, you need `git`,
`python3` and `just`. Nix and `jq` are necessary only for `just check`.

```bash
git clone --recurse-submodules https://github.com/piabrota/skills
cd skills
just link                       # ~/.claude/skills
just link ~/project/.agents/skills
```

`just link` makes one symlink for each skill in a flat folder. For one skill, copy its folder.

## Checks

There is no CI. Run the checks before each commit:

```bash
just check
```

It runs `scripts/check.py`, `agentskills-checker`, the self-tests of the skill scripts, the tests
of the drawing, a comparison of the committed drawing with a new evaluation, and
`scripts/deepwiki-check.jq`.

## Structure

```text
skills/
├── AGENTS.md              # the rules for agents and humans
├── CITATION.cff           # the citation data (GitHub "Cite this repository")
├── .claude-plugin/        # plugin.json and marketplace.json: the Claude Code plugin
├── justfile               # check, link, drawing, deepwiki-check
├── flake.nix              # one input: nixpkgs-lib. Output: the drawing
├── skills/<category>/<name>/SKILL.md
├── agents/                # the index of the Claude agents, and their files as is
├── scripts/
│   ├── check.py           # budgets and ASD-STE100 lint
│   └── deepwiki-check.jq  # limits of .devin/wiki.json
├── drawings/              # pen.nix and waza.nix, pure Nix
├── docs/drawings/         # waza.svg, waza.desmos.json, README.md
├── docs/awesome-skills.md # the 33 personal skill collections with the most stars
├── docs/video-survey.md   # generative AI video with Claude: tools, models, voice clone
├── www/                   # the skill tags (tags.txt)
├── vendor/archify/        # git submodule, MIT
├── .devin/wiki.json       # the DeepWiki outline
└── .mcp.json              # the DeepWiki MCP server
```

## DeepWiki

DeepWiki reads `.devin/wiki.json` for its pages and notes. `.mcp.json` adds the DeepWiki MCP
server, so an agent can ask questions about this repository and others.

## License

The repository is MPL-2.0 (`LICENSE`). Some files keep the licence of their source:

| Files | Licence | Source |
|---|---|---|
| `vendor/archify` | MIT | tt-a1i/archify |
| `skills/research/citation-score/scripts/citation-score.sh` | AGPL-3.0 | h0ffmann/closed-source |
| `skills/dev-flow/voice-note/scripts/transcribe.py` | MIT | marola-dev/marola-devkit |
| `skills/notes/zk-method/scripts/zk_lint.py` | MPL-2.0 | piabrota/pirsig |
| The gramatico skills, as is | MPL-2.0 | piabrota/gramatico |
| `skills/dev-flow/skill-validator` | MIT | davidondrej/skills |
| `skills/ouroboric/ponytail-review` | MIT | DietrichGebert/ponytail, through ouroboric-dev/havamal |

The ideas in `skills/ouroboric/` are Bruno Valério's, from ouroboric-dev. The stroke order of 技
follows KanjiVG (CC BY-SA 3.0), as a reference only.
