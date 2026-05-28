# agent-wiki

A minimal CLI knowledge base for AI agents, organized by domain.

No server. No authentication. Just Markdown files and a lightweight CLI.

## Install

```bash
npm install -g @h4pplness/agent-wiki
```

## Quick start

```bash
# Create a domain
agent-wiki my-project init --desc "Backend API project. Stores architecture, API contracts, and technical decisions."

# Read the schema before doing anything else
agent-wiki my-project schema

# Write a page
agent-wiki my-project write wiki/overview.md "# Overview

> High-level description of the system architecture and key components.

---

Content here."

# View a page
agent-wiki my-project view wiki/overview.md

# Update part of a page with a patch
agent-wiki my-project patch wiki/overview.md --file ./change.diff

# Example change.diff:
# @@
# -Content here.
# +Three services: auth, product, order.

# List all pages
agent-wiki my-project list

# List all domains
agent-wiki domains
```

## Commands

| Command | Description |
|---|---|
| `agent-wiki <domain> init --desc "<desc>"` | Create a new domain |
| `agent-wiki <domain> schema` | View schema and domain description |
| `agent-wiki <domain> schema edit "<content>"` | Overwrite the schema |
| `agent-wiki <domain> view <path>` | View a file |
| `agent-wiki <domain> write <path> "<content>"` | Create or overwrite a file |
| `agent-wiki <domain> patch <path> --file <patch-file>` | Apply a unified-diff style patch to a file |
| `agent-wiki <domain> list [path]` | List wiki files |
| `agent-wiki <domain> delete --confirm` | Delete a domain |
| `agent-wiki domains` | List all domains |

## Patch format

`patch` applies simple unified-diff style hunks. Use a space for context lines, `-` for removed lines, and `+` for added lines.

```diff
@@
 - [agent-wiki](wiki/projects/agent-wiki.md) - CLI knowledge base
+- [confluence-cli](wiki/projects/confluence-cli.md) - CLI tool
```

In the example above, the first line starts with a space before the Markdown `-`. That keeps the existing list item as context and inserts the new list item after it.

## Data location

All data is stored locally at `~/.agent-wiki/`. Override with the `AGENT_WIKI_DIR` environment variable.

```
~/.agent-wiki/
└── domains/
    └── my-project/
        ├── meta.json
        ├── schema.md
        └── wiki/
            └── index.md
```

## Page format

Every wiki page must start with a purpose block:

```markdown
# Page Title

> What this page is about, what is stored here, and when to read it.

---
```

Pages without a purpose block are considered invalid.

## License

MIT
