---
name: agent-wiki
description: Use the agent-wiki CLI to create and maintain local Markdown knowledge bases for AI agents, including domain schemas, wiki pages, page updates, and navigation conventions.
---

# agent-wiki SKILL

## What this skill covers

How to use the `agent-wiki` CLI, and how to make good decisions about when and how to create schemas and wiki pages.

---

## Part 1 — CLI Usage

### Command reference

```bash
# Initialize a new domain
agent-wiki <domain> init --desc "<description>"

# Read schema (always do this first when working in a domain)
agent-wiki <domain> schema

# Overwrite the entire schema
agent-wiki <domain> schema edit "<content>"

# View a wiki page
agent-wiki <domain> view <path>

# Create or overwrite a wiki page
agent-wiki <domain> write <path> "<content>"

# Replace a string in any file (wiki pages or schema.md)
agent-wiki <domain> replace <path> "<old string>" "<new string>"

# List files in the wiki
agent-wiki <domain> list
agent-wiki <domain> list wiki/some-folder/

# List all domains
agent-wiki domains

# Delete a domain
agent-wiki <domain> delete --confirm
```

### Typical workflow when starting work in a domain

Always follow this order before reading or writing anything:

```
1. agent-wiki <domain> schema         → understand structure and conventions
2. agent-wiki <domain> view wiki/index.md  → see what pages exist
3. agent-wiki <domain> view <page>    → read specific pages as needed
```

Never skip step 1. The schema tells you how the wiki is organized and what conventions to follow. Working without reading the schema first leads to inconsistent structure.

### Writing vs. replacing

Use `write` when creating a new page or rewriting a page from scratch.

Use `replace` when updating a specific part of an existing page. Prefer `replace` over `write` for edits — it is safer because it only changes the targeted string and leaves everything else intact.

```bash
# Good: surgical update
agent-wiki myapp replace wiki/auth.md "status: draft" "status: stable"

# Only use write when creating new or fully rewriting
agent-wiki myapp write wiki/auth.md "<full new content>"
```

### Updating index.md

After creating a page that is significant enough to be discovered later, add a reference to `wiki/index.md`:

```bash
agent-wiki myapp replace wiki/index.md "---" "- [Auth Service](wiki/auth.md) — authentication and session management
---"
```

---

## Part 2 — Design Guidelines

### When to create a schema (domain)

**A schema must represent something large and long-lived** — a project, a system, a product, or a broad knowledge domain. It is a knowledge base that will accumulate pages over time and needs structural conventions to stay navigable.

**Create a schema when:**
- A user explicitly asks for it
- The subject is a whole project, product, codebase, or domain (e.g. "our e-commerce platform", "machine learning techniques we use", "internal ops processes")
- Knowledge about this subject will grow over multiple sessions

**Do NOT create a schema for:**
- A single feature, task, or ticket
- A one-off document, article, or blog post
- Anything a user did not ask to be persisted as a domain

If unsure, ask the user whether they want a persistent domain or just a one-time answer.

---

### How to write a good domain description

The domain description appears every time `schema` is called. It must orient the agent immediately — before reading any wiki page.

**Requirements:**
- One to three sentences maximum
- State what the domain is about, what kind of knowledge is stored, and the scope
- Specific enough that it could not be confused with another domain

**Good:**
```
E-commerce XYZ project. Stores architecture decisions, API contracts, business
rules, and technical decisions agreed upon by the team.
```

```
Applied machine learning knowledge base. Focuses on techniques validated in
production, not academic theory.
```

**Bad:**
```
Notes about the project.         ← too vague, could be anything
Everything about our backend.    ← "everything" is not a scope
```

---

### When to create a wiki page

Create a new page when a topic is **independent enough to stand on its own** and will likely be referenced again in future sessions.

Do not create a page for every small piece of information. Prefer adding content to an existing relevant page when the topic is a sub-topic of something already documented.

Ask: "If I needed this information in a future session, would I know which page to look in?" If the answer is no, that is a signal the topic needs its own page with a clear description.

---

### How to write a good page description

Every wiki page **must** begin with a blockquote description immediately after the H1 title. This is not optional.

```markdown
# Page Title

> <description here>

---
```

The description is the first thing an agent reads when scanning pages. It must answer:
- What is this page about?
- What kind of information is stored here?
- When should someone read this page?

**Requirements:**
- Two to four sentences maximum
- Must be specific enough that it cannot be confused with any other page in the same domain
- Must not overlap in scope with an existing page — if it does, update that page instead of creating a new one

**Before writing a description, check existing pages.** Run `agent-wiki <domain> list`, skim descriptions of related pages via `view`, and confirm the new page covers something genuinely distinct.

**Good:**
```markdown
# Auth Service — API Contracts

> Defines the request/response schema, error codes, and versioning policy for
> all endpoints in the auth service. Read this when implementing or debugging
> login, logout, token refresh, or session validation flows.
```

**Bad:**
```markdown
# Auth

> Information about auth.
```

```markdown
# Auth Notes

> Some notes I collected about the authentication system.
```

A page whose description could describe another existing page is a sign the content should be merged, not created separately.

---

### Schema content guidelines

The schema is read by the agent every time it starts working in a domain. It should contain:

- **Wiki structure**: what folders exist, what each folder is for
- **Naming conventions**: how files and folders should be named
- **Page format**: the mandatory purpose block, any other structural requirements
- **Update guidelines**: when to create a new page vs. update an existing one, when to update `index.md`
- **Cross-reference conventions**: how pages should link to each other if applicable

Keep the schema concise. It should be scannable in seconds. If the schema is too long, the agent wastes tokens reading it on every session start.
