# Set up the report findings in Croct

Turn the report's segments and components into a CLI template, then apply it with `croct use`.
The template creates audiences, components, slots, and draft experiences (with optional
experiments) in the user's workspace. Nothing is published.

## 1. Confirm the plan

Ask in one message, with the report's choices preselected:

| Ask                                              | Default                                                                                                                         |
|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| Which segments become audiences and experiences? | The first strategy's segment only                                                                                               |
| Which components become slots?                   | The 3 components in the report                                                                                                  |
| Which experiences get an A/B experiment?         | The first strategy's experience only                                                                                            |
| Goal ID per experiment                           | Ask. Suggest one that matches the site's main conversion (`demo-request`, `sign-up`, `purchase`) and say the code must track it |
| Workspace locale(s)                              | Check the website's main language                                                                                               |

Then check the preconditions:

- [ ] The user is logged in to the CLI. If not, ask them to run `croct login` in their own
  terminal (in Claude Code: `! npx croct@latest login`). Never ask for credentials.
- [ ] The project is linked to a workspace. If the working directory has a `croct.json`, use
  it. If the site's repo has no `croct.json`, ask whether to run `npx croct@latest init` first
  (see the `croct-use-cli` skill). The docs don't say how `croct use` picks a workspace without
  one, so run it interactively and let the CLI ask.
- [ ] Every locale used in the content exists in the workspace. Content for a missing locale
  fails.

## 2. Map the report to resources

| Report item          | Resource                                            | ID rule                                                                         |
|----------------------|-----------------------------------------------------|---------------------------------------------------------------------------------|
| Segment              | `audiences.<id>` with `name` and CQL `criteria`     | Kebab-case of the segment (`linkedin-hr-campaign`)                              |
| Component            | `components.<id>` with a schema                     | Kebab-case of the kind (`hero-section`, `cta`, `content-cards`, `testimonials`) |
| Component on a page  | `slots.<id>` with `component` and default `content` | Page + kind (`home-hero`, `pricing-cards`)                                      |
| Segment × components | One `experiences[]` entry, `"draft": true`          | Name: the segment label                                                         |
| A/B test             | `experiment` inside that experience                 | Name: what changes ("Home hero headline for HR")                                |

`create-resource` reuses a resource that already exists with the same ID and definition, so
reruns don't duplicate it. Capture created IDs through `result` when later actions need them,
because they may differ from the template's.

### Audiences

Build each audience from the evidence. Write and check the CQL with the `croct-cql` skill.

| Segment kind                | Criteria pattern                                                      | Use the values from                                                    |
|-----------------------------|-----------------------------------------------------------------------|------------------------------------------------------------------------|
| Paid campaign (any network) | `campaign's source is "linkedin" and campaign's name matches "hr"`    | `utm_*` values recorded from ad destinations                           |
| Paid search term            | `campaign's source is "google" and campaign's name matches "payroll"` | `utm_campaign` value                                                   |
| ABM account                 | `campaign's source is "linkedin" and campaign's name matches "acme"`  | ABM campaign names                                                     |
| Firmographic                | `user's industry is "Financial Services"`                             | Requires a firmographics integration (see `croct-integrate-platforms`) |
| Location                    | `location's city's name is "New York"`                                | Regional pages, hreflang, ad targeting                                 |
| Interest                    | `user's interests include "manufacturing"`                            | Industry, persona, or use-case URLs from the crawl                     |
| Landing page                | `session's landingPage matches "pricing"`                             | Landing page paths of ad destinations the libraries showed; never guessed |
| New or returning            | `user is not returning` / `user is returning`                         | Any site                                                               |
| Customers                   | `user's stats' orders > 0 or user's activities include "login"`       | Requires those events to be tracked                                    |
| Leads                       | `user's type is "lead"`                                               | Requires those events to be tracked                                    |

