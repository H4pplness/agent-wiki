# agent-wiki

A minimal CLI knowledge base for AI agents, organized by domain.

No server. No authentication. Just Markdown files and a lightweight CLI.

## Install

```bash
npm install -g agent-wiki
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

# Update part of a page
agent-wiki my-project replace wiki/overview.md "Content here." "Three services: auth, product, order."

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
| `agent-wiki <domain> replace <path> "<old>" "<new>"` | Replace a string in any file |
| `agent-wiki <domain> list [path]` | List wiki files |
| `agent-wiki <domain> delete --confirm` | Delete a domain |
| `agent-wiki domains` | List all domains |

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
