# Personalization recipes

Condensed from the Croct playbooks. Every recipe follows the same dashboard flow:

1. Experiences > **New experience**.
2. **Audience** tab > **New audience** > paste the criteria below (replace `"something"`).
3. **Slot** tab > select one or more slots. Selecting several across the site keeps the message
   consistent.
4. **Content** tab > set the personalized content.
5. **Preview**, then **Publish**.

Common prerequisite for all recipes: a slot integrated in the project. The extra prerequisite
column lists what the agent must wire in code first. CQL details: the `croct-cql` skill.

Some recipes have a CLI template on croct.com/templates that configures the experience instead of
using the dashboard manually.

## Index

| Recipe | Audience signal | Extra prerequisite | Suggested slots | Template |
|---|---|---|---|---|
| ABM ads | UTM source and campaign name | None (optional firmographics provider) | Hero, logo cloud, testimonials | SaaS `abm-campaign` |
| Blog readers | Posts viewed (title, tags) | Track `postViewed` | Newsletter form, hero, announcement bar | — |
| Customers | Orders placed or signed up | Track account or e-commerce events | Announcement bar, hero, callouts | SaaS `customer` |
| Free shipping | Location + cart total | Track e-commerce events | Announcement bar, hero, callouts | E-commerce `cart` |
| HubSpot forms | Any (personalize) or all users (test) | Form ID in a slot; `goalCompleted` on submit for tests | The form slot (e.g. `hubspot-form`) | — |
| Interests | Pages, posts, product categories, interests | Optional `interestShown` | Announcement bar, hero, callouts | SaaS and e-commerce `interest` |
| Leads | Became a lead, no order or sign-up | Track `leadGenerated`, account, or e-commerce events | Announcement bar, hero, callouts | — |
| Location | City, country, location tags | None | Announcement bar, hero, carousel | E-commerce `location` |
| Marketing campaigns | UTM source and campaign name | None | Hero, product cards, plan cards | SaaS and e-commerce `marketing-campaign` |
| Organic intent | Session landing page and activity | None | Hero, product card, plan cards | — |
| Search terms | UTM source and term | Campaign URLs include `utm_term` | Hero, product cards, plan cards | SaaS and e-commerce `search-campaign` |

These 11 are the only documented playbooks. For anything else (exit intent, popups, timers), say
the docs have no playbook for it and check `https://docs.croct.com/llms.txt` before improvising.

## ABM ads-based personalization

Align on-site content with the accounts targeted in B2B ads (for example, LinkedIn ABM).

```cql
campaign's source is "linkedin"
and campaign's name matches "acme"
```

To reach organic visitors from target accounts, use firmographic data from Clearbit, Demandbase,
ZoomInfo, or 6sense (see the `croct-integrate-platforms` skill).

## Blog readers

Continue the conversation started by the posts a user read. Requires the Post viewed event.

```cql
user has viewed a post with title like "something"
or with tags including "something"
```

## Customers

Avoid showing acquisition offers to existing customers; surface cross-sell and upsell instead.

```cql
user has placed an order
or user has signed up
```

Widen reach with campaign traffic: append `or campaign's name matches "something"`.

## Free shipping

Communicate the threshold that applies to the visitor's location and cart.

```cql
location's state's code is "NY"
and cart's total is less than 100
```

Content example: "Free shipping to New York for orders over $100". With several ranges, add one
audience per range and use content groups for the respective content.

## HubSpot forms

The form ID lives in a slot, so an experience or experiment changes which form renders. Setting up
the slot and submission tracking: the HubSpot forms integration (see the
`croct-integrate-platforms` skill).

- **Personalize**: audience such as the one below, slot `hubspot-form`, set `formId` to the
  form this audience should see.

  ```cql
  campaign's source is "linkedin"
  and campaign's name matches "enterprise"
  ```

- **Test**: audience all users or a segment (for example `user is returning`); experiment named
  e.g. `Form length test` with goal `form-submission`, 100% allocation, two variants split 50/50,
  variant A with the current `formId`, variant B with the alternative. Read the Performance per
  goal widget; when a variant clearly wins, apply its form to the experience and stop the
  experiment.

## Interests

Infer interests of anonymous visitors from browsing behavior. Pick one signal or combine them:

```cql
user has viewed a page with url like "something"
```

```cql
user has viewed a post with title like "something"
```

```cql
user has viewed a product with category "something"
```

For more precision, track the Interest shown event and add it:

```cql
user has viewed a page with url like "something"
or user has shown interest in "something"
```

## Leads

Convert leads into customers with first-purchase offers or content that addresses their pain
points.

```cql
user has become a lead
and user has not placed an order
and user has not signed up
```

## Location

Tailor content by region without affecting other visitors.

```cql
location's city's name is "New York"
or location's tags include "beach"
```

Location tags are semantic labels describing the type of place.

## Marketing campaigns

Match on-site messaging to the ad the user clicked (Instagram, Facebook, and so on) without
building separate landing pages.

```cql
campaign's source is "meta"
and campaign's name matches "something"
or user has viewed campaign with name like "something" in the last week
```

The last line reaches returning visitors who engaged with the campaign earlier.

## Organic intent

Use the landing page of organic traffic to infer intent.

```cql
session's landingPage matches "something"
and (
    property pageviews of session's stats > 3
    or property clicks of session's stats > 5
)
```

The parenthesized part is optional and narrows the audience to engaged sessions.

## Search terms

Match content to the paid search term. Campaign URLs must include `utm_term`.

```cql
campaign's source is "google"
and campaign's term matches "something"
or user has viewed campaign with term like "something" in the last week
```

Keep the on-site offer consistent with the ad.

## Turning a recipe into a test

Any recipe can carry an experiment to prove the personalized content beats the generic one: add
an experiment to the experience, keep a control variant with the current content, track a
`goalCompleted` event for the conversion, and read the results as described in `analytics.md`.

## Sources

- https://docs.croct.com/immersion/playbooks/abm-campaigns.md
- https://docs.croct.com/immersion/playbooks/blog-readers.md
- https://docs.croct.com/immersion/playbooks/customers.md
- https://docs.croct.com/immersion/playbooks/free-shipping.md
- https://docs.croct.com/immersion/playbooks/hubspot-forms.md
- https://docs.croct.com/immersion/playbooks/interests.md
- https://docs.croct.com/immersion/playbooks/leads.md
- https://docs.croct.com/immersion/playbooks/location.md
- https://docs.croct.com/immersion/playbooks/marketing-campaigns.md
- https://docs.croct.com/immersion/playbooks/organic-intent.md
- https://docs.croct.com/immersion/playbooks/search-terms.md
- https://docs.croct.com/explanation/content/groups.md
