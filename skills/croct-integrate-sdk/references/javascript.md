# JavaScript SDK (`@croct/plug`)

Framework-agnostic browser SDK, plus standalone functions (`@croct/plug/api`) that run in any
JavaScript environment including Node.js. Use the React/Next/Vue/Nuxt/Hydrogen SDK instead when
the app uses one of those frameworks.

## Install

CLI (recommended):

```sh
npx croct@latest init
```

Manual, package manager:

```sh
npm install @croct/plug
```

Manual, script tag in `<head>`:

```html
<script src="https://cdn.croct.io/js/v1/lib/plug.js"></script>
```

## Initialize

Call `plug` once, at application startup (in `<head>` or on `DOMContentLoaded`), before any other
method.

```ts
import croct from '@croct/plug';

croct.plug({appId: 'APPLICATION_ID'});
```

```html
<script src="https://cdn.croct.io/js/v1/lib/plug.js"></script>
<script>croct.plug({appId: 'APPLICATION_ID'});</script>
```

The script tag can carry the app ID instead: `plug.js?appId=APPLICATION_ID`. Then call `plug()`
without `appId`; passing it in both places throws a conflicting-app-ID error.

Calling `plug` again without `unplug()` first throws. To reconfigure: `await croct.unplug()` then
`croct.plug({...})`.

### Plug configuration

`croct.plug(configuration?: Configuration): void`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `appId` | `string` | — | Required unless detected from the script tag |
| `debug` | `boolean` | `false` | Logs to the console |
| `test` | `boolean` | `false` | Fake transport that simulates success; auto-on when `NODE_ENV=test` |
| `track` | `boolean` | `true` | Automatic event tracking on init |
| `clientId` | `string` | — | Use when the client ID is generated server-side |
| `token` | `string \| null` | — | JWT identifying the user; not with `userId`; `null` clears |
| `userId` | `string` | — | Logged-in user ID; not with `token`; fails when **Require signed token** is on (SDK issues unsigned tokens) |
| `tokenScope` | `'global' \| 'isolated' \| 'contextual'` | `global` | Token sync across tabs: shared / per tab / new tabs inherit last viewed |
| `defaultFetchTimeout` | `number` (ms) | `5000` | Per-call override with `timeout` |
| `defaultPreferredLocale` | `string` | — | e.g. `en`, `en-us`, `pt-br` (case-insensitive, `-` or `_`) |
| `eventMetadata` | `object` | — | ≤ 5 entries; keys ≤ 20 chars (letter/underscore start); values ≤ 300 chars |
| `logger` | `{debug, info, warn, error}` | suppressed | Custom log sink |
| `urlSanitizer` | `(url: string) => URL` | — | Strip secrets from URLs before they go into events |
| `baseEndpointUrl` | `string` | production | Point to a mock server |
| `cidAssignerEndpointUrl` | `string` | built-in | Custom client ID assigner (e.g. server cookie shared across subdomains) |
| `disableCidMirroring` | `boolean` | `false` | Stop sending current CID to the assigner via `cid` query param |
| `cookie` | `{clientId?, userToken?, previewToken?}` | local/session storage | Store each in a first-party cookie: `{name, secure = true, maxAge?, domain?, path?, sameSite = 'none'}`; `strict`/`lax` resets the cookie on cross-domain visits |

## Render content

Add the slot with the CLI first (`npx croct@latest add slot home-hero@1 --example`) to get types, fallback
content, and an example.

`croct.fetch<T extends SlotId>(id: T, options?: FetchOptions): Promise<FetchResponse<T>>`

```ts
import croct from '@croct/plug';

async function renderHero() {
  const {content} = await croct.fetch('home-hero@1');

  const hero = document.querySelector('.hero');
  hero.querySelector('h1').innerText = content.title;
  hero.querySelector('.subtitle').innerText = content.subtitle;
  hero.querySelector('.button').setAttribute('href', content.button.url);
}

renderHero();
```

Options:

