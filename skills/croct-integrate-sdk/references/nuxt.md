# Nuxt SDK (`@croct/plug-nuxt`)

Use for Nuxt 3 apps. The module registers a server middleware, a client plugin, and auto-imported
composables (`useCroct`, `useContent`, `useEvaluation`) and components (`<Slot>`,
`<Personalization>`). Content and queries resolve **on the server** during SSR (through Nuxt's
`useAsyncData`) and hydrate on the client. Server routes get auto-imported `fetchContent`,
`evaluate`, `identify`, and `anonymize`.

Entry points:

| Import | Use |
| --- | --- |
| auto-import (or `@croct/plug-nuxt`) | SSR composables/components, `useCroct` |
| `@croct/plug-nuxt/csr` | Client-only composables and components that follow the Vue SDK API (docs show `useContent`, `<Slot>`, `useCroct`, `createCroct`) |
| `@croct/plug-nuxt/types` | `SlotContent`, `ComponentContent`, `CredentialsResolver`, `CroctCredentials`, resolver types |

## Install

### CLI (recommended)

```sh
npx croct@latest init
```

Then add a slot with example code, generated types, and fallback content:

```sh
npx croct@latest add slot home-hero@1 --example
```

### Manual

1. Install:

   ```sh
   npm install @croct/plug-nuxt
   # pnpm add @croct/plug-nuxt | yarn add @croct/plug-nuxt | bun add @croct/plug-nuxt
   ```

2. Set environment variables. Create the API key with the **Issue user tokens** permission (the SDK
   issues signed user tokens):

   ```bash
   # .env
   NUXT_PUBLIC_CROCT_APP_ID=<APPLICATION_ID>
   NUXT_CROCT_API_KEY=<API_KEY>
   ```

3. Register the module:

   ```ts
   // nuxt.config.ts
   export default defineNuxtConfig({
     modules: ['@croct/plug-nuxt'],
   });
   ```

4. Verify: open the app and check the application's Integration page in the Croct dashboard for
   "Received traffic in the past 24 hours".

## Rendering content

SSR composables must be awaited. `data` is the fetch response, so read `data.content.*`.

```vue
<!-- components/HomeHero.vue -->
<script setup lang="ts">
const {data, pending, error} = await useContent('home-hero@1');
</script>

<template>
  <div v-if="data">
    <h1>{{ data.content.title }}</h1>
    <p>{{ data.content.subtitle }}</p>
  </div>
  <div v-else-if="error">Something went wrong</div>
</template>
```

```vue
<template>
  <Slot id="home-hero@1">
    <template #default="{ content }">
      <strong>{{ content.title }}</strong>
      <p>{{ content.subtitle }}</p>
    </template>
    <template #loading><p>Loading...</p></template>
    <template #error="{ error }"><p>Something went wrong: {{ error.message }}</p></template>
  </Slot>
</template>
```

Rules:

- **Version slot IDs** (`home-hero@1`); no version means `@latest`.
- **Fallback**: CLI-added slots get automatic fallback content from `@croct/content`. Override with
  `fallback` (option or prop). Without a fallback, `error` is set and `data` stays `null`.
- **Locale**: with `@nuxtjs/i18n` the SDK uses the i18n locale automatically. Otherwise set
  `croct.defaultPreferredLocale`, a `localeResolver`, or per call `preferredLocale: 'en-ca'`
  (`preferred-locale="en-ca"` on `<Slot>`). Falls back to the workspace default locale.
- **Context attributes**: become `context's <key>` in CQL. Limits: up to 30 entries, 5 levels deep;
  keys numbers or non-empty strings up to 50 chars; values null, numbers, booleans, strings up to
  50 chars, or nested maps.

  ```vue
  <script setup lang="ts">
  // Guide examples pass attributes under `context`:
  const {data} = await useContent('upgrade-banner@1', {context: {attributes: {plan: 'premium'}}});
  </script>

  <template>
    <Slot id="upgrade-banner@1" :attributes="{plan: 'premium'}" v-slot="{ content }">...</Slot>
  </template>
  ```

  The `useContent`/`useEvaluation` API pages list `attributes` as a top-level option, while the
  guide examples use `context: {attributes}`. Check the live docs or the generated types before
  choosing.

