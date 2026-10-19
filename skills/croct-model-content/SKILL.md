---
name: croct-model-content
description: >-
  Use when designing or changing Croct content models: regular vs union components, what becomes
  a component, slot, structure, or primitive attribute; writing component schema JSON
  (`structure`, `union`, `reference`, `text`, `number`, `boolean`, `list`, `@croct/file`,
  `@croct/richText` rich text, `format`, `choices`, `optional`, `private`, `position`); writing content
  definition JSON (`static`/`dynamic` values, `nullable`, `default`, `{{placeholder}}` paths);
  slot default, localized, experience, experiment, or content group content; schema limit
  errors (30 attributes, 6 nesting levels, 10 union members, complexity score 50); component
  versioning and breaking changes (`home-hero@2`); refactoring (duplicate and modify, duplicate
  and replace, flatten and merge); Markdown in text attributes with `@croct/md-lite`. Phrasings:
  "model content for a hero", "add an attribute to the banner component", "support variations",
  "component is too complex", "localize the hero", "translations", `preferredLocale`.
---

# Model Croct content

Design components and slots, write their schemas, and fill them with content definitions that
stay valid as the model evolves. Everything a schema can express also exists in the dashboard
visual editor; the JSON is the same model, written by hand.

## Mental model

| Concept | What it is | Scope |
|---|---|---|
| Component | A named, reusable schema. Only `structure` and `union` can be components (top-level schemas). | Reusable across slots and other components |
| Regular component | A `structure` with a fixed set of attributes. | |
| Union component | A `union` of up to 10 regular components; the editor picks one variant per content. | |
| Slot | A placeholder in the app (hero, announcement bar) tied to one component. Holds default content per locale. | Context-specific; one component can back many slots |
| Content definition | JSON holding the actual values for a schema, with static or dynamic (CQL) values. | |

Content layers, from base to top: **slot default content** (shown when no experience or
experiment matches, to bots excluded by bot filtering, on static rendering, and on errors) ->
**experience content** (per audience) -> **experiment content** (per variant, at least two
variants) -> **content groups** (extra variations for sub-segments inside an experience or
experiment variant). **Fallback content** lives in the app's source code and renders when
fetching fails or the service is suspended; the CLI downloads the slot default content as the
fallback.

## Decide the shape

| If you need... | Use |
|---|---|
| One fixed layout (same fields everywhere) | Regular component (`structure`) |
| Variations the editor chooses between (text banner vs image banner vs form banner) | Union component referencing regular components |
| Consistency across many places (a CTA button used everywhere) | A separate component, embedded with `{"type": "reference", "id": "..."}` |
| Flexibility in one place (a title + image pair) | A nested `structure` attribute or primitives, not a new component |
| A page with several independent sections | One component and one slot per section, not one giant component |
| A predefined set of options | `text` with `choices` (Enumeration) |
| Image, video, audio, or document upload | `reference` to `@croct/file` (files are capped at 5 MB; for longer videos, consider a `url` text attribute instead) |
| Formatted text edited in a toolbar editor | `reference` to `@croct/richText` |
| Light formatting in a plain text field | `text` + a Markdown parser in the app (see Markdown below) |
| A value used only to compute other values (for example, a dynamic variable) | Attribute with `"private": true` |

Rule of thumb from the docs: ask "Do I need flexibility or consistency?" Flexibility -> structure
attribute. Consistency -> new component.

## Workflow

1. List the sections of the page; each independently placed section becomes a slot.
2. For each slot, pick a regular or union component. Reuse existing components where the
   structure is meant to stay consistent.
3. Write the schema: attributes with `type`, `label`, `description`, `position`, and
   `optional` where content can be absent. Add validation (`maximumLength`, `minimum`,
   `pattern`, `allowedTypes`, `maximumLength` on lists) from the real UI constraints.
4. Check limits (below) before adding nesting. Compute the complexity score.
5. Write the default content definition for each slot and each supported locale.
6. If the component is already in use, expect a new version on breaking changes; bump the
   slot version in the app after updating the affected content (see Versioning).

