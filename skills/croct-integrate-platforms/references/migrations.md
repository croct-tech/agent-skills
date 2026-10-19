# Migrating from Mutiny or Ninetailed

None of these migrations need a cutover. `croct init` is additive (nothing changes until a slot is
fetched), and every slot falls back to existing behavior, so a half-migrated codebase still works.
Code examples use the Next.js SDK (`@croct/plug-next/server`), as the docs do.

## Common procedure

1. **Inventory first.** List every flag or experience, its audience or rule, the elements it changes,
   and the pages it runs on. Teams usually find fewer items worth migrating than configured.
2. **Integrate the SDK:** `croct init` (detects the framework, installs the SDK, wires the provider,
   generates types). Safe to merge before migrating anything.
3. **For each flag or page area:** create a component and a slot, run `croct add slot` (generates
   types and downloads default content as an automatic fallback), then replace the old code with
   `fetchContent`.
4. **Track conversions before publishing** with `goalCompleted` where the conversion happens.
   Otherwise early data shows exposures without conversions. For experience dashboards, also track
   `leadGenerated` and `orderPlaced`.
5. **Rebuild audiences in CQL**, then experiences and experiments in the admin app.
6. **Review** (checklist per tool below), then publish.

```jsx
croct.track('goalCompleted', {
  goalId: 'sign-up',
});
```

## Mutiny

Mutiny discontinued website personalization on April 8, 2026. It was mostly no-code: there is no SDK
to swap, only experiences, audiences, and a workflow to move.

| Mutiny                         | Croct                     | Notes                          |
|--------------------------------|---------------------------|--------------------------------|
| Segment                        | Audience                  | Real-time evaluation           |
| Experience                     | Experience                | Same concept                   |
| Personalization (element edit) | Slot content              | Main workflow change           |
| Firmographic data layer        | Firmographic integrations | You choose the provider        |
| Visitor data                   | User profile              | Built in, real time            |
| Goal                           | `goalCompleted` event     |                                |
| A/B test                       | Experiment                | Bayesian, unsampled            |

Key difference: Mutiny edited arbitrary elements via a tag manager; Croct needs a one-time developer
integration connecting components to slots (enables server-side, flicker-free delivery). After that,
audiences, content, preview, approval, and scheduling happen in the admin app without deploys.

Steps:

1. **Keep the firmographic provider.** Connect 6sense, Demandbase, or ZoomInfo (see
   `firmographics.md`); the provider's tag must stay active. Data is not available on the first
   pageview (same as in Mutiny); use campaign, referrer, and location for first impressions.
2. **Integrate the SDK** with `croct init`.
3. **Group changed elements into slots**, one per page area:

   | Mutiny experience changed        | Slot           |
   |----------------------------------|----------------|
   | Headline, subheadline, CTA label | `home-hero`    |
   | Customer logos                   | `logo-cloud`   |
   | Testimonials or case studies     | `social-proof` |
   | Pricing page CTA                 | `pricing-cta`  |

   Use today's default copy as the fallback, so unmatched visitors see exactly what they see now:

   ```jsx
   // components/HomeHero.jsx
   import {fetchContent} from '@croct/plug-next/server';

   export default async function HomeHero() {
     const {content} = await fetchContent('home-hero', {
       fallback: {
         title: 'Ship faster with confidence',
         subtitle: 'The platform teams trust to move quickly.',
         ctaLabel: 'Start free',
       },
     });

     return (
       <section>
         <h1>{content.title}</h1>
         <p>{content.subtitle}</p>
         <a href="/signup">{content.ctaLabel}</a>
       </section>
     );
   }
   ```

4. **Track goals** (`goalCompleted`, plus `leadGenerated` and `orderPlaced`). For HubSpot demo forms,
   use the HubSpot forms integration (`analytics-and-crm.md`).
5. **Rebuild segments as audiences.** If a visitor can match more than one audience, **set the
   audience priority explicitly**; segments exclusive in Mutiny often overlap once rebuilt.
6. **Relaunch as experiments** against default content rather than switching experiences straight on.

