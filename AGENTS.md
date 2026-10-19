# Croct agent skills — authoring guide

This repository ships [Agent Skills](https://agentskills.io) that teach coding agents how to build
with [Croct](https://croct.com). Every skill is derived from the official documentation at
https://docs.croct.com. Read this file before adding or changing a skill.

## Layout

```
skills/
  <skill-name>/
    SKILL.md            # Entry point: frontmatter + the instructions an agent needs most often
    references/*.md     # Detail loaded on demand, one topic per file, linked from SKILL.md
```

- `<skill-name>` is lowercase kebab-case, starts with `croct-`, and matches the `name` field.
- References are one level deep: `SKILL.md` links to `references/x.md`; reference files do not
  chain to further reference files.
- No scripts unless a task cannot be done without one.

## Frontmatter

```yaml
---
name: croct-example
description: >-
  What the skill covers and when to use it. Start with "Use when ...". Name the concrete
  triggers an agent will see: package names, file names, function names, CLI commands, error
  messages, and user phrasings.
---
```

- `description` is at most 1024 characters. It is the only thing an agent sees before deciding to
  load the skill, so spend it on triggers, not on marketing.
- No other frontmatter keys are required.

## Writing rules

1. **Accurate to the docs.** Every API name, option, command, flag, default, and limit must come
   from the documentation. Never invent or extrapolate. When the docs are silent, say so and
   point to the live page instead of guessing.
2. **Written for an agent, not a reader.** Imperative voice. Lead with what to do, then why.
   Cut marketing copy, screenshots descriptions, and dashboard click-paths unless the agent has to
   relay them to the user.
3. **Prefer decision rules over prose.** Tables for "if X, use Y", checklists for procedures,
   explicit "Do / Don't" for pitfalls.
4. **Code is copy-pasteable.** Show complete, minimal snippets with imports. Mark the file name
   in a comment or heading when it matters.
5. **Keep `SKILL.md` lean** (aim for under ~300 lines). Move long API listings, exhaustive type
   tables, and per-framework detail into `references/`.
6. **Link back to the source.** End each reference file with a `Sources` list of the docs pages
   it was derived from, written as markdown-mirror URLs:
   `https://docs.croct.com/<path>.md` (the content path without `index`/extension).
7. **Plain markdown only.** Convert MDX components (`<PropertyList>`, `<ExpandablePanel>`,
   `<StepList>`, callouts, tabs) into headings, lists, and tables. Drop images.
8. **Cross-skill links by name.** Refer to sibling skills by name (for example, "see the
   `croct-cql` skill") rather than by relative path.

## Looking up the live docs

Every skill may tell the agent how to fetch current docs when the bundled references fall short:

- Index: `https://docs.croct.com/llms.txt` (full: `https://docs.croct.com/llms-full.txt`)
- Any page as markdown: append `.md` to the page URL, e.g. `https://docs.croct.com/explanation/slot.md`
- Search: `https://docs.croct.com/api/search.md?term=<terms>`

## Validating

```sh
npm install
npm run validate
```

The validator checks frontmatter, name/directory agreement, description length, and that every
relative link in a skill resolves to a file.
