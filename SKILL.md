---
name: agent-wiki
description: >
  Persist, retrieve, and share knowledge across sessions using the agent-wiki CLI.
  Use this skill whenever the task involves: saving context or findings so they survive
  past this session, coordinating work between multiple agents via a shared task queue,
  building a domain knowledge base that grows over time, or reading knowledge that
  another agent has written. Triggers include any mention of "agent-wiki", "persist
  context", "knowledge base", "share between agents", "task queue", or when the user
  wants Claude to remember something for a future session. Also use when the user
  asks Claude to act as an orchestrator assigning work to specialist sub-agents.
---

# Agent Wiki

A Markdown-based knowledge base on the local file system. Each agent gets its own
wiki at `~/.agent-wiki/agents/<agent-name>/`. Use it to persist findings, share work
across sessions, and coordinate with other agents.

## Quick-start: always do this first

```bash
# 1. Auto-init your wiki and see its current layout
agent-wiki <your-name> schema

# 2. See what pages exist
agent-wiki <your-name> list
```

Pick a role-based name (max 64 chars, `[a-z0-9\-_]`): `code-reviewer`, `orchestrator`,
`data-analyst`, `debugger`, etc.

---

## Core Commands

### Read

```bash
# View a page (frontmatter stripped — clean content)
agent-wiki <name> view wiki/rules/style-guide.md

# View including YAML frontmatter
agent-wiki <name> view wiki/rules/style-guide.md --raw

# List all pages
agent-wiki <name> list

# List pages under a prefix
agent-wiki <name> list wiki/tasks/
```

### Write

```bash
# Create a new page — FAILS if page already exists
agent-wiki <name> create wiki/concepts/circuit-breaker.md --title "Circuit Breaker Pattern"

# Update content in an existing page (exact string match required)
agent-wiki <name> replace wiki/tasks/queue.md \
  "- [ ] Review auth module" "- [x] Review auth module"

# Replace ALL occurrences (default: first only)
agent-wiki <name> replace wiki/metrics/kpi.md "Q1" "Q2" --all

# Preview without writing
agent-wiki <name> replace wiki/rules/policy.md "old text" "new text" --dry-run
```

### Delete

```bash
# Prompts for confirmation; add --confirm to skip in scripts
agent-wiki <name> delete wiki/notes/obsolete.md --confirm
```

### Cross-agent reads

```bash
# Read another agent's schema / pages freely — write only to your own wiki
agent-wiki data-analyst schema
agent-wiki data-analyst view wiki/reports/q2-findings.md
```

---

## Key Rules

| Rule | Why it matters |
|------|----------------|
| **Read before you write** | `list` or `view` first to avoid duplicating or overwriting content. |
| **Exact old-string in `replace`** | Character-for-character match including whitespace; mismatch exits with code 1. |
| **`create` vs `replace`** | `create` for brand-new pages. `replace` to edit existing ones. |
| **Write to your wiki only** | Cross-agent *reads* are always fine. Cross-agent *writes* are not (except orchestrators updating their own task queue). |
| **Keep schema updated** | After adding pages, run `replace schema` to update page count and add important cross-references. |

---

## Common Workflows

### Workflow 1 — Persist findings across sessions

```bash
agent-wiki researcher schema                          # init + orient
agent-wiki researcher create wiki/findings/topic.md --title "Topic Research"
agent-wiki researcher replace wiki/findings/topic.md \
  "## Nội dung" "## Nội dung\n\nKey insight: ..."   # add content iteratively
```

### Workflow 2 — Task queue (orchestrator + specialists)

```bash
# Orchestrator sets up work
agent-wiki orchestrator create wiki/tasks/queue.md --title "Task Queue"
agent-wiki orchestrator replace wiki/tasks/queue.md \
  "# Task Queue" "# Task Queue\n\n- [ ] Review PR#42\n- [ ] Analyze Q2 data"

# Specialist polls and claims a task
agent-wiki orchestrator view wiki/tasks/queue.md
agent-wiki orchestrator replace wiki/tasks/queue.md \
  "- [ ] Review PR#42" "- [x] Review PR#42 (claimed by code-reviewer)"
```

### Workflow 3 — Domain knowledge base

```bash
agent-wiki expert create wiki/concepts/topic.md --title "Topic Name"
agent-wiki expert replace wiki/concepts/topic.md \
  "## Nội dung" "## Nội dung\n\nContent here...\n\nSee also: [[wiki/concepts/related.md]]"
```

Use `[[wiki/path/page.md]]` syntax to cross-link pages into a navigable graph.

### Workflow 4 — Collaborate with another agent

```bash
agent-wiki other-agent schema    # understand their domain
agent-wiki other-agent list      # see their pages
agent-wiki other-agent view wiki/reports/findings.md   # read what you need
# Then write your response or synthesis to your own wiki
```

---

## Reference Syntax

All page paths start with `wiki/` and end with `.md`:

```
wiki/tasks/queue.md
wiki/concepts/circuit-breaker.md
wiki/reports/q2-findings.md
schema                           # special target for schema.md
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Logic error — file not found, or `old-string` not matched in `replace` |
| `2` | Validation error — bad agent name, path traversal |
| `3` | System error — file I/O failure |
| `4` | Network error — cloud sync failed |

Always check for exit code `0` before assuming success.

---

## JSON Output

Add `--json` for programmatic processing:

```bash
agent-wiki <name> list --json
agent-wiki <name> log --tail 5 --json
agent-wiki agents --json
```
