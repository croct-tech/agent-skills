---
name: croct-track-events
description: >-
  Use when collecting data with Croct: tracking events with `croct.track`, `useCroct().track`,
  or the standalone `track` from `@croct/plug/api`; choosing built-in events (`goalCompleted`,
  `eventOccurred`, `orderPlaced`, `productViewed`, `cartModified`, `checkoutStarted`,
  `leadGenerated`, `interestShown`, `postViewed`, `userSignedUp`) and knowing which are
  auto-tracked; writing profile or session attributes with `user.edit()` / `session.edit()`
  patches (`set`, `combine`, `increment`, `custom.*`); identifying users with `identify`,
  `anonymize`, `setToken`, `userId`, `userIdResolver`; signed user tokens, anonymity scope,
  sessions, identity resolution; sharing identity across subdomains with cookies; proxying
  `api.croct.io` via `baseEndpointUrl` because ad blockers drop requests; bot exclusion.
  Phrasings: "track a conversion", "tracking plan", "send purchase events", "events not
  showing up", "experiment says track your goal", "two sessions on login".
---

# Track events and collect user data with Croct

Croct only personalizes and measures what it knows. The SDK records most browsing activity
automatically; conversions, commerce, and business-specific facts must be sent by your code.
This skill covers what to send, the exact payload, and how identity and delivery affect whether
the data arrives and lands on the right profile.

SDK installation is out of scope (see the `croct-integrate-sdk` skill). Audience conditions
over the collected data are covered by the `croct-cql` skill; the raw HTTP tracking API by the
`croct-use-api` skill.

## Mental model

| Piece | What it is | Written by |
|---|---|---|
| Event | `{sessionId, userId, timestamp, context, payload}`; `payload.type` is the event name. The `userId` here is Croct's internal UUID, not your ID. | SDK (auto) or `track(...)` |
| Input vs processed properties | Input = what you pass to `track`. Processed = what is stored after the SDK enriches it (e.g. `userSignedUp.userId` becomes `externalUserId`, `profile` becomes a `patch`). | You / SDK |
| User profile | Standard attributes (`firstName`, `email`, `interests`, ...) plus up to 10 `custom.*` attributes. | `user.edit()`, `userSignedUp.profile`, `leadGenerated.lead` |
| Session | One visit. Holds up to 10 custom attributes plus detected campaign, location, client. | `session.edit()`, SDK |
| Identity | Anonymous by default. `identify(id)` links to your user ID; `anonymize()` reverts. | You |

## Auto-tracked vs manual

The web SDK tracks these without code (unless auto-tracking is off, see Pitfalls):

- **Session**: `sessionStarted`, `sessionClosed`, `sessionMerged`, `sessionAttributesChanged`,
  `campaignDetected` (UTM), `clientDetected`, `locationDetected`, `audienceMatched`.
- **Browsing**: `tabOpened`, `tabUrlChanged` (SPA navigation), `tabVisibilityChanged`,
  `pageOpened`, `pageLoaded`.
- **Engagement**: `linkOpened`, `userClicked` (max one per 500ms), `userScrolled`,
  `nothingChanged` (after 30s idle, capped at 4/hour), `slotPersonalized` (on every content fetch).
- **Side effects of your calls**: `userSignedIn` (from `identify`), `userSignedOut` (from
  `anonymize`/`unsetToken`), `userProfileChanged` (from `user.edit().save()`),
  `productOrdered` (one per item of `orderPlaced`), `cartAbandoned` / `productAbandoned` (on
  session close when a cart was tracked with `cartViewed`/`cartModified`).
- **Conditional**: `productViewed` and `postViewed` are auto-tracked only when the page has
  schema.org product / article structured data. Without it, track them yourself.

You must track manually: `goalCompleted`, `eventOccurred`, `interestShown`, `leadGenerated`,
`userSignedUp`, `cartViewed`, `cartModified`, `checkoutStarted`, `orderPlaced`.

## Pick the event