**Review:** preview each variant; confirm company attributes arrive on profiles; view source (or
disable JavaScript) to confirm personalized content is in the initial HTML; confirm goals fire.

**Does not carry over:** element-level visual editing; one-to-one outbound pages built from CRM
records or CSV uploads for named accounts.

## Ninetailed

Contentful sunset the standalone Ninetailed app on March 26, 2026; the capability now lives only inside
the Contentful web app. The CMS stays; existing content becomes each slot's fallback.

| Situation | Decision |
|---|---|
| Ninetailed on Sanity, Storyblok, Contentstack, or any CMS other than Contentful | Migrate: the docs say these teams "need a different personalization layer" |
| Ninetailed inside the Contentful web app | Ninetailed is still available there. The docs do not cover this case; confirm the user's reason to migrate before starting |

| Ninetailed                          | Croct                                   | Notes                                              |
|-------------------------------------|-----------------------------------------|----------------------------------------------------|
| Audience                            | Audience                                | Real-time evaluation                               |
| Experience                          | Experience                              | Audience plus the content it receives              |
| Baseline                            | Slot default content                    | Can be existing CMS content                        |
| Variant                             | Variant                                 |                                                    |
| Experiment                          | Experiment                              | Bayesian, unsampled                                |
| `<Personalize>` / `<Experience>`    | Slot                                    | Fetches from a slot instead of wrapping variants   |
| Profile and traits                  | User profile and attributes             | No external CDP                                    |
| `identify`                          | Identification (`croct.identify`)       |                                                    |
| Track call                          | `goalCompleted` and other events        |                                                    |

Ninetailed stored baseline and variant entries in the CMS; Croct resolves variants from its own content
layer, so no audience references or variant entries are added to CMS schemas.

Replace each `<Experience ... experiences={mappedExperiences} />` wrapper with a slot fetch using the
CMS content as fallback:

```jsx
// components/HomeHero.jsx
import {fetchContent} from '@croct/plug-next/server';

export default async function HomeHero() {
  const cmsHero = await cms.getHero();

  const {content} = await fetchContent('home-hero', {
    fallback: cmsHero,
  });

  return <Hero {...content} />;
}
```

For default-in-CMS, check `metadata.contentSource === 'slot'` and render the CMS content (see
`headless-cms.md`).

Identification and tracking:

```js
croct.identify(userId);
```

Then rebuild audiences (rewritten, not imported), experiences, and experiments; relaunch as experiments.

**Review:** preview each variant; confirm content is in the initial HTML; confirm goals fire.

**Does not carry over:** CMS variant entries become unused (leave them during migration, clean up audience
references and variant entries after every experience is live); merge tags and inline tokens (Croct
resolves whole slot content rather than substituting tokens).

## Troubleshooting (both)

| Symptom                                       | Likely cause / fix                                                                                     |
|-----------------------------------------------|--------------------------------------------------------------------------------------------------------|
| Always the fallback / fallback in production  | No published slot content, or requests failing. Check application credentials and the `timeout` option. |
| All visitors see the same content or variant  | Route is statically generated. Ensure the component calls `fetchContent` and renders dynamically.       |
| Variant changes between loads / returning visitor treated as new | Client ID not persisting; a proxy or CDN may strip cookies.                          |
| Audience does not match                       | Test the CQL in isolation with `evaluate`.                                                             |
| Context attributes missing in CQL             | Context is per call; put it in that `fetchContent` call's `context` option.                            |
| Exposures but no conversions                  | Experiment goal does not match the event's `goalId`.                                                   |
| Differs across devices                        | Expected for anonymous visitors; identify the user.                                                    |
| Content flashes before updating               | Slot renders on the client; move it to a server-side fetch.                                            |
| Wrong variant for a visitor in two audiences  | Audience priority not set.                                                                             |
| Company attributes missing (Mutiny)           | Provider tag not firing or integration not enabled; verify the provider resolves the visitor first.   |

## Sources

- https://docs.croct.com/immersion/tutorials/migrations/mutiny.md
- https://docs.croct.com/immersion/tutorials/migrations/ninetailed.md
