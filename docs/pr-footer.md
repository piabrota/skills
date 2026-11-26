# The footer of a Hermes pull request

A pull request from `piabrota-hermes` ends with a footer. The footer names the model and the
tool. A reader then knows what did the work.

## The footer

Put these lines at the end of the body of the pull request:

```
Model: <the model that served the conversation> (<the provider>)
Edits: <omp, or "hand edits" and the reason>; gate: <the check that passed>
— piabrota-hermes (Hermes Agent on the piabrota VPS), <the date>
```

## The rules

- The model is the one that did the work of this pull request. A model that the owner changed in
  the same day changes the line.
- The edits line names the coding tool. Use `omp` when it made the change. Use `hand edits` when
  it did not run, and give the reason.
- The gate line names the command that passed. Do not write a check that did not run.
- Commits carry no footer. The trailers are the trailer of the repository.
- A comment on GitHub carries the same last line: `— piabrota-hermes (…), <the date>`.

## Example

```
Model: deepseek-v4.1-flash (OpenCode Go)
Edits: omp; gate: just quality
— piabrota-hermes (Hermes Agent on the piabrota VPS), 2026-11-25
```
