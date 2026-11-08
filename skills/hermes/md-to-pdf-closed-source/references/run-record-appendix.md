# Run record appendix (model, time, calls, sites, skills, cost)

The owner wants this record inside the Markdown as an appendix, with his corrected instruction. He asked for it again when the first version lacked time and sites, so write all of these in the first version:

- **Model and tools:** model id, Hermes version, subscription (no API key), subagents (none or how many), omp (used or not, and why).
- **Time:** start (first owner message), end (PR opened), elapsed, active time, wait for the owner, idle time after a stop. Say that active time comes from gaps between message timestamps.
- **Calls:** total without repeats, a table by tool with a one-line purpose, the failed calls and what replaced them.
- **Rounds:** assistant turns that made at least one new tool call, and the owner's messages (list what each one did).
- **Sites:** number of search queries, number of distinct URLs opened, number of domains, a table of domain, pages opened and a note for failures (429, 404, empty page). Add the oEmbed video count and the GitHub API repos, which are not in the table.
- **Skills:** the owner's skills that were loaded and applied, those loaded but not re-read after a compaction (say that their effect is not claimed), the skills found on the web with licence and why none was used, and a skill that appeared late (say that it did not guide the work).
- **Cost:** the Hermes `sessions` row holds cost per session, not per task. Give the session total, the difference between two readings and a labelled range (rounds times the mean cost per call). Never present the range as measured.
- **Who wrote what**, and a credits section with licences.

## How to read the numbers (execute_code, read-only sqlite)

- Database: `/var/lib/hermes/.hermes/state.db`, open with `file:...?mode=ro`, `uri=True`. Tables: `sessions` (cost, api_call_count, token counters) and `messages` (`role`, `timestamp`, `tool_calls` JSON, `tool_name`).
- Filter `messages` by `session_id` and by the first message id of the task. Timestamps are epoch seconds: convert with the owner's zone (UTC-3).
- Tool calls repeat in `messages` after an interruption or a compaction. Dedupe by the call `id` in `tool_calls`. Count a round only if it has a new call.
- Opened URLs: take the URLs in the arguments of `execute_code` and `terminal` calls only. Skip `write_file` and `patch`: their arguments hold the URLs that you cite, not the ones that you opened. Search queries that run inside a script are list items in its code: count them by pattern and say that the count is approximate.
- Gaps between consecutive messages above three minutes show waits. Name each gap: approval block, owner pause, iteration limit. A replayed message keeps its old timestamp, so ignore a gap that sits next to one.
- Read the counters twice at known times and give the difference. Fill the numbers into a template with placeholders, then check that no placeholder is left.
- Calls made after the last read (rebuild, commit, push) are not in the count: say so in the appendix.
