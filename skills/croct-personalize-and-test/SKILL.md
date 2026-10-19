---
name: croct-personalize-and-test
description: >-
  Use when planning or implementing personalization or A/B testing with Croct: creating an
  experience (audience, slots, content, priority, scheduling, drafts), adding an experiment
  (A/B/n, primary goal ID, traffic allocation, variants, cross-device consistency), wiring the
  code it needs (slots, `croct.track('goalCompleted', {goalId})`, `orderPlaced`,
  `leadGenerated`, `userSignedUp`), server-side feature-flag experiments, redirect experiments,
  personalization recipes (UTM campaigns, ABM, search terms, location, free shipping,
  interests, blog readers, leads, customers, organic intent, HubSpot forms), or reading the
  experience, experiment, application, or workspace dashboards (probability to be best,
  potential loss, "Experiment in progress", "Recommended winner", "No clear winner", "Track
  your goal"). Phrasings: "personalize the hero for LinkedIn visitors", "A/B test this CTA",
  "which variant won?", "why does my experiment show no conversions?".
---

# Personalize and test with Croct

Marketers manage experiences and experiments in the dashboard (`app.croct.com`). Your job as the
agent is to:

1. **Plan**: turn the user's goal into an experience (who / where / what) and, when they want
   proof, an experiment (hypothesis, goal, allocation, variants).
2. **Wire the code**: make sure every targeted area is a slot, the conversion is tracked as a
   `goalCompleted` event, and the data the audience needs is collected.
3. **Write the audience**: a CQL condition. For syntax beyond the recipes here, load the
   `croct-cql` skill.
4. **Interpret results**: read the dashboards with the documented thresholds; never call a
   winner the dashboard does not support.

Do not tell the user code changes are needed to launch, change, or end an experiment. Once the
slot and the goal exist, everything else is configuration.

## Mental model

| Concept | What it is | Rules |
|---|---|---|
| Experience | Content shown to an audience in one or more slots | Defined by **who** (audiences), **where** (slots), **what** (content). Multiple audiences allowed; give each its own content with content groups. |
| Audience | A CQL condition evaluated against the user's current context | Can target all users or a narrow segment. |
| Priority | Unique rank per experience | When audiences overlap on the same slot, the higher-priority experience wins. No ties. |
| Experiment | An A/B/n test inside an experience | One per experience at a time. Inherits the experience's audience and slots. 2 to 5 variants. |
| Primary goal ID | The conversion the experiment optimizes | Must match the `goalId` of a tracked `goalCompleted` event. |
| Traffic allocation | % of eligible users that enter the experiment | The rest see the experience content. |

Who sees what for a given slot:

| User | Sees |
|---|---|
| Not in any experience's audience | Slot default content |
| In the audience, not allocated to the experiment | Experience content |
| In the audience, allocated | Content of the assigned variant |
| Matches several experiences on the same slot | The highest-priority one |

Assignment is deterministic: the visitor ID is hashed with the experiment key, so a reload never
flips the variant. Exposure is tracked automatically. For identified users, the user ID is the
assignment key, so the variant can follow them across devices (anonymous users cannot).

## Decide what to build

| The user wants... | Build |
|---|---|
| Different content for a known segment | Experience with an audience, no experiment |
| To prove a change works before rolling it out | Experience (often "all users") + experiment |
| To test copy, images, layout, or a section | Content experiment on a slot (one URL, server-rendered when possible) |
| To test where a link goes | CTA experiment: the slot holds the link destination |
| To show or hide an element (promo banner) | Code-side `evaluate`/`useEvaluation` only for fixed logic a developer owns; otherwise a slot with a boolean attribute plus an experience, so marketers control who sees it. See the `croct-integrate-sdk` skill's evaluation rule |
| To test functionality or a flow, not visible content | Feature-flag experiment: a slot with a boolean attribute, branched on the server |
| To test two genuinely separate pages (rebuilt page, other template, another tool's landing page) | Redirect experiment. Prefer content experiments when only content differs |
| Several thresholds or segments in one campaign (free shipping by state) | One experience, several audiences, content groups |
| A campaign that starts, pauses, or resumes at a set time | Scheduling (add-on), optionally in the audience's time zone |

## Implementation checklist

Every experience or experiment needs these in code before it is configured:

- [ ] **A slot for each area that changes.** If missing: `npx croct@latest add slot <slot-id>@1` and
  render it with the SDK (see the `croct-use-cli` and `croct-integrate-sdk` skills). Without a
  slot, no experience can change the area.
- [ ] **A `goalCompleted` event for the conversion** (required for experiments). The goal ID
  must equal the experiment's primary goal ID. If the goal is new, ship it **before** starting
  the experiment.
- [ ] **Richer conversion events when relevant**: `orderPlaced`, `leadGenerated`,
  `userSignedUp` populate revenue, lead, and sign-up widgets alongside the goal.
- [ ] **The data the audience reads.** UTM parameters, location, and session data are
  automatic; recipes based on posts, interests, orders, leads, or sign-ups require tracking
  those events (see the `croct-track-events` skill).
- [ ] **User identification** if variants must stay consistent across devices.

### Track the goal

```tsx
// components/HomeHero.tsx (React; @croct/plug-next is identical with 'use client')
import type {ReactElement} from 'react';
import {useContent, useCroct} from '@croct/plug-react';

export function HomeHero(): ReactElement {
  const {content} = useContent('home-hero@1');
  const croct = useCroct();

  function handleClick(): void {
    croct.track('goalCompleted', {
      goalId: 'hero-cta-click',
    });
  }

  return (
    <div>
      <h1>{content.title}</h1>
      <p>{content.subtitle}</p>
      <a href={content.button.link} onClick={handleClick}>{content.button.label}</a>
    </div>
  );
}
```

```js
// Plain JavaScript
import croct from '@croct/plug';

croct.track('goalCompleted', {goalId: 'sign-up'});
```

The event also accepts optional `value` and `currency` (`{goalId: 'signup', currency: 'USD',
value: 50}`). In server-rendered PHP stacks, track in the browser with the template helper
(`@croct ... @endcroct` in Blade, `{% apply croct %} ... {% endapply %}` in Twig).

Track the goal where the conversion actually happens, in the browser. For a redirect experiment,
track it on **both** pages. When the conversion completes only on a server (payment webhook,
backend signup), use the JavaScript SDK's standalone `track` from `@croct/plug/api` with an
API key: its docs example is exactly a `goalCompleted` event sent from a server or sandboxed script (see
the `croct-track-events` skill). It accepts an optional `userToken`; the docs do not say how an
event sent without one is attributed to the experiment.

## Experience workflow (dashboard)

Relay these steps to the user; you cannot click them yourself.

1. Experiences page > **New experience**, name it.
2. **Audience** tab > **New audience** > paste the CQL criteria. Several audiences allowed.
3. **Slot** tab > select one or more slots (combine slots across pages for a consistent journey).
4. **Content** tab > edit content per slot (and per content group when audiences differ).
5. Optional **Experiment** tab (see below).
6. Review the draft changes, then **Publish** (or schedule) — or **Preview** first.

During development, an audience like `property welcome of page's query is "true"` lets the user
toggle the experience with `?welcome=true`. Replace it with a real audience for production.

Details on status, priority, scheduling, draft changes, and content: [references/experiences.md](references/experiences.md).

## Experiment workflow

1. Write the hypothesis: the change, the metric it moves, and why.
2. Pick the **primary goal ID** (the dashboard suggests IDs already tracked). Confirm it fires.
3. Set **traffic allocation**. Use 100% for niche audiences. Keep it stable for the whole test.
4. Create **2 to 5 variants**, one usually the control. A variant can copy the slot content or
   inherit the experience content instead of duplicating it.
5. Set each variant's content (and content groups, if needed).
6. Enable **cross-device consistency** if users are identified and should keep their variant.
7. Preview each variant, publish, then verify: sessions per variant match the split, and a test
   conversion shows up under the right goal.

Never change traffic distribution or add or remove variants mid-test; doing so can invalidate
the results.

Details, feature flags, and redirects: [references/experiments.md](references/experiments.md) and
[references/flag-and-redirect-experiments.md](references/flag-and-redirect-experiments.md).

## Reading results

The experiment dashboard shows a flag at the top. Act on it:

| Flag | Meaning | Do |
|---|---|---|
| Track your goal | No goal completion events recorded | Fix tracking; nothing else is meaningful |
| Experiment in progress | Not stable yet | Wait. Stable requires each variant ≥ 1,000 visitors, each variant ≥ 25 conversions, and ≥ 1 week running |
| Recommended winner | Stable, and a variant has PBB > 95% and potential loss < 0.1% | Apply the winning content to the experience and stop the experiment |
| No clear winner | Stable, variants too similar | End without a winner or test a new hypothesis |

Before reading any metric, check **sessions per variant** against the configured split. A
persistent imbalance means assignment or logging is dropping a class of users.

Probability to be best (PBB) and potential loss come from Bayesian inference with a Beta
distribution per variant and Monte Carlo simulation, computed in real time without sampling.
Explanations, formulas, and every dashboard widget: [references/analytics.md](references/analytics.md).

## Recipes

Condensed playbooks (ABM, blog readers, customers, free shipping, HubSpot forms, interests,
leads, location, marketing campaigns, organic intent, search terms), each with its audience CQL,
prerequisite tracking, and suggested slots: [references/playbooks.md](references/playbooks.md).

## Do / Don't

- **Do** implement and verify the goal event before publishing an experiment. Without it the
  experiment collects exposures but no conversions.
- **Do** allocate 100% for niche audiences so the test can reach statistical validity.
- **Do** prefer one URL with slot-driven content over redirects; redirects add a page load and
  skew results.
- **Do** keep redirects temporary (302/307) and guard against loops.
- **Do** remove stale feature-flag slots from the code after a test ends.
- **Don't** declare a winner while the dashboard says "Experiment in progress", or from raw
  counts (total orders, total sign-ups) alone.
- **Don't** edit allocation or the variant list mid-test.
- **Don't** expect cross-device consistency for anonymous users; it needs an identified user.
- **Don't** redirect to a different domain: the visitor is recognized per domain, so the
  conversion is never attributed. For subdomains, share the session first.
- **Don't** fully prerender or cache a page that renders an experiment slot; one cached variant
  would be served to everyone.

## Live docs

- Index: `https://docs.croct.com/llms.txt`
- Any page as markdown: append `.md`, e.g. `https://docs.croct.com/explanation/experiment.md`
- Search: `https://docs.croct.com/api/search.md?term=<terms>`