- Use the UTM values the site actually uses. Guessed values match nobody.
- Do not use event-based audiences since it is only available in the Scale plan.
- When an audience needs events or integrations the site doesn't send yet, keep it and list the
  missing tracking in the final summary.

### Components and slots

Keep schemas small: the attributes the personalized content changes, nothing more. Use
`croct-model-content` for anything beyond these patterns.

- Text: `{"type": "text", "minimumLength": 1}`.
- Link: `{"type": "text", "format": "url"}`.
- Image: a `text` attribute with `"format": "url"` is the simplest choice. The catalog
  templates also use the `@croct/file` reference.
- Do not create more than 3 components in total (this is the limit of the free plan)
- Repeated items: `{"type": "list", "items": {"type": "structure", "attributes": {...}}, "itemLabel": "Card"}`.

Slot default content = the component's current text from step 9 of the audit, so the slot
renders today's site until an experience changes it.

## 3. Write the files

```
croct-audit/<slug>/
  template.json5
  configuration/
    <component>-schema.json
    <slot>-slot-content.<locale>.json
    <slot>-<audience>-content.<locale>.json
```

### `template.json5`

Write it as strict JSON (valid JSON5) so you can validate it with `JSON.parse`.

```json5
{
  "$schema": "https://schema.croct.com/json/v1/template.json",
  "title": "Acme audit",
  "description": "Audiences, components, slots, and draft experiences from the Acme audit.",
  "actions": [
    {
      "name": "create-resource",
      "resources": {
        "audiences": {
          "linkedin-hr-campaign": {
            "name": "LinkedIn HR campaign",
            "criteria": "campaign's source is \"linkedin\" and campaign's name matches \"hr\""
          }
        },
        "components": {
          "cta": {
            "name": "CTA",
            "description": "A call to action button.",
            "schema": "${import('./configuration/cta-schema.json')}"
          },
          "hero-section": {
            "name": "Hero section",
            "description": "A big section featured at the top of a page.",
            "schema": "${import('./configuration/hero-section-schema.json')}"
          }
        },
        "slots": {
          "home-hero": {
            "name": "Home hero",
            "component": "hero-section",
            "content": {
              "en": "${import('./configuration/home-hero-slot-content.en.json')}"
            }
          }
        },
        "experiences": [
          {
            "name": "LinkedIn HR campaign",
            "draft": true,
            "audiences": ["linkedin-hr-campaign"],
            "slots": ["home-hero"],
            "content": {
              "default": {}
            },
            "experiment": {
              "name": "Home hero for HR",
              "goalId": "demo-request",
              "crossDevice": false,
              "traffic": 1,
              "variants": [
                {
                  "name": "Current hero",
                  "baseline": true,
                  "allocation": 500,
                  "content": {
                    "default": {
                      "home-hero": {"en": "${import('./configuration/home-hero-slot-content.en.json')}"}
                    }
                  }
                },
                {
                  "name": "HR hero",
                  "baseline": false,
                  "allocation": 500,
                  "content": {
                    "default": {
                      "home-hero": {"en": "${import('./configuration/home-hero-linkedin-hr-campaign-content.en.json')}"}
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "print",
      "semantics": "success",
      "message": "Audit resources created as drafts. Review and publish them in the Croct dashboard."
    }
  ]
}
```

Experience without an experiment: drop `experiment` and put the personalized content in
`content.default`:

```json
"content": {
  "default": {
    "home-hero": {"en": "${import('./configuration/home-hero-linkedin-hr-campaign-content.en.json')}"}
  }
}
```

Rules:

- `"draft": true` on every experience. The default is `false`, which publishes immediately.
- `traffic` is a share from 0 to 1. `allocation` is a relative weight; at least two variants;
  mark the current content as `baseline`.