| You want | Track | Feeds |
|---|---|---|
| Conversion rate, A/B test winner, experiment "Performance per goal", app Conversions widget | `goalCompleted` `{goalId}` | Analytics goals, `user has completed goal "x"` |
| Revenue / orders dashboards, profile `stats.orders` counter | `orderPlaced` `{order}` | Orders & Revenue widgets, `user has placed an order` |
| Cart-based audiences (`cart's coupon is "X"`), abandonment | `cartViewed`, `cartModified`, `checkoutStarted` `{cart}` | CQL `cart` variable, `cartAbandoned` |
| Product interest without structured data | `productViewed` `{product}` | `user has viewed a product` |
| Topic interest | `interestShown` `{interests}` | `user has shown interest in "x"` |
| Lead form submitted | `leadGenerated` `{leadId?, lead?}` | `user has become a lead` |
| Account created | `userSignedUp` `{userId, profile?}` then `identify(userId)` | `user has signed up` |
| Anything else domain-specific (rating, video play) | `eventOccurred` `{name, details?}` | `user has experienced a custom event "x"` |
| A fact about the person (plan, role, expertise) | `user.edit().set('custom.x', v)` | `user's x is ...` |
| A fact about this visit only (selected plan) | `session.edit().set('x', v)` | `session's x is ...` |

Pair behavioral events with `goalCompleted` when you need a rate: `checkoutStarted`,
`productViewed`, `postViewed`, `linkOpened` segment users but do not produce conversion rates.
Only `goalCompleted` feeds the experiment Performance per Goal widget, so an experiment whose
KPI is purchases needs a `goalCompleted` for purchases in addition to `orderPlaced`.

Exact schemas and limits for every event: [references/event-types.md](references/event-types.md).

## Track an event

```js
// Vanilla JS (@croct/plug), after croct.plug({appId})
import croct from '@croct/plug';

croct.track('goalCompleted', {goalId: 'newsletter-subscription', value: 50, currency: 'USD'});
```

```jsx
// React (@croct/plug-react) or Next.js client components (@croct/plug-next)
import {useCroct} from '@croct/plug-react'; // or '@croct/plug-next'

export function Cta() {
  const croct = useCroct();

  return <a href="/signup" onClick={() => croct.track('goalCompleted', {goalId: 'hero-primary-cta-click'})}>Sign up</a>;
}
```

- Signature: `croct.track(event: string, payload): Promise<Event>`; resolves after transmission.
  `croct.tracker.track` is the same call.
- Outside a browser session (server, sandboxed script, Shopify pixel), use the standalone
  `track` from `@croct/plug/api`. It sends the event as given: you supply `clientId`,
  `timestamp`, `context.url`, and the **processed** payload shape, plus `appId` (client) or
  `apiKey` (server, never both). See [references/delivery.md](references/delivery.md).

## Write profile and session data

```js
import croct from '@croct/plug';

await croct.user.edit()
  .set('firstName', 'Carol')
  .set('custom.expertise', 'Engineering') // custom attributes need the `custom.` prefix
  .combine('interests', 'analytics')       // set semantics, no duplicates
  .save();                                 // resolves to the userProfileChanged event

await croct.session.edit().set('plan', 'premium').save(); // no prefix for session attributes
```

In CQL, drop the prefix: `user's expertise is "Engineering"`, `session's plan is "premium"`.
A patch is atomic: one failing operation discards the whole patch. Attribute names are
case-insensitive. PII attributes set while anonymous are held until the user identifies (then
migrated) or the session ends (then discarded). Operations, limits, and attribute list:
[references/user-and-session.md](references/user-and-session.md).

## Identify users

| Situation | Do |
|---|---|
| Login or signup in the browser | `croct.identify(userId)` (emits `userSignedOut`/`userSignedIn`, starts a new session) |
| Logout | `croct.anonymize()` |
| User already logged in on page load | Pass `userId` (or `token`) to `croct.plug` / `<CroctProvider userId>` so no anonymous session is created first |
| Next.js with server auth | `export const middleware = withCroct({userIdResolver})` from `@croct/plug-next/middleware` (Next ≤ 15) or `export const proxy = withCroct({userIdResolver})` from `@croct/plug-next/proxy` (Next ≥ 16), or call `identify`/`anonymize` from `@croct/plug-next/server` in a server action or API route (`{req, res}` in the Pages Router) |
| "Require signed token" enabled | Do not use `identify` or `userId`; they issue unsigned tokens and requests fail. Use `setToken(signedJwt)` / `token` signed with an API key that has **Issue user tokens** permission. Server SDKs (Next.js) sign automatically. |

```js
// app/actions.js (Next.js App Router)
'use server';

import {identify, anonymize} from '@croct/plug-next/server';

export async function identifyUser(userId) { await identify(userId); }
export async function anonymizeUser() { await anonymize(); }
```