### Typing

```ts
import type {SlotContent, ComponentContent} from '@croct/plug-nuxt/types';

type HeroContent = SlotContent<'home-hero@1'>;
type BannerProps = ComponentContent<'banner@1'>;
```

Union slots resolve to a discriminated union on `_type` (the component ID). Single-component slots
resolve to a plain object.

## Query evaluation

```vue
<script setup lang="ts">
const {data: isDeveloper} = await useEvaluation("user's persona is 'developer'", {
  fallback: false,
});
</script>

<template>
  <a v-if="isDeveloper" href="/docs">View docs</a>
  <a v-else href="/share">Share with your developer</a>
</template>
```

```vue
<script setup lang="ts">
const attributes = {countries: ['United States', 'Canada', 'Mexico']};
</script>

<template>
  <Personalization
    query="context's countries include location's countryName"
    :attributes="attributes"
    :fallback="false"
    v-slot="{ result: enabled }"
  >
    <span v-if="enabled">Available</span>
    <span v-else>Unavailable</span>
  </Personalization>
</template>
```

Results can be any JSON (for example, `useEvaluation('location')` returns `cityName`, `stateName`,
`countryName`). Queries are limited to 500 characters. For CQL, see the `croct-cql` skill.

## Event tracking

`useCroct()` returns the Plug instance; tracking is client-side, so call it from event handlers or
`onMounted`.

```vue
<script setup lang="ts">
const croct = useCroct();

function onCtaClick() {
  croct.track('goalCompleted', {goalId: 'ctaClicked'});
}
</script>

<template>
  <a href="/signup" @click="onCtaClick">Sign up for free</a>
</template>
```

| Event | When | Key payload |
| --- | --- | --- |
| `goalCompleted` | Business goal completed (conversion metrics) | `{goalId}` |
| `userSignedUp` | Registration | `{userId, profile?}` |
| `orderPlaced` | Order confirmed | `{order: {orderId, currency, total, items[]}}` |
| `cartViewed` / `cartModified` / `checkoutStarted` | Cart viewed / changed (send full cart) / checkout begins | `{cart: {currency, total, items[]}}` |

Item shape: `{index, total, quantity, product: {productId, name, displayPrice}}`.

## Data collection

Profile and session data use the Plug API on the client:

```ts
const croct = useCroct();

croct.user.edit().set('email', email).save();                 // standard attribute
croct.user.edit().set('custom.expertise', 'Engineering').save(); // custom (query: user's expertise)
croct.session.edit().set('plan', 'premium').save();          // session (query: session's plan)
```

### User identity

Pick one:

| Situation | Approach |
| --- | --- |
| User ID can be read securely from the request (session cookie, JWT) | `userIdResolver` (automatic; keeps the Croct token in sync) |
| No request-level way to know the user | Call `identify(userId)` / `anonymize()` from server routes or server middleware |

```ts
// croct/resolveUserId.ts
import {getCookie} from 'h3';

export default event => getCookie(event, 'session-user') ?? null;
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@croct/plug-nuxt'],
  croct: {userIdResolver: './croct/resolveUserId'},
});
```

```ts
// server/api/login.post.ts
export default defineEventHandler(async event => {
  const body = await readBody(event);
  const userId = await auth.login(body.email, body.password); // your auth logic

  if (userId !== null) {
    await identify(userId); // issues a signed user token and sets the cookie
  }

  return {success: userId !== null};
});
```

```ts
// server/api/logout.post.ts
export default defineEventHandler(async () => {
  await anonymize(); // issues a new anonymous token and updates the cookie
  return {success: true};
});
```

## Prerendering and SSR

