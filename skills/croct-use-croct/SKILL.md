---
name: croct-use-croct
description: >-
  Use when a task involves Croct in any way and you need orientation: what Croct is, how its
  concepts fit together (organization, workspace, application, component, slot, experience,
  audience, experiment, default and fallback content), which Croct skill to load next, or how
  to look up the live Croct documentation. Triggers: "Croct", croct.com, app.croct.com,
  docs.croct.com, `croct.json`, `npx croct`, `@croct/*` packages, `croct/plug-*` PHP packages,
  slot IDs like `home-hero@1`, "personalization management system", adding personalization or
  A/B testing to a site with Croct, or replacing Optimizely, VWO, Mutiny, or
  Ninetailed with Croct.
---

# Work with Croct

Croct is a component CMS with built-in personalization, A/B testing, and analytics. Developers
integrate a **slot** once; after that, marketers manage content, audiences, experiences, and
experiments in the dashboard (`app.croct.com`) without code changes. It runs standalone or on top
of an existing CMS (Storyblok, Sanity, Strapi) or commerce platform (Shopify, VTEX).

## Pick the right skill

Load the one skill that matches the task, then add others only when the task crosses into them.

| Task | Skill |
| --- | --- |
| Set up Croct in a project, `croct init`, add/remove slots or components, regenerate types or fallback content, edit `croct.json`, write CLI templates | `croct-use-cli` |
| Render slot content, evaluate queries, identify users, prerender, test, or debug with an SDK (JavaScript, React, Next.js, Vue, Nuxt, Hydrogen, PHP, Laravel, Symfony, Drupal) | `croct-integrate-sdk` |
| Design components and slots, write schema or content definition JSON, handle versioning and breaking changes, refactor components | `croct-model-content` |
| Write, read, or debug CQL (audiences, `evaluate`, dynamic values) | `croct-cql` |
| Track events and goals, set user/session attributes, identity, first-party proxy, ad blockers | `croct-track-events` |
| Plan experiences and experiments, feature flags, redirect tests, playbooks, read analytics | `croct-personalize-and-test` |
| Call Croct HTTP APIs directly (content, evaluation, event tracking, data export), API keys, tokens | `croct-use-api` |
| Integrate with Storyblok, Sanity, Strapi, Shopify, VTEX, GTM, Clarity, HubSpot, firmographics providers, or migrate from Mutiny, Ninetailed | `croct-integrate-platforms` |

## Default path for "add Croct to my project"

1. Ask the user to run `npx croct@latest init` from the project root (it is interactive and needs a
   login), or use its non-interactive form described in `croct-use-cli`. It signs the user in (or creates a
   free account), selects or creates the organization, workspace, and application, installs the
   SDK that matches the framework, and writes `croct.json`. Details: `croct-use-cli`.
2. Add a slot (`npx croct@latest add slot home-hero@1 --example`) to get generated types, fallback content, and a usage
   example. Render it with the SDK. Details: `croct-integrate-sdk`.
3. Track the goal events the team cares about (sign-ups, orders, leads) so experiments have a
   conversion to measure. Details: `croct-track-events`.
4. Hand the rest to the dashboard: audiences, experiences, experiments, scheduling, preview.

Do not hand-wire an SDK when the CLI supports the framework; use manual installation only when
the user asks for it or the CLI cannot run.

## Mental model

```
Organization ─┬─ Workspace ─┬─ Application (development)   ← app ID used by the SDK
              │             ├─ Application (production)
              │             ├─ Components  (content schemas, versioned)
              │             ├─ Slots       (placements; each bound to one component; versioned)
              │             ├─ Audiences   (CQL conditions)
              │             └─ Experiences ─ Experiment (optional, one at a time)
```

| Concept | What it is | Key facts |
| --- | --- | --- |
| Organization | Top level; a company or personal project | Owns workspaces; roles govern access |
| Workspace | A business unit, product, or project | Holds user data, components, slots, audiences, experiences, experiments |
| Application | A channel (website, app) in one workspace | Usually one per environment (development, production); carries trusted origins, API keys, locale and privacy settings |
| Component | Reusable content schema | **Regular** (fixed attributes) or **union** (one of several regular components); versioned on breaking change |
| Slot | A placement in the UI (hero, top bar, banner) bound to one component | Holds the **default content**; referenced in code by ID and major version, e.g. `home-hero@1` |
| Audience | Who sees something | Written in CQL, e.g. `user is returning` |
| Experience | Who (audiences) × where (slots) × what (content) | Statuses: active, paused, draft, scheduled, archived; **priority** decides between overlapping experiences on the same slot |
| Experiment | A/B/n test inside an experience | 2–5 variants, a primary goal ID, traffic allocation; Bayesian analysis; one per experience at a time |
| Content groups | Extra variations per audience segment inside an experience or experiment | |
| Default content | Slot content shown when no experience matches, a locale has no content, static rendering is requested, or an error occurs | Managed in the dashboard; localizable |
| Fallback content | Content bundled in the app for when fetching fails | Generated by the CLI from the default content, or supplied by the app/CMS |

Content resolution for a slot, highest first: experiment variant → experience content (by
priority) → slot default content → fallback content bundled in the application.

More detail (statuses, priority, scheduling, versioning, preview links, trusted origins):
[references/concepts.md](references/concepts.md).

## Rules that apply everywhere

- **Pin slot versions in code** (`home-hero@1`). An unversioned slot ID always resolves to the
  latest version, so a breaking schema change in the dashboard can break the live app.
- **Always ship fallback content.** The CLI generates it per slot; keep it in sync after content
  changes (`croct-use-cli`).
- **Keep secrets server-side.** The application ID is public and used by client SDKs. API keys
  are secret, created by an Owner or Manager, shown once, and their permissions cannot be
  changed later. Never ask the user to paste an API key or password into the chat; have them put
  it in an environment variable or run `croct login` themselves.
- **Trusted origins:** content does not load on domains that are not listed in the
  application's trusted origins. Check this first when content works locally but not on a new
  domain or subdomain.
- **Goals before experiments.** An experiment needs a primary goal ID that the app already
  tracks (a `goalCompleted` event with the same ID).
- **Do not change traffic allocation or add/remove variants mid-experiment**; it invalidates the
  results.
- Things only the dashboard does (creating audiences, experiences, experiments, preview links,
  priority, scheduling): explain the steps to the user instead of trying to automate them.

## Look up the live docs

The bundled skills cover the common paths. When you need an exact signature, option, or a page
they do not cover, read the documentation directly. Every page is available as plain markdown:

| Need | Request |
| --- | --- |
| Index of all pages | `https://docs.croct.com/llms.txt` |
| Everything in one file (large) | `https://docs.croct.com/llms-full.txt` |
| One page as markdown | Append `.md` to the page URL, e.g. `https://docs.croct.com/explanation/slot.md` |
| Search | `https://docs.croct.com/api/search.md?term=<url-encoded terms>` |

Prefer search or the index over guessing a URL. Main sections: `/explanation` (concepts),
`/immersion` (tutorials, guides, integrations, playbooks), `/reference` (CLI, SDKs, CQL, events,
APIs, content schema, analytics).
