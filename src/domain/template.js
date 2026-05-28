function getSchemaTemplate(domain) {
  return `# Schema — ${domain}

## Wiki Structure

Describe how directories and files are organized in this wiki.

## Naming Conventions

- File names: lowercase, hyphen-separated, e.g. \`topic-name.md\`
- Directory names: reflect major topic groups

## Page Format

Each wiki page **must** start with a purpose block before any other content:

\`\`\`markdown
# Page Title

> Short description of what this page is for, who should read it,
> and what information is stored here.

---
\`\`\`

Pages without a purpose block are considered invalid.

## Update Guidelines

- Create a new page when a topic is independent enough to stand alone
- Update an existing page when the information exists but needs additions
- Always update \`wiki/index.md\` when adding important pages
`;
}

function getIndexTemplate(domain) {
  return `# ${domain}

> Entry point for the ${domain} wiki. Lists all major pages in this domain.

---

`;
}

module.exports = { getSchemaTemplate, getIndexTemplate };
