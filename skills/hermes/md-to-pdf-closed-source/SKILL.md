---
name: md-to-pdf-closed-source
description: Use when building a PDF from Markdown with pandoc.
disable-model-invocation: true
---

# Markdown to PDF, the closed-source way

The owner asked for "pandoc the same way as h0ffmann/proof or closed-source". Their justfile gives the options; the toolchain is picasso's paper lab. No pandoc or xelatex is on the box PATH.

## Build (tested 2026-11-07, 23 pages, no pandoc warning)

1. Fetch `format/tex/template.tex` and `format/crossref.yaml` from h0ffmann/closed-source at a pinned commit (`gh api repos/.../contents/<path>?ref=<sha> --jq .content | base64 -d`). The template is MIT.
2. Write `<short hash>` to `build/.current-revision` (the template prints it in the footer).
3. `nix develop "github:h0ffmann/picasso?dir=labs/paper" --command sh -c '...'` (set `XDG_CACHE_HOME` to a /tmp dir). The first run downloads TeX Live for about 7 minutes: run it in the background.
4. `pandoc --from markdown+fancy_lists+raw_tex -F pandoc-crossref --citeproc --metadata link-citations=true --number-sections --top-level-division=section --fail-if-warnings -s --template format/tex/template.tex -t latex --metadata-file format/crossref.yaml -o build/tex/X.tex X.md`, then `xelatex -interaction=nonstopmode -halt-on-error` twice, inside `build/`.
5. Check `grep -c 'Missing character' build/X.log` (0), then `pdftoppm -r 70 -png` a few pages and look at them.

## Pitfalls

- Front matter for pt-BR: `lang: pt-BR`, `babel: brazilian`, `abstract-title`, `keywords-title`, `secPrefix`/`tblPrefix`/`figPrefix`. The template reads `author.name`, `version`, `subtitle`, `header-includes`.
- A bare `@` in text is a citation and fails `--fail-if-warnings`. Avoid it.
- Latin Modern lacks many symbols (arrows, check marks, warning sign). Use words.
- `{-}` on a heading drops its number. Level-2 headings under an unnumbered level-1 still count from the last numbered one, so mark both.
- An unanswered approval blocks the script and forbids a retry: ask the owner with clarify, and go on only after his yes.
- Keep the Markdown as parts (front matter, survey, lessons, appendices) in a scratch dir and join them with `cat` into `research/X.pt-BR.md`. Keep the build commands in one `build.sh` that matches the appendix "how to rebuild", so a rebuild after an edit is one call.
- A deny rule blocks a compound command that holds `git push`: run `git add`, `git commit -F file` and `git push origin <branch>` as separate calls, and nothing after the push on the same line.
- A turn has a limited number of tool iterations. Batch reads and writes, and open the PR before polishing: a second commit on the same branch updates the PR.
- State only what was measured. A time, a count or a claim about a source that no tool output shows must be cut or marked as not measured, in the document as in the reply.
- A fact that comes from a search snippet is `(nv)`, not `(v)`. `(v)` means that the cited page was opened.
- Do not name the source of a fact from memory (an edition history, an etymology): cut it, or mark it as the writer's reading.

## Research fetch pitfalls on this box

- `web_extract` fails (the backend is search-only DuckDuckGo): fetch with `urllib` in execute_code and strip the HTML.
- `yt-dlp` asks for YouTube cookies: use `https://www.youtube.com/oembed?format=json&url=...` (title and channel only; mark the video "so titulo").
- The Google Books API returns 429. Open Library works but finds few pt-BR editions: read publisher pages.
- After a context compaction, raw tool outputs stay in `~/.hermes/state.db` (table `messages`; read-only sqlite in execute_code). The `sessions` row has cost and call counts per session, not per task. Tool calls repeat in `messages` after an interruption: dedupe by tool call id.

## Owner's rules for research PDFs (2026-11-07)

One Markdown plus one PDF named `name.pt-BR.pdf` under `research/`, PR in piabrota/nix-os on a `hermes/*` branch. Mark each fact `(v)` read, `(v, so titulo)` or `(nv)`. Never invent an experience of the writer: use `[ANEDOTA DO AUTOR: ...]`. His instruction (corrected pt-BR) and the run record go in as appendices of the same Markdown, so the repository keeps two files: see `references/run-record-appendix.md` for what the record holds (model, time, calls, sites, skills, cost) and how to read it from the session database. Add it in the first version, not after the PR. The record is his explicit exception to the repository's no-agent-trail rule: say so in the PR.