Default composables/components run on the server. On prerendered routes they would run **at build
time** and freeze content for every visitor. Choose per route:

| | Server-side rendering | Client-side rendering |
| --- | --- | --- |
| Final content on first load | Yes | No |
| No content flicker | Yes | No |
| Visible to crawlers | Yes | No |
| Served as a static file | No | Yes |
| Runs without a server | No | Yes |

Prefer SSR. Use client-side rendering only when the page must stay a static file (CDN, no server,
or `nuxi generate`), typically for below-the-fold sections.

**SSR for dynamic pages** (route rules; combine with `swr`/`isr` caching if needed):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': {prerender: false},
    '/pricing': {prerender: false},
    '/**': {prerender: true},
  },
});
```

**Client-side on prerendered pages**: import from `@croct/plug-nuxt/csr` and always pass `initial`
(rendered into the static HTML). Without it the build fails with "The initial content is required
for server-side rendering (SSR)."

```vue
<script setup lang="ts">
import {useContent} from '@croct/plug-nuxt/csr';

const {data} = useContent('home-hero@1', {
  initial: {
    title: 'Welcome to Croct!',
    subtitle: 'The easiest way to personalize your application.',
  },
});
</script>

<template>
  <div v-if="data">
    <strong>{{ data.title }}</strong>
    <p>{{ data.subtitle }}</p>
  </div>
</template>
```

Note the shape difference: CSR `data` is the content itself (`data.title`); SSR `data` is the fetch
response (`data.content.title`). CSR composables follow the Vue SDK API (`initial`, `fallback`,
`staleWhileLoading`, `isLoading`, and so on).

## Configuration

Set options under the `croct` key in `nuxt.config.ts`, or with environment variables (public:
`NUXT_PUBLIC_CROCT_*`; private: `NUXT_CROCT_*`).

| Module option | Env variable | Default | Notes |
| --- | --- | --- | --- |
| `appId` | `NUXT_PUBLIC_CROCT_APP_ID` | | Application ID (UUID) |
| (API key) | `NUXT_CROCT_API_KEY` | | Server only; needs **Issue user tokens** |
| `debug` | `NUXT_PUBLIC_CROCT_DEBUG` | `false` | Console logging |
| `test` | `NUXT_PUBLIC_CROCT_TEST` | `false` | Fake event transport |
| `baseEndpointUrl` | `NUXT_PUBLIC_CROCT_BASE_ENDPOINT_URL` | `https://api.croct.io` | Point at a mock server |
| `disableUserTokenAuthentication` | `NUXT_CROCT_DISABLE_USER_TOKEN_AUTHENTICATION` | `false` | Token-based user auth is on by default |
| `tokenDuration` | `NUXT_CROCT_TOKEN_DURATION` | `86400` | Seconds (24 h) |
| `defaultFetchTimeout` | `NUXT_PUBLIC_CROCT_DEFAULT_FETCH_TIMEOUT` | `2000` (env page) | ms |
| `defaultPreferredLocale` | `NUXT_PUBLIC_CROCT_DEFAULT_PREFERRED_LOCALE` | | Auto-detected with `@nuxtjs/i18n` |
| `cookie.clientId.name` / `.domain` / `.duration` | `NUXT_PUBLIC_CROCT_CLIENT_ID_COOKIE_NAME` / `_DOMAIN` / `_DURATION` | `ct.client_id` / / `31536000` (1 year) | |
| `cookie.userToken.name` / `.domain` / `.duration` | `NUXT_PUBLIC_CROCT_USER_TOKEN_COOKIE_NAME` / `_DOMAIN` / `_DURATION` | `ct.user_token` / / `604800` (7 days) | |
| `cookie.previewToken.name` / `.domain` | `NUXT_PUBLIC_CROCT_PREVIEW_TOKEN_COOKIE_NAME` / `_DOMAIN` | `ct.preview_token` | |
| `userIdResolver` | | | Module path; default export `(event: H3Event) => string \| null` (sync or async) |
| `localeResolver` | | | Module path; default export `(event: H3Event) => string \| null` |
| `credentialsResolver` | | | Module path; default export returns `{appId, apiKey}` or `null` (multi-tenancy) |
| `urlSanitizer` | | | Module path; default export `(url: string) => URL` |

