# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
npm run build       # tsc -p tsconfig.json → dist/
npm run dev         # ts-node src/main.ts (run without building)
npm run start       # node dist/main.js (run compiled)
npm run clean       # rm -rf dist
npm link            # register agent-wiki globally from dist/
```

## Architecture

Agent Wiki is a CLI tool for AI agents to share a Markdown knowledge base on the local file system. It uses **NestJS standalone application context** (not HTTP server) with **Commander.js** for CLI parsing.

**Entry point:** `src/main.ts` — creates a NestJS app context, resolves `WikiCliService`, passes `process.argv`.

**All CLI commands** are defined in a single file: [src/commands/wiki-cli.service.ts](src/commands/wiki-cli.service.ts). Commander.js subcommands (`schema`, `view`, `create`, `delete`, `replace`, `list`, `log`, `sync`, `sync-all`, `agents`, `config`) are registered via `program.command()`. There are no separate command classes — the design doc's planned command-per-file structure was consolidated into this single service.

### Module Map

| Module | Path | Responsibility |
|--------|------|----------------|
| Filesystem | `src/core/filesystem/` | All I/O via `fs-extra`, path resolution (`~/.agent-wiki/agents/<name>/...`), file locking via `proper-lockfile` |
| Wiki Logger | `src/core/logger/` | Append-only operation log (`## [timestamp] op | message`) with file locking |
| Markdown | `src/core/markdown/` | Wraps frontmatter/gray-matter utils, extracts `[[wikilinks]]`, infers title/category from refs |
| Wiki | `src/modules/wiki/` | 4 services: `WikiService` (CRUD for wiki pages), `SchemaService` (default schema template), `IndexService` (auto-maintained TOC in index.md), `ReplaceService` (find-and-replace with dry-run diff) |
| Config | `src/modules/config/` | Read/write `~/.agent-wiki/config.json` with defaults (`cloudEndpoint`, `userToken`, `autoUpdateIndex`, `logRetentionDays`, `defaultWikiDirs`) |
| Sync | `src/modules/sync/` | `SyncService` gathers all `.md` files and uploads via `CloudApiService` (axios HTTP client, Bearer token auth) |

### Key Design Decisions

- **Auto-init:** Any command with an unknown agent name triggers wiki initialization (creates `schema.md`, `index.md`, `log.md`, and default subdirectories `wiki/concepts/`, `wiki/tasks/`, `wiki/notes/`).
- **Concurrent access:** `FilesystemService.withLock()` wraps proper-lockfile with 5 retries. Used for writes to `index.md`, `log.md`, and any file modified via `replace`.
- **Exit codes:** 0=success, 1=logic error (not found, string not found), 2=validation error (bad agent name, path traversal), 3=system error (I/O), 4=network error (sync). Agents consume CLI via subprocess and rely on exit codes, not stdout parsing.
- **Stateless:** No sessions, no auth. Every command is an independent transaction. Agent name alone identifies the wiki.
- **Path traversal prevention:** `resolveWikiRef()` strips `..` segments after path normalization.
- **Frontmatter:** All pages have YAML frontmatter (`title`, `category`, `tags`, `created`, `updated`). `view` strips it by default; `--raw` shows it.

### Important Implementation Notes

- Commands like `sync <agent-name>` and `sync-all` are **separate top-level commands**, not subcommands of a parent.
- `config` is a parent command with `set <key> <value>`, `get <key>`, and `list` as subcommands.
- The `agents` command logic is inlined in `WikiCliService` rather than delegated to a separate AgentService (unlike what the design doc shows).
- `WikiService.printLog()` manually parses the log file by splitting on `\n## [` instead of using WikiLoggerService — log reading has no dedicated service.
- **CLI syntax normalization:** `normalizeArgv()` in `WikiCliService` rearranges `agent-wiki <agent-name> <command> [args]` (design doc / SKILL.md format) into Commander.js's expected `agent-wiki <command> <agent-name> [args]` by checking whether `argv[2]` is a known command name. Known commands are tracked in `AGENT_COMMANDS` and `GLOBAL_COMMANDS` constants at the top of `wiki-cli.service.ts`. Both syntax forms work — only the unknown-first-arg form triggers rearrangement.