## Schema skeleton

A regular component is a `structure`. Each attribute wraps its schema in `type`:

```json
{
  "type": "structure",
  "title": "CTA Button",
  "description": "A call-to-action button that links to a page.",
  "attributes": {
    "label": {
      "label": "Label",
      "description": "The text displayed on the button.",
      "position": 0,
      "type": {
        "type": "text"
      }
    },
    "link": {
      "label": "Link",
      "description": "The URL of the page to link to.",
      "position": 1,
      "type": {
        "type": "text"
      }
    }
  }
}
```

A union component maps component IDs to references. **Keys must equal the referenced IDs**:

```json
{
  "type": "union",
  "types": {
    "text-hero": {"type": "reference", "id": "text-hero"},
    "image-hero": {"type": "reference", "id": "image-hero"}
  }
}
```

In the app, union slot content is a discriminated union: each variant has a `_type` property set
to the component ID (`text-hero` or `image-hero` above). Branch on `_type` to render it; see the
`croct-integrate-sdk` skill.

### Attribute types at a glance

| Dashboard type | Schema JSON |
|---|---|
| Text | `{"type": "text"}` (+ `minimumLength`, `maximumLength`, `pattern`) |
| Multi-line text | `{"type": "text", "format": "multiline"}` |
| URL | `{"type": "text", "format": "url"}` |
| Color | `{"type": "text", "format": "color"}` |
| Date / time | `{"type": "text", "format": "instant"}` (also `local-date`, `local-time`, `local-date-time`, `zoned-date-time`) |
| Enumeration | `{"type": "text", "choices": {"left": {"label": "Left"}}}` |
| Rich text | `{"type": "reference", "id": "@croct/richText", "properties": {}}` |
| File | `{"type": "reference", "id": "@croct/file", "properties": {}}` |
| Number | `{"type": "number"}` (+ `integer`, `minimum`, `maximum`) |
| Boolean | `{"type": "boolean"}` (+ `label.true`, `label.false`, `default`) |
| List | `{"type": "list", "items": {...}}` (+ `itemLabel`, `minimumLength`, `maximumLength`) |
| Structure | `{"type": "structure", "attributes": {...}}` |
| Component | `{"type": "reference", "id": "<component-id>"}` |

`format` and `choices` cannot be combined with any other text property except `type`. Full
property lists, defaults, and limits: [references/schema.md](references/schema.md).

## Schema limits

| Limit | Value |
|---|---|
| Attributes per structure | 30 |
| Nesting depth | 6 levels |
| Components in a union | 10 |
| Schema complexity score | 50 |
| List items (schema default `maximumLength`) | 30 |
| Text `maximumLength` | 300 single-line; 1000 multi-line and URLs (implicit cap: plain `text` cannot combine `format` with `maximumLength`; rich text can) |
| Text `choices` | 20 |
| File size | 5 MB (5242880 bytes) |
| Labels / descriptions | 60 / 160 characters |

Complexity score: structure = 1 + its attributes; list = 1 + its item type; primitive = 1;
union = its most complex member; reference = the referenced component. A list of products with
title, image, and price scores 5.

## Content definition skeleton

Every value is `{"type": "<content type>", "value": {"type": "static" | "dynamic", ...}}`.
Structures nest `attributes`; lists hold `items`; union content is a structure with `name` set to
the union key.

```json
{
  "type": "structure",
  "attributes": {
    "message": {
      "type": "text",
      "value": {"type": "static", "value": "Welcome, {{variable}}!"}
    },
    "variable": {
      "type": "text",
      "value": {
        "type": "dynamic",
        "expression": "user's name",
        "nullable": true,
        "default": "guest"
      }
    }
  }
}
```

- `expression` is CQL (see the `croct-cql` skill). `default` is used when evaluation fails,
  returns `null`, or returns an incompatible type.
- `nullable` must match the attribute's `optional` flag in the schema.
- Mark helper attributes like `variable` as `"private": true` in the schema so they stay out of
  the content delivered to the app.