Set the cookie `domain` to share identity across subdomains (for example `shop.example.com` and
`blog.example.com`).

Resolver examples:

```ts
// croct/resolveLocale.ts
export default event => getHeader(event, 'accept-language')?.split(',')[0] ?? null;
```

```ts
// croct/resolveCredentials.ts
import {getRequestHost} from 'h3';
import type {CredentialsResolver, CroctCredentials} from '@croct/plug-nuxt/types';

const resolveCredentials: CredentialsResolver = event => {
  const tenant = getRequestHost(event).split('.')[0];

  return $fetch<CroctCredentials>('https://secrets.example.com/credentials', {
    query: {tenant: tenant},
  }).catch(() => null);
};

export default resolveCredentials;
```

Do: fetch tenant credentials from an external service and cache them per tenant. Don't: call an
internal Nuxt route from `credentialsResolver`; the middleware runs on every request, so it recurses
infinitely. The resolved `appId` reaches the browser; the `apiKey` stays on the server.

## API reference

### Composables and components (SSR, auto-imported)

| Signature | Returns |
| --- | --- |
| `useCroct(): Plug` | Plug instance (client-side API) |
| `useContent<T extends SlotId>(id: T, options?: UseContentOptions): AsyncData<FetchResponse<T>>` | `{data: Ref<FetchResponse \| null>, pending: Ref<boolean>, error: Ref<Error \| null>}`; `data.content` holds the slot content |
| `useEvaluation<T extends JsonValue>(query: string, options?: UseEvaluationOptions): AsyncData<T>` | `{data: Ref<T \| null>, pending: Ref<boolean>, error: Ref<Error \| null>}` |

| Options | `useContent` | `useEvaluation` |
| --- | --- | --- |
| `fallback` | yes | yes |
| `preferredLocale` | yes | |
| `timeout` | yes | yes |
| `attributes` | yes | yes |

| Component | Props | Slots |
| --- | --- | --- |
| `<Slot>` | `id`, `fallback`, `preferredLocale`, `timeout`, `attributes` | `#default="{ content, metadata }"`, `#loading`, `#error="{ error }"` (skipped when `fallback` is set) |
| `<Personalization>` | `query`, `fallback`, `timeout`, `attributes` | `#default="{ result }"`, `#loading`, `#error="{ error }"` (skipped when `fallback` is set) |

### Server functions (auto-imported in server routes and middleware)

| Signature | Notes |
| --- | --- |
| `fetchContent<T extends SlotId>(id: T, options?: FetchOptions): Promise<FetchResponse<T>>` | Returns `{content, metadata}`. Options: `appId`/`apiKey` (exclusive), `clientId`, `clientAgent`, `clientIp`, `static`, `preferredLocale`, `userToken`, `previewToken`, `includeSchema`, `timeout`, `baseEndpointUrl`, `extra`, `logger`, `context: {timeZone, campaign, page, attributes}` |
| `evaluate<T extends JsonValue>(query: string, options?: EvaluationOptions): Promise<T>` | Same options minus `static`, `preferredLocale`, `previewToken`, `includeSchema` |
| `identify(userId: string): Promise<void>` | Issues a signed user token and sets the cookie |
| `anonymize(): Promise<void>` | Issues a new anonymous token and updates the cookie |

Use these when you need data outside a Vue component (for example an API route returning JSON):

```ts
// server/api/hero.get.ts
export default defineEventHandler(async () => {
  const {content} = await fetchContent('home-hero@1');
  return content;
});
```

### Content helpers (`@croct/content`)