On identify, the anonymous profile's data merges into the identified profile; on logout the
user returns to the previous anonymous profile and identified data does not flow back. Use a
stable, non-guessable ID; guessable IDs (emails, sequential numbers) invite impersonation
unless tokens are signed. Details on tokens, `tokenScope`, anonymity scope, sessions, and
identity resolution: [references/user-and-session.md](references/user-and-session.md).

Writing profile attributes at login (plan tier, company): the docs do not say whether to call
`user.edit()` before or after `identify`. Recommendation (not from the docs): call `identify`
first, then `user.edit()`, so the write targets the identified profile rather than relying on the
anonymous-to-identified merge.

## Make sure data arrives

- **Ad blockers** silently drop requests to `api.croct.io` (`/client/web/track`,
  `/client/web/evaluate`, `/content`, which is `/client/web/content` in the API docs). Proxy `/croct/*` on your domain to `https://api.croct.io/*`
  and set `baseEndpointUrl: 'https://your-domain.com/croct'`
  (Next.js: `NEXT_PUBLIC_CROCT_BASE_ENDPOINT_URL`).
- **Subdomains** see different anonymous users by default (local storage is per origin). Store
  `clientId` and `userToken` in cookies on the parent domain, on every subdomain.
- **Bots**: with bot exclusion on (Growth and Scale plans), known bots get no events tracked and
  receive slot default content.

Proxy configs (Next.js rewrites, Cloudflare Worker, Nginx, Express), cookie setup, and server
tracking: [references/delivery.md](references/delivery.md).

## Do / Don't

- **Do** name custom goals and events by role, not look or copy: `hero-primary-cta-click`, not
  `hero-blue-button-click` or `shop-now-click`. `goalId` is 3-100 chars of letters, digits, `-`,
  `_`, `:`, starting and ending with a letter or digit.
- **Do** send the full current cart on every `cartModified`; the platform derives the changes.
- **Do** send optional fields (category, variant, coupon, discount, tags, categories); they are
  what later audiences and reports slice by.
- **Do** combine broad and specific events when you need both (`cards-click` plus `card-1-click`).
- **Don't** call `identify` on every render or route change; each call issues a new token, and a
  changed ID ends the session.
- **Don't** put an API key in browser code; only the standalone `track` on a server takes `apiKey`.
- **Don't** expect `productViewed`/`postViewed` without structured data or code.
- **Don't** confuse the event's `userId` (Croct UUID) with your external ID (`externalUserId`).
- `croct.tracker.disable()` (or `track: false` in `plug`) stops automatic tracking only; manual
  `track` calls still go through.

## Debugging checklist

1. Event missing everywhere: check the Network tab for `/client/web/track`; if blocked, set up the
   proxy. Initialize with `debug: true` (Next.js `NEXT_PUBLIC_CROCT_DEBUG=true`) for SDK logs.
2. `test: true` / `NEXT_PUBLIC_CROCT_TEST=true` fakes transmission; turn it off outside tests.
3. Experiment flag "Track your goal": no `goalCompleted` with the experiment's goal ID was recorded.
4. Duplicate anonymous + identified sessions on page load: pass `userId`/`token` at init.
5. Authentication errors after enabling "Require signed token": replace `identify`/`userId` with
   signed tokens.
6. Same visitor counted twice across subdomains or apps: cookie domain, or anonymity scope
   (application vs workspace vs organization).

## References

- [references/event-types.md](references/event-types.md): every event, input and processed
  properties, limits, examples, event envelope and data types.
- [references/user-and-session.md](references/user-and-session.md): standard and custom
  attributes, session attributes, patch operations, identity API, tokens, anonymity scope,
  sessions, identity resolution.
- [references/delivery.md](references/delivery.md): first-party proxy, ad blockers,
  cross-subdomain cookies, signed tokens, server-side `track`, bot exclusion, SDK options.

## Live docs

When something is not covered here, fetch the current page as markdown:

- Index: `https://docs.croct.com/llms.txt`
- Event reference: `https://docs.croct.com/reference/event/overview.md`
- Any page: append `.md`, e.g. `https://docs.croct.com/reference/event/types/engagement/goal-completed.md`
- Search: `https://docs.croct.com/api/search.md?term=<terms>`