| Option | Notes |
| --- | --- |
| `fallback` | JSON rendered on error; without it (and without CLI default content) the promise rejects |
| `preferredLocale` | Falls back to the workspace default locale if unavailable (the Content API page calls it the slot's default locale) |
| `timeout` | ms; rejects with a timeout error |
| `attributes` | Injected as CQL `context` (≤ 30 entries, ≤ 5 levels, keys ≤ 50 chars, strings ≤ 50 chars) |

Response: `{content, metadata: {version, schema?, experience?: {experienceId, audienceId, experiment?: {experimentId, variantId}}}}`.

Fault tolerance without the CLI:

```ts
const {content} = await croct.fetch('home-hero@1')
  .catch(() => ({content: {title: 'Welcome!', subtitle: '...', button: {label: 'Get started', url: '/signup'}}}));
```

Typing:

```ts
import type {SlotContent, ComponentContent} from '@croct/plug';

type HeroContent = SlotContent<'home-hero@1'>; // discriminated on `_type` for union slots
type CardProps = ComponentContent<'card@1'>;
```

Context attributes:

```ts
const {content} = await croct.fetch('upgrade-banner@1', {attributes: {plan: 'premium'}});
// CQL in the dashboard: context's plan is "premium"
```

## Evaluate queries

`croct.evaluate<T extends JsonValue>(query: string, options?: EvaluationOptions): Promise<T>`
`croct.test(query: string, options?: EvaluationOptions): Promise<boolean>` (true only if the
result is strictly `true`)

Options: `timeout`, `attributes`. Query max 500 characters.

```ts
import croct from '@croct/plug';

const returning = await croct.evaluate('user is returning').catch(() => false);
const location = await croct.evaluate('location'); // object: city, region, country, ...

const inList = await croct.evaluate("context's countries include location's countryName", {
  attributes: {countries: ['United States', 'Canada', 'Mexico']},
});
```

CQL syntax: `croct-cql` skill.

## Identity

| Call | Effect |
| --- | --- |
| `croct.identify(userId: string): void` | Issues an unsigned token for the ID; emits `userSignedOut`/`userSignedIn`; new session; always issues a new token |
| `croct.anonymize(): void` | Clears the user; emits `userSignedOut`; no-op if already anonymous |
| `croct.setToken(token: string \| null): void` | Set a (signed) JWT; `null` = `unsetToken()` |
| `croct.unsetToken(): void` | Clears token, anonymizes |
| `croct.getUserId(): string \| null` | `sub` claim of the token |
| `croct.isAnonymous(): boolean` | Same as `croct.user.isAnonymous()`; also `croct.user.isIdentified()` |

```ts
croct.plug({appId: 'APPLICATION_ID', userId: 'john-doe'}); // or null if the user is anonymous
croct.identify('0e8f3b9e-8b5a-4f5c-9b8a-0e8f3b9e8b5a'); // on login/sign-up
croct.anonymize(); // on logout
```

Pass the logged-in user at `plug` time; identifying after init creates an extra anonymous session.

## Data collection and tracking

Profile and session patches (`Patch` methods: `set`, `unset`, `add`, `remove`, `combine`, `merge`,
`clear`, `increment`, `decrement`, then `save(): Promise<Event>`):

```ts
await croct.user.edit()
  .set('email', email)
  .set('custom.expertise', 'Engineering') // custom attributes: `custom.` prefix
  .save();

await croct.session.edit().set('plan', 'premium').save();
```

Events:

```ts
croct.track('goalCompleted', {goalId: 'newsletter-subscription'});
```

`croct.track(event, payload): Promise<Event>` is shorthand for `croct.tracker.track`.
`croct.tracker.enable()` / `disable()` toggle automatic tracking. `croct.flushed` resolves when
pending events are sent; `croct.plugged` resolves after init; `croct.initialized` is a boolean.
Event catalog and recommended events: `croct-track-events` skill.

## Standalone functions (`@croct/plug/api`)

Use on servers, edge functions, or sandboxed scripts. Pass `appId` (client-side) **or** `apiKey`
(server-side), never both. Never expose the API key to the browser.

```ts
import {fetchContent, evaluate, track} from '@croct/plug/api';

const {content} = await fetchContent('home-hero@1', {
  apiKey: process.env.CROCT_API_KEY,
  clientId,            // persistent UUID; omitted = anonymous, no session context
  clientIp,            // '127.0.0.1' = use the request IP (local dev)
  clientAgent,         // user agent; enables device info
  userToken,           // signed JWT when Require signed token is on
  previewToken,        // forward the preview token from the URL to enable preview
  preferredLocale: 'en-us',
  context: {timeZone: 'America/New_York', page: {url, title, referrer}, campaign: {name, source}, attributes: {plan: 'premium'}},
});

const returning = await evaluate('user is returning', {apiKey: process.env.CROCT_API_KEY, clientId});
```

`fetchContent` extras: `static: true` returns the slot's default static content (client fields
ignored), `includeSchema`, `timeout`, `baseEndpointUrl`, `extra` (passed to `fetch`), `logger`.

`track(event, options)` sends an event as-is: `event = {type, payload, clientId, timestamp,
context: {url, tabId?, timeZone?, metadata?}, userToken?, clientIp?, clientAgent?}`. The payload
follows the event's **processed** properties (e.g. `userSignedUp` takes `patch`, not `profile`).