| Signature | Notes |
| --- | --- |
| `getSlotContent(slotId: string, language?: string): JsonObject \| null` | Sync default content |
| `loadSlotContent(slotId: string, language?: string): Promise<JsonObject \| null>` | Async; prefer with code splitting |

### Types (`@croct/plug-nuxt/types`)

| Type | Shape |
| --- | --- |
| `SlotContent<I extends VersionedSlotId>` | Content type for a slot version |
| `ComponentContent<I extends VersionedComponentId>` | Content type for a component version |
| `UserIdResolver` | `(event: H3Event) => Promise<string \| null> \| string \| null` |
| `LocaleResolver` | `(event: H3Event) => Promise<string \| null> \| string \| null` |
| `CredentialsResolver` | `(event: H3Event) => Promise<CroctCredentials \| null> \| CroctCredentials \| null` |
| `CroctCredentials` | `{appId: string, apiKey: string}` |

## Testing

### Unit tests (Vitest + Nuxt Test Utils)

```sh
npm install -D vitest @nuxt/test-utils @vue/test-utils happy-dom
```

```ts
// vitest.config.ts
import {defineVitestConfig} from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    globals: true,
    environment: 'nuxt',
    environmentOptions: {nuxt: {domEnvironment: 'happy-dom'}},
  },
});
```

The SDK fetches through internal routes; mock `/api/_croct/content` and `/api/_croct/evaluate`:

```ts
// test/HomeHero.test.ts
import {describe, it, expect} from 'vitest';
import {mountSuspended, registerEndpoint} from '@nuxt/test-utils/runtime';
import HomeHero from '../components/HomeHero.vue';

describe('HomeHero', () => {
  it('renders personalized content', async () => {
    registerEndpoint('/api/_croct/content', {
      method: 'POST',
      handler: () => ({content: {title: 'Personalized title', subtitle: 'Personalized subtitle'}}),
    });

    const wrapper = await mountSuspended(HomeHero);
    expect(wrapper.find('h1').text()).toBe('Personalized title');
  });

  it('renders the error state on failure', async () => {
    registerEndpoint('/api/_croct/content', {
      method: 'POST',
      handler: () => {
        throw createError({statusCode: 500, statusMessage: 'Server error'});
      },
    });

    const wrapper = await mountSuspended(HomeHero);
    expect(wrapper.text()).toContain('Something went wrong');
  });
});
```

For evaluation, register `/api/_croct/evaluate` with `handler: () => true` (or throw to test the
fallback).

Tracking is client-side: mount with `createCroct` from `@croct/plug-nuxt/csr` and listen to events.
Test mode is auto-detected when `NODE_ENV=test`.

```ts
// test/TrackButton.test.ts
import {describe, it, expect, afterEach} from 'vitest';
import {mount} from '@vue/test-utils';
import {createCroct} from '@croct/plug-nuxt/csr';
import croct from '@croct/plug';
import TrackButton from '../components/TrackButton.vue'; // uses useCroct from '@croct/plug-nuxt/csr'

describe('TrackButton', () => {
  afterEach(async () => {
    await croct.unplug();
  });

  it('tracks a goal on click', async () => {
    const plugin = createCroct({appId: '00000000-0000-0000-0000-000000000000', test: true});
    const wrapper = mount(TrackButton, {global: {plugins: [plugin]}});

    const listener = vi.fn();
    croct.tracker.addListener(listener);

    await wrapper.find('button').trigger('click');

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      status: 'confirmed',
      event: {type: 'goalCompleted', goalId: 'ctaClicked'},
    }));

    croct.tracker.removeListener(listener);
  });
});
```

### Integration tests

Set `croct.baseEndpointUrl` (or `NUXT_PUBLIC_CROCT_BASE_ENDPOINT_URL`) to a mock server such as
Mockoon (`mockoon start --config croct.json`). Mockable paths: `/client/web/cid`,
`/client/web/evaluate`, `/client/web/track` (not needed in test mode), `/content`.

## Troubleshooting