- Content limits: up to 30 list items, up to 10 dynamic values, complexity score 50.
- Dynamic values are a Scale plan feature; localization is an add-on.

Placeholders, relative paths, fallbacks, and every content type:
[references/definition.md](references/definition.md).

## Localization

- Locales are configured per workspace. Localization is an add-on.
- Give each slot default content per supported locale. A locale without default content uses the
  default locale's content. Experiences and experiments also hold content per locale; an
  experience without content for a locale serves the slot's default content.
- Fallback when the requested locale is missing: the SDK docs say the **workspace's default
  locale**; the Content API docs say the **slot's default locale**. The docs disagree;
  say so rather than picking one.
- Request a locale in code with `preferredLocale` (per fetch) or `defaultPreferredLocale` (app
  wide), or `localeResolver` in Next.js/Hydrogen; see the `croct-integrate-sdk` skill.
- `croct.json` holds `defaultLocale` and `locales`; `croct install` downloads fallback content
  per slot, version, and locale. See the `croct-use-cli` skill.

## Versioning and breaking changes

1. Change the component schema, for example add an attribute or change an existing one (the
   docs' example).
2. When the change affects the content structure in a way that could break the app, Croct
   creates a new version and keeps serving the old one to the app.
3. Update the content of every affected slot and experience (the dashboard flags them).
4. Bump the slot version in the app code, for example `fetchContent('home-hero@2')`.

Do:
- Pin slot versions (`home-hero@1`) in app code. Unversioned IDs use the latest version, so
  breaking changes take effect immediately and can break the app.
- Update experience and experiment content too, not only slot default content.
- Keep fallback content in sync after changes (the `croct-use-cli` skill covers syncing).

Don't:
- Assume which edits are breaking. The docs do not list them; rely on the dashboard's slot
  impact alert.

## Refactoring

| Situation | Technique |
|---|---|
| A change should apply to most, but not all, usages | **Duplicate and modify**: duplicate the component, point the few exceptions to the copy, then change the original |
| A change should apply to only a few usages | **Duplicate and replace**: duplicate, change the copy, point those usages to the copy |
| Component hit the maximum nesting level | **Flatten and merge**: merge a nested structure's attributes into the parent, then update content everywhere it is used |
| Component near the complexity limit | Split into smaller components rendered by separate slots |
| Structure hit the 30-attribute limit | Guidance (the docs have no guide for this): group related attributes into nested structures, staying within 6 nesting levels, or split into separate components and slots. Pinned slot versions (`home-hero@1`) keep the live app on the old schema while you migrate |

Details, steps, and best practices: [references/design-and-refactoring.md](references/design-and-refactoring.md).

## Markdown in text attributes

- Rich text (`@croct/richText`) stores Markdown produced by a toolbar editor; restrict it with
  `allowedFormatting`.
- Plain `text` attributes store raw strings. To support Markdown there, parse it in the app, for
  example with `@croct/md-lite` (bold, italic, strike, code, link, image, paragraph).
- Keep it to simple formatting. Model CTA labels, URLs, and product data as separate attributes.
- State the supported syntax in the attribute `description`, for example
  "Supports markdown syntax for \*\*bold\*\*, \*italic\*, and \[links\]\(https://example.com\)."

Rendering code: [references/design-and-refactoring.md](references/design-and-refactoring.md#markdown-in-text-attributes).

## Pitfalls

- Creating components for single titles or images. Use primitives or structures.
- Generic names ("Product cards"). Prefer purpose names ("Product feature list").
- Union `types` keys that differ from the referenced component IDs: the schema is invalid.
- More than one `choices` entry with `"default": true`: the schema is invalid.
- Date/time values without seconds: `10:15` is invalid, `10:15:00` is valid.
- Dynamic values with `nullable` that disagrees with the schema `optional` flag.
- Previews show stale content when the experience's slot version differs from the app's version.

## Live docs

- Index: `https://docs.croct.com/llms.txt`
- Any page as markdown: `https://docs.croct.com/reference/content/schema/introduction.md`
- Search: `https://docs.croct.com/api/search.md?term=<terms>`