## Default content (`@croct/content`)

```ts
import {getSlotContent, loadSlotContent} from '@croct/content';

const content = getSlotContent('home-hero', 'en');         // JsonObject | null
const lazy = await loadSlotContent('home-hero');           // Promise<JsonObject | null>, code-splittable
```

## Testing

Unit tests: test mode auto-enables when `NODE_ENV=test` (Jest); or pass `test: true`. Assert on
emitted events instead of mocking:

```js
import croct from '@croct/plug';

it('adds an interest', async () => {
  croct.plug({appId: '00000000-0000-0000-0000-000000000000', test: true});

  const listener = jest.fn();
  croct.tracker.addListener(listener);

  await croct.user.edit().add('interest', 'tests').save();

  expect(listener).toHaveBeenCalledWith(expect.objectContaining({
    status: 'confirmed',
    event: {type: 'userProfileChanged', patch: {operations: [{path: 'interest', type: 'add', value: 'tests'}]}},
  }));
});
```

Mock content and evaluation with spies; test the fallback path with a rejection:

```js
jest.spyOn(croct, 'fetch').mockResolvedValue({content: {title: 'Banner title'}});
jest.spyOn(croct, 'fetch').mockRejectedValue(new Error('Failed to fetch content'));
jest.spyOn(croct, 'evaluate').mockRejectedValue(new Error('Failed to evaluate query'));
```

Integration tests: set `baseEndpointUrl: 'http://localhost:3000'` and mock with a server such as
Mockoon (`npm install -g @mockoon/cli`, `mockoon start --config croct.json`). Mockable paths:
`/client/web/cid`, `/client/web/evaluate`, `/client/web/track` (not needed in test mode),
`/content`. Copy response bodies from real responses.

## Troubleshooting

Enable `debug: true` and read the browser console; check the Network tab for red requests.

| Error | Cause / fix |
| --- | --- |
| `Croct is not plugged in.` | A method ran before `plug`; initialize first |
| `The app ID must be specified when it cannot be auto-detected...` | Pass `appId` or use `plug.js?appId=` |
| `The specified app ID and the auto-detected app ID are conflicting...` | Remove one of the two app ID sources |
| `The user ID must be a string.` | Convert to string, ideally server-side; client-side check `Number.isSafeInteger(id)` then `id.toFixed(0)` |
| CORS `blocked by CORS policy` / `The origin of the request is not allowed...` | Add the origin under Application settings → Trusted origins |
| `The request was not authorized, most likely due to invalid credentials.` | Wrong app ID; prod/dev app ID mismatch; bad user token (clear cookies and local storage); unsigned token with Require signed token on |
| `The request timed out.` | Network distance; debug logs show `processed by region ... in Xms` (`X-Croct-Timing`, `X-Croct-Region`) |
| `The query is too complex.` | > 500 chars; simplify, split, or move data into `attributes` |
| `The application has exceeded the monthly active users (MAU) quota.` | Upgrade or wait for the next billing cycle |
| `The service is temporarily suspended.` | Empty `202`; `X-Suspension-Reason` = workspace suspended or bot traffic; ensure fallbacks |

## Sources

- https://docs.croct.com/reference/sdk/javascript/integration.md
- https://docs.croct.com/reference/sdk/javascript/manual-installation.md
- https://docs.croct.com/reference/sdk/javascript/content-rendering.md
- https://docs.croct.com/reference/sdk/javascript/query-evaluation.md
- https://docs.croct.com/reference/sdk/javascript/data-collection.md
- https://docs.croct.com/reference/sdk/javascript/event-tracking.md
- https://docs.croct.com/reference/sdk/javascript/testing/unit-testing.md
- https://docs.croct.com/reference/sdk/javascript/testing/integration-testing.md
- https://docs.croct.com/reference/sdk/javascript/troubleshooting/debugging.md
- https://docs.croct.com/reference/sdk/javascript/troubleshooting/problem.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/plug.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/fetch.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/evaluate.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/identify.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/anonymize.md
- https://docs.croct.com/reference/sdk/javascript/api/patch.md
- https://docs.croct.com/reference/sdk/javascript/api/functions/fetch-content.md
- https://docs.croct.com/reference/sdk/javascript/api/functions/evaluate.md
- https://docs.croct.com/reference/sdk/javascript/api/functions/track.md
- https://docs.croct.com/reference/sdk/javascript/api/content.md
- https://docs.croct.com/reference/sdk/javascript/api/types/slot-content.md
- https://docs.croct.com/reference/cli/fallback-content.md
