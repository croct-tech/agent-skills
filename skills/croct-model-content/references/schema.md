# Schema reference

A schema is JSON that specifies the shape of content. The dashboard visual editor generates the
same JSON, so a component can be built visually or by uploading a schema file.

## Contents

- [Components and top-level schemas](#components-and-top-level-schemas)
- [Structure](#structure)
- [Union](#union)
- [Reference](#reference)
- [Text](#text) (also URL, color, date/time, enumeration)
- [Rich text](#rich-text)
- [File](#file)
- [Number](#number)
- [Boolean](#boolean)
- [List](#list)
- [Constraints and complexity score](#constraints-and-complexity-score)
- [Worked example](#worked-example)

## Components and top-level schemas

- A component is a unique name given to a top-level schema, which other schemas can reference.
- Only `structure` and `union` can be top-level schemas. `text`, `number`, `boolean`, and `list`
  cannot be components.
- Schema types: `number`, `boolean`, `text`, `list`, `structure`, `reference`, `union`
  Dashboard types Enumeration, Color, URL, File, and Rich text are configurations of these
  basic types. File and Rich text are references to `@croct/file` and `@croct/richText`.

## Structure

A group of attributes. Renders as a form at the root, or as a group of fields when nested.

| Property | Type | Required | Notes |
|---|---|---|---|
| `type` | string | yes | Always `structure` |
| `title` | string | no | Up to 60 characters. Label in lists and union selectors |
| `description` | string | no | Up to 160 characters. Basic Markdown |
| `attributes` | `Record<string, Attribute>` | no | Attribute name -> definition |

Attribute properties:

| Property | Type | Default | Notes |
|---|---|---|---|
| `type` | Schema | required | Any schema type |
| `label` | string | none | Up to 60 characters. Field label in the editor |
| `description` | string | none | Up to 160 characters. Basic Markdown |
| `optional` | boolean | `false` | Whether the attribute may be absent |
| `private` | boolean | `false` | Visible only in the editor; excluded from the final content. Use for helper values such as dynamic variables referenced by placeholders |
| `position` | integer | no order | Lower positions first; equal positions have no guaranteed order; attributes without position come last |

Basic Markdown supported in `description` fields (structure, union, attribute, choice):
`**bold**`, `*italic*`, `` `code` ``, `[link](https://croct.com)`.

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
      "type": {"type": "text"}
    },
    "link": {
      "label": "Link",
      "description": "The URL of the page to link to.",
      "position": 1,
      "type": {"type": "text"}
    }
  }
}
```

## Union

One of several component variations. Renders as a drop-down to pick a variant, each with its own
fields.

| Property | Type | Notes |
|---|---|---|
| `type` | string | Always `union` |
| `title` | string | Up to 60 characters. Label in lists and component selectors |
| `description` | string | Up to 160 characters. Basic Markdown |
| `types` | `Record<string, Reference>` | Component ID -> reference schema. Up to 10 components |

The keys of `types` must match the IDs of the referenced components, or the schema is invalid.

```json
{
  "type": "union",
  "types": {
    "text-hero": {"type": "reference", "id": "text-hero"},
    "image-hero": {"type": "reference", "id": "image-hero"}
  }
}
```

## Reference

Reuses a component. The editor input is the referenced component's input.

| Property | Type | Notes |
|---|---|---|
| `type` | string | Always `reference` |
| `id` | string | ID of the referenced component |

Built-in references (`@croct/file`, `@croct/richText`) take their options in a `properties`
object, as shown in their sections below.

```json
{"type": "reference", "id": "button"}
```

## Text

Textual values: titles, colors, URLs, dates, enumerations. Renders as a text field, text area,
color input, date/time picker, or select box depending on configuration.

`format` and `choices` cannot be used with any other property except `type`.

| Property | Type | Default | Notes |
|---|---|---|---|
| `type` | string | required | Always `text` |
| `minimumLength` | number | none | Minimum length |
| `maximumLength` | number | maximum allowed | Capped at 300 for single-line text, 1000 for multi-line text and URLs. Because `format` excludes other properties, the multi-line and URL caps are implicit; you cannot set `maximumLength` alongside `format` |
| `format` | string | none | See formats below |
| `pattern` | string | none | Regex without delimiters, up to 100 characters, for example `^[a-z0-9]+$` |
| `choices` | `Record<string, Choice>` | none | Value -> choice. Up to 20 choices |

Formats:

| Format | Meaning | Example |
|---|---|---|
| `multiline` | Multi-line text, rendered as a text area | |
| `color` | Hexadecimal color | `#ff0000`, `#f00` |
| `url` | URL per the WHATWG URL specification | |
| `local-date` | Calendar day, no time or zone | `2025-06-15` |
| `local-time` | Time of day, no date or zone | `10:15:30` |
| `local-date-time` | Date and time, no zone | `2025-06-15T10:15:30` |
| `zoned-date-time` | Date and time with offset and zone | `2025-06-15T10:15:30-04:00[America/New_York]` |
| `instant` | Exact moment in UTC | `2025-06-15T14:15:30Z` |

Date and time formats follow ISO 8601 and always include seconds: `10:15` is invalid, `10:15:00`
is valid.

Choice properties:

| Property | Type | Default | Notes |
|---|---|---|---|
| `label` | string | the choice value | Up to 60 characters |
| `description` | string | none | Up to 160 characters. Basic Markdown |
| `default` | boolean | `false` | Preselected in the editor. Only one choice may be default, or the schema is invalid |
| `position` | integer | none | Same ordering rules as attribute `position` |

```json
{"type": "text"}
```

```json
{"type": "text", "format": "color"}
```

```json
{"type": "text", "format": "url"}
```

```json
{"type": "text", "format": "instant"}
```

```json
{
  "type": "text",
  "choices": {
    "left": {"label": "Left"},
    "center": {"label": "Center"},
    "right": {"label": "Right"}
  }
}
```

## Rich text

Formatted text edited with a toolbar. The value is a CommonMark Markdown string such as
`Get **50% off** on [all products](https://example.com)`.

Rich text is not a separate type: it extends the text schema and interprets the text as formatted
content. Reference it with the `@croct/richText` ID and put its options under `properties`. Do not
write `{"type": "rich-text"}`.

| Property | Type | Default | Notes |
|---|---|---|---|
| `format` | string | single line | Only `multiline` is supported; it lets the text span multiple lines |
| `minimumLength` | number | none | Includes formatting characters |
| `maximumLength` | number | maximum allowed | Includes formatting characters. Capped at 300 single-line, 1000 multi-line |
| `allowedFormatting` | `Array<string>` | all | At least one option |

| Formatting | Markdown |
|---|---|
| `bold` | `**bold**` |
| `italic` | `*italic*` |
| `strikethrough` | `~~strikethrough~~` |
| `inline-code` | `` `code` `` |
| `link` | `[text](https://example.com)` |
| `image` | `![alt](https://example.com/image.png)` |
| `heading` | `# Heading` |
| `quote` | `> Quote` |
| `unordered-list` | `- Item` |
| `ordered-list` | `1. Item` |
| `code-block` | Lines between triple-backtick fences |

```json
{
  "type": "reference",
  "id": "@croct/richText",
  "properties": {}
}
```

```json
{
  "type": "reference",
  "id": "@croct/richText",
  "properties": {
    "format": "multiline",
    "maximumLength": 500
  }
}
```

```json
{
  "type": "reference",
  "id": "@croct/richText",
  "properties": {
    "allowedFormatting": ["bold", "italic", "link"]
  }
}
```

## File

URL to an uploaded file (image, video, audio, document), rendered as a file uploader. It extends
the text schema with upload validation, so it is a reference to `@croct/file`, not its own type.

| Property | Type | Default | Notes |
|---|---|---|---|
| `allowedTypes` | `Array<string>` | all supported types | MIME types |
| `minimumSize` | number | no minimum | Bytes, inclusive. 10KB = `10240` |
| `maximumSize` | number | `5242880` (5 MB) | Bytes, inclusive. Cannot exceed 5 MB. 1MB = `1048576` |

Supported MIME types: `image/png`, `image/jpeg`, `image/jp2`, `image/webp`, `image/gif`,
`image/svg+xml`, `image/avif`, `video/mp4`, `video/quicktime`, `video/x-webm`, `audio/mpeg`,
`audio/mp4`, `audio/wav`, `audio/x-wav`, `audio/x-ms-wma`, `audio/ogg`, `audio/aac`,
`application/json`, `text/plain`.

```json
{"type": "reference", "id": "@croct/file", "properties": {}}
```

```json
{
  "type": "reference",
  "id": "@croct/file",
  "properties": {
    "allowedTypes": ["image/png", "image/jpeg"],
    "minimumSize": 1024,
    "maximumSize": 1048576
  }
}
```

## Number

Prices, quantities, percentages. Renders as a numeric text field.

| Property | Type | Default | Notes |
|---|---|---|---|
| `type` | string | required | Always `number` |
| `integer` | boolean | `false` | Integers only |
| `minimum` | number | no minimum | Inclusive |
| `maximum` | number | no maximum | Inclusive |

```json
{"type": "number", "integer": true}
```

```json
{"type": "number", "minimum": 0, "maximum": 100}
```

## Boolean

On/off or yes/no. Renders as a toggle with a label for each state.

| Property | Type | Default | Notes |
|---|---|---|---|
| `type` | string | required | Always `boolean` |
| `label` | `{true: string, false: string}` | `"True"` / `"False"` | Each up to 60 characters |
| `default` | boolean | `false` | Preselected value in the editor |

```json
{
  "type": "boolean",
  "label": {"true": "Visible", "false": "Hidden"}
}
```

## List

Collections of tags, images, products. Items can be any schema, including nested lists and
structures. Editors can add, remove, reorder, and rename items (default names are "Item 1",
"Item 2").

| Property | Type | Default | Notes |
|---|---|---|---|
| `type` | string | required | Always `list` |
| `items` | Schema | required | Schema of each item |
| `itemLabel` | string | none | Up to 60 characters. Prefix for item names: "Tag" -> "Tag 1", "Tag 2" |
| `minimumLength` | number | `0` | Inclusive |
| `maximumLength` | number | `30` | Inclusive |

```json
{
  "type": "list",
  "items": {"type": "text"},
  "itemLabel": "Tag",
  "minimumLength": 1,
  "maximumLength": 3
}
```

## Constraints and complexity score

- Up to 30 attributes per structure
- Nesting up to 6 levels deep
- Up to 10 components in a union
- Maximum complexity score of 50

The component editor shows how close a component is to these limits.

Complexity score, starting at 0:

| Element | Adds |
|---|---|
| Structure | 1 + complexity of its attributes |
| List | 1 + complexity of its item type |
| Primitive (text, boolean, number) | 1 |
| Union | Complexity of its most complex component |
| Reference | Complexity of the referenced component |

Example: a list (1) of product structures (1) with title, image, and price (3) = 5.

## Worked example

A banner component combining documented properties: a required headline with a length cap, an
optional image restricted to PNG/JPEG, an alignment enumeration, and a reusable CTA component.

```json
{
  "type": "structure",
  "title": "Image banner",
  "description": "A banner with a headline, an image, and a call to action.",
  "attributes": {
    "headline": {
      "label": "Headline",
      "description": "Supports markdown syntax for **bold** and *italic*.",
      "position": 0,
      "type": {"type": "text", "maximumLength": 80}
    },
    "image": {
      "label": "Image",
      "optional": true,
      "position": 1,
      "type": {
        "type": "reference",
        "id": "@croct/file",
        "properties": {"allowedTypes": ["image/png", "image/jpeg"]}
      }
    },
    "alignment": {
      "label": "Alignment",
      "position": 2,
      "type": {
        "type": "text",
        "choices": {
          "left": {"label": "Left", "default": true},
          "center": {"label": "Center"},
          "right": {"label": "Right"}
        }
      }
    },
    "cta": {
      "label": "Call to action",
      "position": 3,
      "type": {"type": "reference", "id": "cta-button"}
    }
  }
}
```

Complexity: structure 1 + headline 1 + image 1 + alignment 1 + `cta-button` (structure 1 +
label 1 + link 1 = 3) = 7. `cta-button` is assumed to be the CTA Button structure shown above.

## Sources

- https://docs.croct.com/reference/content/schema/introduction.md
- https://docs.croct.com/reference/content/schema/types/structure.md
- https://docs.croct.com/reference/content/schema/types/union.md
- https://docs.croct.com/reference/content/schema/types/reference.md
- https://docs.croct.com/reference/content/schema/types/text.md
- https://docs.croct.com/reference/content/schema/types/rich-text.md
- https://docs.croct.com/reference/content/schema/types/file.md
- https://docs.croct.com/reference/content/schema/types/number.md
- https://docs.croct.com/reference/content/schema/types/boolean.md
- https://docs.croct.com/reference/content/schema/types/list.md
- https://docs.croct.com/explanation/component.md
