---
name: croct-integrate-platforms
description: >-
  Use when connecting Croct to a third-party platform or migrating to Croct from another
  personalization or experimentation tool. Covers Storyblok (Optimize by Croct app,
  @croct/plug-storyblok, Storyblok withCroct, resolveContent, croct/plug-storyblok,
  CroctStoriesApi), Sanity and Strapi (slot fallback, dynamic zones, metadata.contentSource),
  Shopify Hydrogen storefront events, Shopify custom pixel (croctPixel, PUBLIC_CROCT_SHOPIFY_PIXEL, checkout and order tracking),
  VTEX, Google Tag Manager data layer, Microsoft Clarity tags, HubSpot forms (hbspt.forms.create,
  hs-form-event), firmographic providers 6sense, Demandbase, Clearbit Reveal, and ZoomInfo
  WebSights (firmographics attributes, account-based audiences in CQL), and migrations from
  Mutiny and Ninetailed (Experience component, Contentful sunset).
  Triggers include cdn.croct.io/plug-integration scripts, "personalize Storyblok blocks",
  "track Shopify checkout", "send VTEX events", "ABM personalization", "replace Mutiny".
---

# Croct platform integrations and migrations

Every integration here sits on top of a working Croct SDK. They either **feed data in** (events,
profile attributes), **send Croct data out** (Clarity), or **render slot content inside a platform's
content** (CMS, HubSpot form ID). Migrations replace another tool's flags or experiences with slots.

## Pick the integration

| Platform / goal                     | What the integration does                                                                 | Install method                                  | Reference                     |
|-------------------------------------|-------------------------------------------------------------------------------------------|-------------------------------------------------|-------------------------------|
| Storyblok                           | Optimize app links blocks to slots; SDK swaps linked blocks during story fetches (JS, PHP) | Storyblok app + `croct init` or `@croct/plug-storyblok` / `croct/plug-storyblok` | [storyblok.md](references/storyblok.md) |
| Sanity                              | Slot fetch with Sanity content as `fallback`; no Croct package                            | `croct init` + `fetchContent`                   | [headless-cms.md](references/headless-cms.md) |
| Strapi                              | Maps dynamic zone components to slots via a mapping slot                                  | `croct init` + `fetchContent`                   | [headless-cms.md](references/headless-cms.md) |
| Shopify Hydrogen                    | Automatic storefront events, customer identification; SDK usage lives in the `croct-integrate-sdk` skill | `croct init` (Hydrogen SDK)                     | [ecommerce.md](references/ecommerce.md) |
| Shopify checkout / orders (Liquid or Hydrogen) | Custom pixel tracks `checkoutStarted`, `orderPlaced`, plus custom events          | Storefront plugin + Shopify custom pixel        | [ecommerce.md](references/ecommerce.md) |
| Shopify Liquid theme                | JavaScript SDK for content; GTM integration for events; pixel for checkout                | Script tags                                     | [ecommerce.md](references/ecommerce.md) |
| VTEX Store Framework (VTEX IO)      | Forwards store events as goals and e-commerce events; enriches profiles                   | `vtex.js` script or GTM                         | [ecommerce.md](references/ecommerce.md) |
| Google Tag Manager / GA4 data layer | Forwards recommended data layer events as goals and e-commerce events                     | `google-tag-manager.js` script or GTM           | [analytics-and-crm.md](references/analytics-and-crm.md) |
| Microsoft Clarity                   | Tags Clarity sessions with Croct experiences, audiences, experiment variants              | `clarity.js` script or GTM                      | [analytics-and-crm.md](references/analytics-and-crm.md) |
| HubSpot forms                       | Submission goals, profile enrichment, form ID served from a slot for tests                | Code around the HubSpot embed                   | [analytics-and-crm.md](references/analytics-and-crm.md) |
| 6sense, Demandbase                  | Write rich `firmographics` attributes to the profile                                      | Croct script or GTM                             | [firmographics.md](references/firmographics.md) |
| Clearbit Reveal, ZoomInfo WebSights | Write company attributes to the profile via code you add                                  | GTM Custom HTML                                 | [firmographics.md](references/firmographics.md) |
| Migrating from Mutiny, Ninetailed   | Concept mapping and step-by-step replacement with slots, audiences, experiments | `croct init` + per-area slots                  | [migrations.md](references/migrations.md) |

Read only the reference for the platform at hand. If the platform is not listed, the docs have no
dedicated integration: say so and check `https://docs.croct.com/llms.txt` before improvising.

## Cross-cutting rules

