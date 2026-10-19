# Vue SDK (`@croct/plug-vue`)

Use for Vue 3 apps (Vite or similar) without Nuxt. For Nuxt, use the Nuxt SDK (`@croct/plug-nuxt`) instead:
it handles server-side fetching and evaluation automatically.

The SDK exposes a Vue plugin (`createCroct`), composables (`useCroct`, `useContent`,
`useEvaluation`), components (`<Slot>`, `<Personalization>`), and low-level server functions
(`fetchContent`, `evaluate` from `@croct/plug-vue/api`). `useCroct()` returns the
[Plug](https://docs.croct.com/reference/sdk/javascript/api/plug.md) instance, so every JavaScript SDK
method (`track`, `identify`, `anonymize`, `user.edit`, `session.edit`, `fetch`, `evaluate`) is
available.

## Install

### CLI (recommended)

```sh
npx croct@latest init
```

The CLI detects the framework, installs the SDK, and wires the plugin. Then add a slot with a
working example, generated types, and fallback content:

```sh
npx croct@latest add slot home-hero@1 --example
```

### Manual

1. Install the package:

   ```sh
   npm install @croct/plug-vue
   # pnpm add @croct/plug-vue | yarn add @croct/plug-vue | bun add @croct/plug-vue
   ```

2. Install the plugin with your Application ID (found on the application's Integration page):

   ```ts
   // src/main.ts
   import {createApp} from 'vue';
   import {createCroct} from '@croct/plug-vue';
   import App from './App.vue';

   const app = createApp(App);

   app.use(createCroct({
     appId: 'APPLICATION_ID',
   }));

   app.mount('#app');
   ```

3. Verify: open the app, then check the application's Integration page in the Croct dashboard.
   The status should read "Received traffic in the past 24 hours".

The docs do not define environment variables for the Vue SDK; pass `appId` directly (or through
your own bundler env mechanism).

## Rendering content

Use the `useContent` composable (imperative) or the `<Slot>` component (declarative).

```vue
<script setup lang="ts">
import {useContent} from '@croct/plug-vue';

const {data, isLoading, error} = useContent('home-hero@1');
</script>

<template>
  <div v-if="isLoading">Dynamic content...</div>
  <div v-else-if="error">Something went wrong: {{ error.message }}</div>
  <div v-else-if="data">
    <strong>{{ data.title }}</strong>
    <p>{{ data.subtitle }}</p>
    <a :href="data.button.link">{{ data.button.label }}</a>
  </div>
</template>
```

```vue
<script setup lang="ts">
import {Slot} from '@croct/plug-vue';
</script>

<template>
  <Slot id="home-hero@1">
    <template #default="{ content }">
      <strong>{{ content.title }}</strong>
      <p>{{ content.subtitle }}</p>
      <a :href="content.button.link">{{ content.button.label }}</a>
    </template>
    <template #loading>
      <div>Dynamic content...</div>
    </template>
    <template #error="{ error }">
      <div>Something went wrong: {{ error.message }}</div>
    </template>
  </Slot>
</template>
```

Rules:

- **Version every slot ID** (`home-hero@1`). No version means `@latest`, which can break when the
  schema changes.
- **Always have a fallback.** Pass `fallback` (option or prop). If the slot was added with the CLI,
  fallback and initial content are auto-provided from the `@croct/content` package.
- **CLI-provided `initial` hides loading states.** `#loading` is skipped (and `isLoading` stays
  `false` on first render) when `initial` is set, so a CLI-managed slot renders its default
  content instead of a loading indicator. The docs do not say how to opt out of the auto-provided
  `initial`; check `https://docs.croct.com/reference/sdk/vue/api/composables/use-content.md`.
- **SSR requires `initial`.** With server rendering, `useContent`/`<Slot>` render `initial` on the
  server and personalize on the client. Missing it throws "The initial content is required for
  server-side rendering (SSR)."
- **Locale**: `preferredLocale: 'en-ca'` (option) or `preferred-locale="en-ca"` (prop). Set a global
  default with `createCroct({defaultPreferredLocale})`. Falls back to the workspace default locale.
- **Context attributes**: `attributes: {plan: 'premium'}` become `context's plan` in CQL. Limits: up
  to 30 entries, 5 levels deep; keys are numbers or non-empty strings up to 50 chars; values are
  null, numbers, booleans, strings (up to 50 chars), or nested maps.

```vue
<script setup lang="ts">
import {useContent} from '@croct/plug-vue';

const {data} = useContent('home-hero@1', {
  initial: {title: 'Welcome to Croct!', subtitle: '...', button: {label: 'Get started', link: '/signup'}},
  fallback: {title: 'Welcome to Croct!', subtitle: '...', button: {label: 'Get started', link: '/signup'}},
  preferredLocale: 'en-ca',
  attributes: {plan: 'premium'},
});
</script>
```

### Typing

```ts
import type {SlotContent, ComponentContent} from '@croct/plug-vue';

type HeroContent = SlotContent<'home-hero@1'>;
type BannerProps = ComponentContent<'banner@1'>;
```

With CLI-generated types the parameters are constrained to known IDs. If a slot is a union of
components, `SlotContent` is a discriminated union on `_type` (the component ID); a single-component
slot resolves to a plain object without `_type`.

## Query evaluation

```vue
<script setup lang="ts">
import {useEvaluation} from '@croct/plug-vue';

const {data: isDeveloper} = useEvaluation("user's persona is 'developer'", {
  fallback: false,
  // initial: false,  // required when server-rendering
});
</script>

<template>
  <a v-if="isDeveloper" href="/docs">View docs</a>
  <a v-else href="/share">Share with your developer</a>
</template>
```

```vue
<script setup lang="ts">
import {Personalization} from '@croct/plug-vue';

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

Results are any JSON value, not only booleans (for example, `useEvaluation('location')` returns a
location object with `cityName`, `stateName`, `countryName`). Queries are limited to 500 characters.
For CQL syntax, see the `croct-cql` skill.

## Event tracking

Call Plug methods inside event handlers or `onMounted`, never at the top level of `<script setup>`
when server-rendering.

```vue
<script setup lang="ts">
import {useCroct} from '@croct/plug-vue';

const croct = useCroct();

function onCtaClick() {
  croct.track('goalCompleted', {goalId: 'ctaClicked'});
}
</script>

<template>
  <a href="/signup" @click="onCtaClick">Sign up for free</a>
</template>
```

Recommended events:

| Event | When | Key payload |
| --- | --- | --- |
| `goalCompleted` | User completes a business goal (enables conversion metrics) | `{goalId}` |
| `userSignedUp` | User registers | `{userId, profile?}` |
| `orderPlaced` | Order confirmed | `{order: {orderId, currency, total, items[]}}` |
| `cartViewed` | Cart viewed | `{cart: {currency, total, items[]}}` |
| `cartModified` | Cart changed (send the full current cart, not the diff) | `{cart}` |
| `checkoutStarted` | Checkout begins | `{cart}` |

Item shape: `{index, total, quantity, product: {productId, name, displayPrice}}`.

## Data collection

```ts
const croct = useCroct();

// Standard profile attribute
croct.user.edit().set('email', email).save();

// Custom profile attribute (prefix `custom.`; query as `user's expertise`)
croct.user.edit().set('custom.expertise', 'Engineering').save();

// Session attribute (query as `session's plan`)
croct.session.edit().set('plan', 'premium').save();

// Identity
croct.identify(userId); // on login/sign-up
croct.anonymize();      // on logout
```

`edit()` returns a `Patch`; chain operations and `await patch.save()` to confirm. If the user stays
logged in across sessions, pass `userId` (or a signed `token`) to `createCroct` so the SDK does not
create an extra anonymous session before `identify` runs:

```ts
app.use(createCroct({appId: 'APPLICATION_ID', userId: userId}));
```

Do not pass `userId` when the application has **Require signed token** enabled; pass a signed `token`
instead.

## SSR and server-side functions

Composables and components fetch on the client. For server-rendered Vue without Nuxt:

- Provide `initial` to every `useContent`/`<Slot>`/`useEvaluation`/`<Personalization>`.
- Call Plug methods only in `onMounted` or client callbacks; otherwise the SDK throws
  "Property `croct.someMethod` is not supported on server-side (SSR)...".
- For real server-side personalization, call the low-level functions from `@croct/plug-vue/api`
  with an API key (server only):

```ts
import {fetchContent, evaluate} from '@croct/plug-vue/api';

const {content, metadata} = await fetchContent('home-hero@1', {
  apiKey: process.env.CROCT_API_KEY, // never in client code
  clientId, clientIp, clientAgent,
  preferredLocale: 'en',
});

const returning = await evaluate<boolean>('user is returning', {apiKey: process.env.CROCT_API_KEY});
```

`appId` (client) and `apiKey` (server) are mutually exclusive; passing both errors.

## API reference

### `createCroct(options: CroctPluginOptions): Plugin`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `appId` | `string` | | Application ID |
| `debug` | `boolean` | `false` | Logs to console |
| `test` | `boolean` | `false` | Fake transport; auto-detected when `NODE_ENV=test` |
| `track` | `boolean` | `true` | Automatic event tracking on init |
| `clientId` | `string` | | Usually server-generated |
| `token` | `string \| null` | | JWT; exclusive with `userId`; `null` clears |
| `userId` | `string` | | Exclusive with `token`; not with "Require signed token" |
| `tokenScope` | `'global' \| 'isolated' \| 'contextual'` | `global` | Token sync across tabs |
| `defaultFetchTimeout` | `number` | `5000` | ms |
| `defaultPreferredLocale` | `string` | | Global content locale |
| `eventMetadata` | `object` | | Up to 5 entries; keys up to 20 chars; string values up to 300 chars |
| `logger` | `{debug, info, warn, error}` | | Logs suppressed by default |
| `urlSanitizer` | `(url: string) => URL` | | Strip sensitive data from URLs |
| `baseEndpointUrl` | `string` | production | Paths: `/client/web/cid`, `/client/web/evaluate`, `/client/web/track`, `/content` |
| `cidAssignerEndpointUrl` | `string` | built-in | Custom CID assigner |
| `disableCidMirroring` | `boolean` | `false` | |
| `cookie` | `{clientId?, userToken?, previewToken?}` | | Each: `{name, secure?=true, maxAge?, domain?, path?, sameSite?='none'}` |

### Composables

| Signature | Returns |
| --- | --- |
| `useCroct(): Plug` | Plug instance; throws "`useCroct()` requires the Croct plugin to be installed." without the plugin |
| `useContent<T extends SlotId>(id: MaybeRefOrGetter<T>, options?: MaybeRefOrGetter<UseContentOptions>)` | `{data: ShallowRef<SlotContent<T> \| undefined>, metadata: ShallowRef<ContentMetadata \| undefined>, isLoading: Ref<boolean>, error: Ref<Error \| null>}` |
| `useEvaluation<T extends JsonValue>(query: MaybeRefOrGetter<string>, options?: MaybeRefOrGetter<UseEvaluationOptions>)` | `{data: ShallowRef<T \| undefined>, isLoading: Ref<boolean>, error: Ref<Error \| null>}` |

Shared options (`useContent`, `useEvaluation`, and the matching component props):

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `initial` | JSON | | Required for SSR; otherwise `data` is `undefined` and `isLoading` is `true` until loaded |
| `fallback` | JSON | | Used on error; otherwise `error` is set and `data` stays `undefined` |
| `expiration` | `number` | `60000` | Cache ms, extended on each render; negative = never expires |
| `cacheKey` | `string` | derived | Set a unique key to force refetch |
| `staleWhileLoading` | `boolean` | `false` | Composables only; keep previous value while reloading |
| `preferredLocale` | `string` | workspace default | Content only |
| `timeout` | `number` | | ms |
| `attributes` | `object` | | Becomes CQL `context` |

### Components

| Component | Props | Slots |
| --- | --- | --- |
| `<Slot>` | `id`, `initial`, `fallback`, `expiration`, `cacheKey`, `preferredLocale`, `timeout`, `attributes` | `#default="{ content, metadata }"`, `#loading`, `#error="{ error }"` |
| `<Personalization>` | `query`, `initial`, `fallback`, `expiration`, `cacheKey`, `timeout`, `attributes` | `#default="{ result }"`, `#loading`, `#error="{ error }"` |

`#loading` is skipped when `initial` is set; `#error` is skipped when `fallback` is set.

### Server functions (`@croct/plug-vue/api`)

| Signature | Notes |
| --- | --- |
| `fetchContent<T extends SlotId>(id: T, options: FetchOptions): Promise<{content, metadata}>` | Options: `appId` or `apiKey`, `clientId`, `clientAgent`, `clientIp` (`127.0.0.1` = use request IP), `static`, `preferredLocale`, `userToken`, `previewToken`, `includeSchema`, `timeout`, `baseEndpointUrl`, `extra` (fetch options), `logger`, `context: {timeZone, campaign, page, attributes}` |
| `evaluate<T extends JsonValue>(query: string, options: EvaluationOptions): Promise<T>` | Same options minus `static`, `preferredLocale`, `previewToken`, `includeSchema` |

`metadata` contains `version`, optional `schema`, and optional
`experience: {experienceId, audienceId, experiment?: {experimentId, variantId}}`.

### Content helpers (`@croct/content`)

| Signature | Notes |
| --- | --- |
| `getSlotContent(slotId: string, language?: string): JsonObject \| null` | Sync default content |
| `loadSlotContent(slotId: string, language?: string): Promise<JsonObject \| null>` | Async; prefer with code-splitting bundlers |

### Types

`SlotContent<I extends VersionedSlotId>`, `ComponentContent<I extends VersionedComponentId>`.

## Testing

### Unit tests

Test mode is auto-enabled when `NODE_ENV=test` (Jest, Vitest); force it with
`createCroct({test: true})`. It uses a fake transport, so assert on emitted events:

```ts
import {mount} from '@vue/test-utils';
import {createCroct} from '@croct/plug-vue';
import croct from '@croct/plug';
import InterestButton from './InterestButton.vue';

it('adds an interest to the profile', async () => {
  const wrapper = mount(InterestButton, {
    global: {plugins: [createCroct({appId: '00000000-0000-0000-0000-000000000000'})]},
  });

  const listener = vi.fn();
  croct.tracker.addListener(listener);

  await wrapper.find('button').trigger('click');

  expect(listener).toHaveBeenCalledWith(expect.objectContaining({
    status: 'confirmed',
    event: {
      type: 'userProfileChanged',
      patch: {operations: [{path: 'interest', type: 'add', value: 'tests'}]},
    },
  }));
});
```

To control content or evaluation results, provide a mock Plug through `CROCT_INJECTION_KEY`:

```ts
import {mount, flushPromises} from '@vue/test-utils';
import {CROCT_INJECTION_KEY} from '@croct/plug-vue';
import HomeHero from './HomeHero.vue';

it('renders personalized content', async () => {
  const mockFetch = vi.fn().mockResolvedValue({content: {title: 'Banner title'}});
  // For queries: {plug: {evaluate: vi.fn().mockResolvedValue(true)}}

  const wrapper = mount(HomeHero, {
    global: {provide: {[CROCT_INJECTION_KEY]: {plug: {fetch: mockFetch}}}},
  });

  expect(mockFetch).toHaveBeenCalledWith('home-hero@1', expect.any(Object));
  await flushPromises();
  expect(wrapper.find('h1').text()).toBe('Banner title');
});
```

Test fallbacks by resolving the mock with the fallback content (fetch) or rejecting it
(`mockRejectedValue(new Error('Failed'))` for evaluate).

### Integration tests

Point the SDK at a mock server (the docs use Mockoon: `npm install -g @mockoon/cli`,
`mockoon start --config croct.json`):

```ts
app.use(createCroct({appId: 'APPLICATION_ID', baseEndpointUrl: 'http://localhost:3000'}));
```

Mock `/client/web/cid`, `/client/web/evaluate`, `/content`, and `/client/web/track` (not needed in
test mode). Use bodies copied from real responses.

## Troubleshooting

Enable `debug: true` in `createCroct` and check the browser console and Network tab.

| Error / symptom | Cause | Fix |
| --- | --- | --- |
| "`useCroct()` requires the Croct plugin to be installed." | Plugin not installed | `app.use(createCroct({appId}))` before mount |
| "The initial content is required for server-side rendering (SSR)." | `useContent`/`<Slot>` rendered on server without `initial` | Pass `initial`, or fetch on the server with `fetchContent` (or use Nuxt) |
| "The initial value is required for server-side rendering (SSR)." | `useEvaluation`/`<Personalization>` on server without `initial` | Pass `initial`, or use `evaluate` server-side (or use Nuxt) |
| "Property `croct.someMethod` is not supported on server-side (SSR)..." | Plug method called during SSR setup | Move into `onMounted` or an event handler |
| No traffic on Integration page | Wrong/missing `appId`, blocked requests | Check `appId`, enable `debug`, inspect Network tab |

## Sources

- https://docs.croct.com/reference/sdk/vue/integration.md
- https://docs.croct.com/reference/sdk/vue/manual-installation.md
- https://docs.croct.com/reference/sdk/vue/content-rendering.md
- https://docs.croct.com/reference/sdk/vue/query-evaluation.md
- https://docs.croct.com/reference/sdk/vue/data-collection.md
- https://docs.croct.com/reference/sdk/vue/event-tracking.md
- https://docs.croct.com/reference/sdk/vue/testing/unit-testing.md
- https://docs.croct.com/reference/sdk/vue/testing/integration-testing.md
- https://docs.croct.com/reference/sdk/vue/troubleshooting/debugging.md
- https://docs.croct.com/reference/sdk/vue/troubleshooting/problem/missing-plugin.md
- https://docs.croct.com/reference/sdk/vue/troubleshooting/problem/missing-slot-content.md
- https://docs.croct.com/reference/sdk/vue/troubleshooting/problem/missing-evaluation-result.md
- https://docs.croct.com/reference/sdk/vue/troubleshooting/problem/client-logic-ssr.md
- https://docs.croct.com/reference/sdk/vue/api/functions/create-croct.md
- https://docs.croct.com/reference/sdk/vue/api/functions/fetch-content.md
- https://docs.croct.com/reference/sdk/vue/api/functions/evaluate.md
- https://docs.croct.com/reference/sdk/vue/api/composables/use-croct.md
- https://docs.croct.com/reference/sdk/vue/api/composables/use-content.md
- https://docs.croct.com/reference/sdk/vue/api/composables/use-evaluation.md
- https://docs.croct.com/reference/sdk/vue/api/components/slot-content.md
- https://docs.croct.com/reference/sdk/vue/api/components/personalization.md
- https://docs.croct.com/reference/sdk/vue/api/content/get-slot-content.md
- https://docs.croct.com/reference/sdk/vue/api/content/load-slot-content.md
- https://docs.croct.com/reference/sdk/vue/api/types/slot-content.md
- https://docs.croct.com/reference/sdk/vue/api/types/component-content.md