Enable `debug: true` (or `NUXT_PUBLIC_CROCT_DEBUG=true`) and inspect the console and Network tab.

| Error / symptom | Cause | Fix |
| --- | --- | --- |
| "Croct's request context is missing. Make sure the @croct/plug-nuxt module is installed in your nuxt.config.ts." | Module not registered | Add `'@croct/plug-nuxt'` to `modules` |
| "Croct's API key is missing. Did you forget to set the NUXT_CROCT_API_KEY environment variable?" | No API key; server-side fetch, evaluation, and identification need it | Set `NUXT_CROCT_API_KEY` (key with **Issue user tokens**) |
| "The initial content is required for server-side rendering (SSR)." | CSR `useContent`/`<Slot>` from `@croct/plug-nuxt/csr` without `initial` on a prerendered page | Pass `initial`, or switch the route to SSR |
| Same content for every visitor on a prerendered page | Default SSR composables ran at build time | Set `routeRules: {'/path': {prerender: false}}` or use `@croct/plug-nuxt/csr` (inferred from the setup docs, not a documented problem) |
| `credentialsResolver` hangs or recurses | Resolver calls an internal Nuxt route | Call an external service; cache per tenant (inferred from the setup docs, not a documented problem) |

## Sources

- https://docs.croct.com/reference/sdk/nuxt/integration.md
- https://docs.croct.com/reference/sdk/nuxt/manual-installation.md
- https://docs.croct.com/reference/sdk/nuxt/content-rendering.md
- https://docs.croct.com/reference/sdk/nuxt/query-evaluation.md
- https://docs.croct.com/reference/sdk/nuxt/data-collection.md
- https://docs.croct.com/reference/sdk/nuxt/event-tracking.md
- https://docs.croct.com/reference/sdk/nuxt/prerendering.md
- https://docs.croct.com/reference/sdk/nuxt/testing/unit-testing.md
- https://docs.croct.com/reference/sdk/nuxt/testing/integration-testing.md
- https://docs.croct.com/reference/sdk/nuxt/troubleshooting/debugging.md
- https://docs.croct.com/reference/sdk/nuxt/troubleshooting/problem/missing-module.md
- https://docs.croct.com/reference/sdk/nuxt/troubleshooting/problem/missing-api-key.md
- https://docs.croct.com/reference/sdk/nuxt/api/configuration.md
- https://docs.croct.com/reference/sdk/nuxt/api/environment-variables.md
- https://docs.croct.com/reference/sdk/nuxt/api/composables/use-croct.md
- https://docs.croct.com/reference/sdk/nuxt/api/composables/use-content.md
- https://docs.croct.com/reference/sdk/nuxt/api/composables/use-evaluation.md
- https://docs.croct.com/reference/sdk/nuxt/api/components/slot-content.md
- https://docs.croct.com/reference/sdk/nuxt/api/components/personalization.md
- https://docs.croct.com/reference/sdk/nuxt/api/functions/fetch-content.md
- https://docs.croct.com/reference/sdk/nuxt/api/functions/evaluate.md
- https://docs.croct.com/reference/sdk/nuxt/api/functions/identify.md
- https://docs.croct.com/reference/sdk/nuxt/api/functions/anonymize.md
- https://docs.croct.com/reference/sdk/nuxt/api/content/get-slot-content.md
- https://docs.croct.com/reference/sdk/nuxt/api/content/load-slot-content.md
- https://docs.croct.com/reference/sdk/nuxt/api/types/slot-content.md
- https://docs.croct.com/reference/sdk/nuxt/api/types/component-content.md
- https://docs.croct.com/reference/sdk/nuxt/api/types/user-id-resolver.md
- https://docs.croct.com/reference/sdk/nuxt/api/types/locale-resolver.md
- https://docs.croct.com/reference/sdk/nuxt/api/types/credentials-resolver.md
- https://docs.croct.com/reference/sdk/nuxt/api/types/croct-credentials.md