1. **SDK first.** Every integration requires the Croct SDK on the page or server. Integration
   scripts do nothing without it. Set it up with `croct init` or see the `croct-integrate-sdk` skill.
2. **Prefer `croct init`** for Storyblok, Sanity, Strapi, Hydrogen, and migrations. It detects the
   stack and wires the SDK (and for Storyblok JS, wraps `storyblokInit` with `withCroct`). Use the
   manual steps only when the user asks or the CLI cannot wire it (for example, PHP Storyblok
   without a supported framework).
3. **CMS content is always the fallback.** Pass the existing CMS or hard-coded content as `fallback`
   so failed or slow requests render today's page. For Sanity, Strapi, and Ninetailed, ask the user
   where **default** content should live (Croct, recommended, or the CMS via
   `metadata.contentSource === 'slot'`). See [headless-cms.md](references/headless-cms.md).
4. **Croct components mirror the CMS schema** with the same attribute names, so slot content and
   CMS content are interchangeable in the same rendering component.
5. **Track goals before publishing** any experience or experiment, or early data shows exposures
   with no conversions.
6. **Firmographic data is not available on the first pageview.** Design account-based experiences
   to activate on later pageviews; use campaign, referrer, or location for the first impression.
7. **Custom attributes in CQL drop the `custom.` prefix:** `custom.firmographics.profile.industry`
   is `user's firmographics's profile's industry`. Profiles allow at most 10 custom attributes.
   For anything beyond these examples, see the `croct-cql` skill.
8. **Storyblok specifics:** Optimize requires the Scale plan and Storyblok vendor approval (via
   Croct support). Table and reference fields cannot be personalized.

## CDN integration scripts

All load from `https://cdn.croct.io/plug-integration/`:

| Script                         | Where                                     | Load timing                                      |
|--------------------------------|-------------------------------------------|--------------------------------------------------|
| `google-tag-manager.js`        | `<head>` or `<body>`, or GTM              | Any; replays the data layer                      |
| `clarity.js`                   | `<head>` or `<body>`, or GTM              | Any; waits for Clarity                           |
| `vtex.js`                      | `<head>` or `<body>`, or GTM              | **As early as possible**; earlier events are lost |
| `6sense.js`, `demandbase.js`   | `<head>` or `<body>`, or GTM              | Waits for the provider to identify the visitor   |
| `shopify-pixel.js`             | Liquid `layout/theme.liquid` before `</head>`, with `defer` | Any; registers with the SDK when it loads |
| `shopify-pixel-tracker.js`     | Imported inside the Shopify custom pixel  | n/a                                              |

### GTM tag recipe (relay to the user)

For any script above offered "via GTM": Tags > New; name it (for example, `Send data layer events to
Croct`); tag type **Custom HTML**; paste the `<script src="...">` tag; trigger
**Initialization - All Pages**; Save, then Submit to publish the container.

## Workflow

1. Identify the platform and goal from the table; open its reference.
2. Confirm the prerequisites listed there (account, SDK, provider tag, plan).
3. Make the code changes. Leave dashboard steps (Storyblok app, Shopify admin, GTM, Croct admin app)
   to the user as a concise checklist; the agent cannot perform them.
4. Give the user the verification steps from the reference.

## Stop and ask

- Which SDK or framework the site uses, if the repository does not make it obvious.
- For CMS integrations and Ninetailed: whether default content should live in Croct or the CMS.
- For the Shopify pixel: whether it should run for all visitors or only with analytics consent.
  This is a legal decision for the user.
- For firmographics: which provider they license. Do not add provider tags they do not have.

## Don't

- Don't invent attribute names for 6sense or Demandbase; use the tables in the reference.
- Don't try to track Shopify checkout with the SDK; checkout runs no storefront scripts. Use the pixel.
- On Hydrogen, don't expect the Shopify pixel to work on localhost, Oxygen previews, or a checkout
  domain that is not a subdomain of the storefront (the docs state this caveat for Hydrogen).
- Don't use the VTEX script for FastStore; use the GTM integration.
- Don't import audiences from Mutiny or Ninetailed; the docs say they are rewritten in CQL.
- Don't migrate a tool the docs have no migration guide for (only Mutiny and Ninetailed exist);
  say so and check `https://docs.croct.com/llms.txt` first.

## Live docs

- Index: `https://docs.croct.com/llms.txt`
- Any page as markdown: append `.md`, e.g. `https://docs.croct.com/immersion/integrations/ecommerce/vtex.md`
- Search: `https://docs.croct.com/api/search.md?term=<terms>`
