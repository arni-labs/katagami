# ARN-462 — Agents get rejected by the Katagami MCP, and nobody finds out

Rita, 2026-09-08: "I want you to fix it so agents and their people don't struggle
with this. I also want you to improve the visibility that we have in this and I
want to be able to proactively know about user struggles. Use Datadog to set that
up. Any struggles that MCP or the website that agents or humans are having, I
want to proactively know about."

## What is happening

One real caller's session on 2026-09-08 shows 8 of 26 `get_*` calls rejected by
the MCP server before they reached any handler. The agent had just called a
search tool, which returns each row's identifier under the key `id`. Every
`get_*` tool declared exactly one parameter, `id_or_slug`, and nothing else, so
passing the key the search result actually carries is a schema violation and the
call never runs. The agent has no way to learn this from the error, which is the
generic MCP "invalid arguments" text.

Two problems sit underneath:

1. The tool schema and the search response disagree about what the identifier is
   called, and the schema is the strict side.
2. Nothing tells us it is happening. The rejection is counted, but not with any
   attribute that says which argument shape was refused, so a dashboard shows a
   flat `invalid_arguments` number with no way to act on it. Nobody is paged.