- `crossDevice: false` always.
- Slots listed in an experience must have content for every locale in that experience.
- When the working directory is the site's repo with a `croct.json` and the user wants code
  wired up, add an `add-slot` action after `create-resource`, using IDs captured from its
  `result`:

  ```json
  {"name": "add-slot", "slots": ["${this.homeHeroId}@${this.homeHeroVersion}"]}
  ```

  with `"result": {"slots": {"home-hero": {"id": "homeHeroId", "version": "homeHeroVersion"}}}`
  on the `create-resource` action.

### Component schema (`configuration/hero-section-schema.json`)

```json
{
  "$schema": "https://schema.croct.com/json/v1/template-content-schema.json",
  "type": "structure",
  "attributes": {
    "heading": {
      "type": {"type": "text", "minimumLength": 1},
      "label": "Heading",
      "optional": false,
      "position": 0
    },
    "tagline": {
      "type": {"type": "text", "minimumLength": 1},
      "label": "Tagline",
      "optional": false,
      "position": 1
    }
  }
}
```

### Content (`configuration/home-hero-slot-content.en.json`)

```json
{
  "$schema": "https://schema.croct.com/json/v1/template-content.json",
  "type": "structure",
  "attributes": {
    "heading": {"type": "text", "value": {"type": "static", "value": "Digitize your stores"}},
    "tagline": {"type": "text", "value": {"type": "static", "value": "Real-time shelf data for every aisle."}}
  }
}
```

A list attribute's content is `{"type": "list", "items": [ ...one content object per item ]}`.
Personalized content follows the same shape. Write it from the ad's angle and the gap it closes,
using the site's real wording and links. Never invent metrics, customers, or quotes.

## 4. Validate, confirm, run

1. Parse every file:

   ```sh
   node -e 'for (const f of process.argv.slice(1)) JSON.parse(require("fs").readFileSync(f, "utf8"))' \
     croct-audit/<slug>/template.json5 croct-audit/<slug>/configuration/*.json
   ```

2. Check that every audience, component, and slot ID referenced by an experience, slot, or
   reference attribute is defined in the template or already exists in the workspace.
3. Show a summary table (audiences with criteria, slots with components, experiences with
   experiments and goals) and ask for a yes.
4. Run from the project root:

   ```sh
   npx croct@latest use ./croct-audit/<slug>/template.json5
   ```

   The CLI shows the title and asks for confirmation. If the agent's shell can't answer
   prompts, ask the user to run the same command themselves (in Claude Code:
   `! npx croct@latest use ./croct-audit/<slug>/template.json5`).

| Error                            | Do                                                                                    |
|----------------------------------|---------------------------------------------------------------------------------------|
| Not logged in or session expired | Ask the user to run `croct login`, then retry                                         |
| No project or workspace          | Ask whether to run `croct init` in the site's repo, then retry                        |
| Locale doesn't exist             | Change the locale keys to the workspace's locale, or ask the user to add the locale   |
| Quota or plan limit              | Drop the lowest-priority segments or slots and retry; tell the user what was left out |
| Invalid CQL                      | Fix it with the `croct-cql` skill                                                     |
| Schema or content mismatch       | Make the content match its schema attribute by attribute                              |

Add `--debug` to see details when an error is unclear.

## 5. Hand off

Tell the user what was created, then the remaining steps:

1. Render each slot in the site's code with the recommended SDK (the `croct-integrate-sdk`
   skill), or let `add-slot` and `croct install` generate types and fallback content.
2. Track each experiment's goal: `croct.track('goalCompleted', {goalId: '<goal-id>'})` at the
   conversion point (the `croct-track-events` skill).
3. Track the events any audience depends on (`postViewed`, `leadGenerated`, orders, sign-ups).
4. Preview each draft experience, then publish it from the Croct dashboard.

## Sources

- https://docs.croct.com/reference/cli/templates/actions/create-resource.md
- https://docs.croct.com/reference/cli/templates/actions.md
- https://docs.croct.com/reference/cli/commands/use.md
- https://docs.croct.com/reference/cli/commands/login.md
- https://docs.croct.com/explanation/audience/popular-audiences.md
