# Content definition reference

A content definition is JSON holding the actual values for the attributes of a schema. Slot
default content, experience content, experiment variants, and content groups all use it.

## Contents

- [Content types](#content-types)
- [Primitive values: text, number, boolean](#primitive-values-text-number-boolean)
- [Structure and union content](#structure-and-union-content)
- [List content](#list-content)
- [Dynamic values](#dynamic-values)
- [Placeholders](#placeholders)
- [Constraints and complexity score](#constraints-and-complexity-score)
- [Localization and where content lives](#localization-and-where-content-lives)

## Content types

| Schema type | Content `type` |
|---|---|
| `text` (incl. URL, color, date/time, enumeration) | `text` |
| `number` | `number` |
| `boolean` | `boolean` |
| `list` | `list` |
| `structure` | `structure` |
| `union` | `structure` with `name` set to the chosen variant |
| `reference` (component) | content of the referenced schema |
| `@croct/file` | based on text (the file URL) |
| `@croct/richText` | based on text (a Markdown string) |

The content definition docs list no separate content type for rich text. Its schema page says it
extends the text schema and the value is a Markdown string. Check
`https://docs.croct.com/reference/content/definition/types.md` before writing rich-text content by
hand.

## Primitive values: text, number, boolean

Shape: `{"type": "text" | "number" | "boolean", "value": StaticValue | DynamicValue}`.

Static value:

| Property | Notes |
|---|---|
| `type` | Always `static` |
| `value` | The value itself. For text, may contain placeholders |

Dynamic value:

| Property | Default | Notes |
|---|---|---|
| `type` | | Always `dynamic` |
| `expression` | | CQL expression that evaluates to the value |
| `nullable` | `false` | Whether the value can be `null`. Must match the attribute's `optional` flag |
| `default` | | Value (or `null`) used when evaluation fails, returns `null`, or returns an incompatible type |

```json
{"type": "text", "value": {"type": "static", "value": "Hello, world!"}}
```

```json
{
  "type": "text",
  "value": {
    "type": "dynamic",
    "expression": "location's cityName",
    "default": "Unknown"
  }
}
```

```json
{
  "type": "text",
  "value": {
    "type": "dynamic",
    "expression": "location's cityName",
    "nullable": true,
    "default": null
  }
}
```

```json
{"type": "number", "value": {"type": "dynamic", "expression": "cart's total", "default": 0}}
```

```json
{"type": "boolean", "value": {"type": "dynamic", "expression": "user is returning", "default": false}}
```

## Structure and union content

| Property | Notes |
|---|---|
| `type` | Always `structure` |
| `name` | Union only: the variant key from the union schema's `types` |
| `attributes` | Attribute name -> content definition |

```json
{
  "type": "structure",
  "attributes": {
    "heading": {"type": "text", "value": {"type": "static", "value": "Sign up for free"}},
    "subheading": {"type": "text", "value": {"type": "static", "value": "It only takes a few seconds."}}
  }
}
```

Union content (variant `text-hero`):

```json
{
  "type": "structure",
  "name": "text-hero",
  "attributes": {
    "heading": {"type": "text", "value": {"type": "static", "value": "Sign up for free"}},
    "subheading": {"type": "text", "value": {"type": "static", "value": "No credit card required."}}
  }
}
```

## List content

| Property | Notes |
|---|---|
| `type` | Always `list` |
| `items` | Array of content definitions |

```json
{
  "type": "list",
  "items": [
    {
      "type": "text",
      "value": {
        "type": "dynamic",
        "expression": "'Unlimited projects' if user's plan is 'premium' else null",
        "default": "1 project"
      }
    },
    {
      "type": "text",
      "value": {
        "type": "dynamic",
        "expression": "'Unlimited users' if user's plan is 'premium' else null",
        "default": "1 user"
      }
    }
  ]
}
```

## Dynamic values

- Any primitive value can be `dynamic`, computed with CQL from the user's context (profile,
  location, device). Write expressions with the `croct-cql` skill.
- Dynamic values are available only on the Scale plan.
- Content allows up to 10 dynamic values.
- To insert a dynamic value inside a larger text, put it in a separate attribute marked
  `"private": true` in the schema and reference it with a placeholder. Private attributes are
  editable in the dashboard but are not delivered to the app.

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
        "default": "guest",
        "nullable": true,
        "expression": "user's name"
      }
    }
  }
}
```

Result: "Welcome, John!" or "Welcome, guest!". Because `variable` is `nullable`, its schema
attribute must be `optional`.

## Placeholders

Insert the value of another attribute into a text value.

Syntax: `{{path}}` or `{{path | fallback}}`.

- Name notation: `title`. Index notation: `features[0]`. Combine: `features[1].label`.
- Absolute paths start at the content root: `{{promotion.discount}}`.
- Relative paths start with `..` and resolve from the placeholder's location: `{{..discount}}`
  is a sibling, `{{..[0]}}` is the first item of the parent list.
- Go up levels with a number: `..0` is the current level, `..1` the parent, so
  `{{..2.discount}}` is two levels up and `{{..2[0]}}` is the first item of the list two levels up.

Fallback rules:

- Used when the path points to a missing or non-primitive value. Without one, it is an empty
  string.
- Leading and trailing whitespace in the fallback is trimmed. Escape with `\` to keep a
  character, for example `{{description | \ No description}}` keeps a leading space.

Insertion by referenced type:

| Referenced value | Inserted as |
|---|---|
| Text | As is |
| Number | Formatted as text, same as JavaScript |
| Boolean | `true` or `false` |
| Anything else | Silently ignored; empty string |

Absolute paths:

```json
{
  "type": "structure",
  "attributes": {
    "message": {
      "type": "text",
      "value": {"type": "static", "value": "Get {{promotion.discount}}% off with code {{promotion.coupon}}!"}
    },
    "promotion": {
      "type": "structure",
      "attributes": {
        "discount": {"type": "number", "value": {"type": "static", "value": 30}},
        "coupon": {"type": "text", "value": {"type": "static", "value": "SAVE{{promotion.discount}}"}}
      }
    }
  }
}
```

Relative-path equivalent: `coupon` can use `"SAVE{{..discount}}"` because `discount` is its
sibling. From `message`, the sibling is `promotion`, so use `{{..promotion.discount}}` and
`{{..promotion.coupon}}` (the `{{..attribute.child}}` form).

Quick reference:

| Placeholder | Inserts |
|---|---|
| `{{attribute}}` | Root attribute `attribute` |
| `{{attribute.child}}` | `child` of root attribute `attribute` |
| `{{attribute \| fallback}}` | Root attribute, or `fallback` if missing |
| `{{attribute[n]}}` | nth item of root list `attribute` |
| `{{..attribute}}` | Sibling `attribute` |
| `{{..attribute.child}}` | `child` of sibling `attribute` |
| `{{..[n]}}` | nth item of the parent list |
| `{{..[n].attribute}}` | `attribute` of the nth item of the parent list |
| `{{..i.attribute}}` | Parent `attribute` `i` levels up |
| `{{..i[n]}}` | nth item of the parent list `i` levels up |
| `{{attribute \| \ fallback}}` | Fallback with an escaped leading space |

## Constraints and complexity score

- Up to 30 items in a list
- Up to 10 dynamic values
- Maximum complexity score of 50

Content complexity counts actual entries: structure = 1 + its attributes; list = 1 + each item;
primitive = 1. A structure with `heading`, `subheading`, and a two-item `features` list scores
1 + 3 + 2 = 6.

## Localization and where content lives

- Slot default content can be set per locale. A locale without default content uses the default
  locale's content. Localization is an add-on.
- Default content supports every definition feature, including dynamic values and localization.
- Experience content, experiment variant content, and content groups use the same definitions;
  each is edited per slot in the dashboard.

## Sources

- https://docs.croct.com/reference/content/definition/introduction.md
- https://docs.croct.com/reference/content/definition/placeholders.md
- https://docs.croct.com/reference/content/definition/types/text.md
- https://docs.croct.com/reference/content/definition/types/number.md
- https://docs.croct.com/reference/content/definition/types/boolean.md
- https://docs.croct.com/reference/content/definition/types/list.md
- https://docs.croct.com/reference/content/definition/types/structure.md
- https://docs.croct.com/explanation/slot.md
