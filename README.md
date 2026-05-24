# Agent Wiki

CLI knowledge base platform for AI agents — a shared file system accessible via CLI binary.

## Problem

When multiple AI agents collaborate, each needs its own specialized context to work effectively. But agents run in isolated environments — different processes, MCP servers, containers — and have no natural way to share context. Agent Wiki solves this by providing a shared file system that all agents can access through the same CLI binary, with no microservices or internal network calls.

## Design Principles

- **Fully stateless.** Each CLI command is an independent transaction that carries its own context via `agent-name`. No sessions, no state between invocations.
- **Agent-name is the sole identifier.** No login or authentication needed. The agent name determines which knowledge base is accessed. If the name doesn't exist, the wiki is auto-initialized on the first call.
- **Synthesized knowledge only.** No raw sources layer. Agents are responsible for synthesizing and contributing processed knowledge in Markdown format.
- **Local-first.** All data stored locally. Cloud sync is an optional feature, decided by the human operator.
- **Free cross-reading.** Agent A can read Agent B's wiki by specifying the correct `agent-name`. Collaboration happens through the shared file system.

## Installation

```bash
git clone <repo-url>
cd agent-wiki
npm install
npm run build
npm link
```

## Usage

```
agent-wiki <agent-name> <command> [args...] [flags]
agent-wiki agents
agent-wiki sync-all
agent-wiki config <set|get|list> <key> [value]
```

### Agent Commands

| Command | Description |
|---------|-------------|
| `schema <agent-name>` | Display agent schema. Auto-inits wiki if it doesn't exist. |
| `view <agent-name> <ref>` | Read a wiki page. Hides frontmatter by default. |
| `create <agent-name> <ref>` | Create a new wiki page with default frontmatter. |
| `delete <agent-name> <ref>` | Delete a wiki page. Prompts for confirmation. |
| `replace <agent-name> <target> <old> <new>` | Find and replace text in a file. |
| `list <agent-name> [prefix]` | List wiki pages. |
| `log <agent-name>` | View operation history. |
| `sync <agent-name>` | Sync agent wiki to cloud. |

### Global Commands

| Command | Description |
|---------|-------------|
| `agents` | List all agents with init date and page count. |
| `sync-all` | Sync all agents to cloud. |
| `config set <key> <value>` | Set a configuration value. |
| `config get <key>` | Get a configuration value. |
| `config list` | Show all configuration. |

### Flags

| Flag | Applies to | Description |
|------|-----------|-------------|
| `--json` | `list`, `log`, `agents` | Output as JSON |
| `--raw` | `view` | Show raw content including YAML frontmatter |
| `--title <title>` | `create` | Set page title in frontmatter |
| `--confirm` | `delete` | Skip confirmation prompt |
| `--all` | `replace` | Replace all occurrences |
| `--dry-run` | `replace` | Show diff without writing |
| `--tail <n>` | `log` | Show last N log entries (default: 20) |

### Examples

```bash
# Auto-init a new agent wiki and display its schema
agent-wiki schema code-reviewer

# Create a wiki page
agent-wiki create code-reviewer wiki/rules/style-guide.md --title "Style Guide"

# Read a wiki page (cross-agent read)
agent-wiki orchestrator view code-reviewer wiki/rules/style-guide.md

# Find and replace
agent-wiki orchestrator replace wiki/tasks/queue.md \
  "- [ ] Review PR#42" "- [x] Review PR#42"

# Replace all occurrences with dry run
agent-wiki data-analyst replace wiki/metrics/kpi.md "Q1" "Q2" --all --dry-run

# List all pages under a prefix
agent-wiki orchestrator list wiki/tasks/ --json

# View recent activity
agent-wiki orchestrator log --tail 10

# List all agents
agent-wiki agents

# Configure cloud sync
agent-wiki config set cloudEndpoint "https://cloud.example.com"
agent-wiki config set userToken "your-token"
agent-wiki sync orchestrator
```

## File Structure

```
~/.agent-wiki/
├── config.json
└── agents/
    └── <agent-name>/
        ├── schema.md       # Navigation map + operating conventions
        ├── index.md        # Auto-maintained table of contents
        ├── log.md          # Append-only operation history
        └── wiki/           # Synthesized knowledge content
            ├── concepts/
            ├── tasks/
            └── notes/
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Logic error (file not found, string not found) |
| `2` | Validation error (invalid agent-name, path traversal) |
| `3` | System error (file read/write failure) |
| `4` | Network error (sync failed) |

## Tech Stack

- **Runtime:** Node.js
- **Framework:** NestJS (standalone application context)
- **CLI:** Commander.js
- **Language:** TypeScript
- **Libraries:** chalk, gray-matter, fs-extra, proper-lockfile, diff, inquirer

## License

MIT
