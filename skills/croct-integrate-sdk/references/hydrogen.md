# Shopify Hydrogen SDK (`@croct/plug-hydrogen`)

Use for Shopify Hydrogen storefronts on **React Router 7** or **Remix**. Hydrogen renders on the
server, so the default pattern is: fetch content and evaluate queries in **loaders** with the
server functions, then render from loader data (no flicker). Client hooks and components exist for
content that must update after load. Standard storefront analytics are forwarded to Croct
automatically.

Entry points:

| Import | Exports |
| --- | --- |
| `@croct/plug-hydrogen` | `<CroctProvider>`, `<Slot>`, `<Personalization>`, `useCroct`, `useContent`, `useEvaluation`, types `SlotContent`, `ComponentContent` |
| `@croct/plug-hydrogen/server` | `createCroctMiddleware`, `createCroctContext`, `writeCroctCookies`, `fetchContent`, `evaluate`, `identify`, `anonymize` |
| `@croct/plug-hydrogen/vite` | `croct()` Vite plugin |

## Install

### CLI (recommended)

```sh
npx croct@latest init
```

The CLI detects React Router 7 or Remix and wires everything. Then add a slot with example code,
generated types, and fallback content:

```sh
npx croct@latest add slot home-hero@1 --example
```

### Manual

Checklist (all steps required):

1. Install the package.

   ```sh
   npm install @croct/plug-hydrogen
   # pnpm add @croct/plug-hydrogen | yarn add @croct/plug-hydrogen | bun add @croct/plug-hydrogen
   ```

2. Set environment variables. Create the API key with the **Issue user tokens** permission.

   ```bash
   # .env
   PUBLIC_CROCT_APP_ID=<APPLICATION_ID>
   CROCT_API_KEY=<API_KEY>
   ```

3. Add the Vite plugin **after** the Hydrogen and router plugins. It bakes the public config into
   the browser bundle.

   ```ts
   // vite.config.ts
   import {defineConfig} from 'vite';
   import {hydrogen} from '@shopify/hydrogen/vite';
   import {oxygen} from '@shopify/mini-oxygen/vite';
   import {reactRouter} from '@react-router/dev/vite'; // or remix() on Remix
   import {croct} from '@croct/plug-hydrogen/vite';

   export default defineConfig({
     plugins: [hydrogen(), oxygen(), reactRouter(), croct()],
   });
   ```

4. Wire the request context (resolves client ID, user token, locale, and preview state per request).

   React Router 7, on the **root** route:

   ```tsx
   // app/root.tsx
   import {createCroctMiddleware} from '@croct/plug-hydrogen/server';

   export const middleware = [createCroctMiddleware()];
   ```

   Remix (no route middleware), in the `getLoadContext` wrapper:

   ```ts
   // app/lib/context.ts
   import {createHydrogenContext} from '@shopify/hydrogen';
   import {createCroctContext} from '@croct/plug-hydrogen/server';

   export async function createAppLoadContext(request, env, executionContext) {
     const hydrogenContext = createHydrogenContext({
       // ...your existing Hydrogen context options
     });

     const croct = await createCroctContext(request, hydrogenContext);

     return {...hydrogenContext, croct};
   }
   ```

5. Add the provider in the root route, **inside** Shopify's `<Analytics.Provider>` (so storefront
   events reach Croct). No `appId` prop needed; the Vite plugin injects it.

   ```tsx
   // app/root.tsx
   import {CroctProvider} from '@croct/plug-hydrogen';

   export default function App() {
     const data = useRouteLoaderData('root');

     return (
       <Analytics.Provider cart={data.cart} shop={data.shop} consent={data.consent}>
         <CroctProvider>
           <PageLayout {...data}>
             <Outlet />
           </PageLayout>
         </CroctProvider>
       </Analytics.Provider>
     );
   }
   ```

6. Write the visitor cookies in the server entry, **after** committing the Hydrogen session (or the
   session `Set-Cookie` overwrites Croct's cookies). Same on React Router 7 and Remix.

   ```ts
   // server.ts
   import {writeCroctCookies} from '@croct/plug-hydrogen/server';

   const response = await handleRequest(request);

   if (context.session.isPending) {
     response.headers.set('Set-Cookie', await context.session.commit());
   }

   writeCroctCookies(response, context);

   return response;
   ```

7. If the storefront sets a Content Security Policy, allow the Croct API (merged with Hydrogen's
   defaults):

   ```ts
   const {nonce, header, NonceProvider} = createContentSecurityPolicy({
     shop: {
       checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
       storeDomain: context.env.PUBLIC_STORE_DOMAIN,
     },
     connectSrc: ['https://api.croct.io'],
   });
   ```

8. Verify: open the storefront and check the application's Integration page in the Croct dashboard
   for "Received traffic in the past 24 hours".

## Rendering content

Fetch in the loader with `scope: context`, render from loader data:

```tsx
// app/routes/_index.tsx
import {useLoaderData} from 'react-router'; // Remix: '@remix-run/react'
import {fetchContent} from '@croct/plug-hydrogen/server';

export async function loader({context}) {
  const {content} = await fetchContent('home-hero@1', {
    scope: context,
    fallback: {
      title: 'Welcome to Croct!',
      subtitle: 'The easiest way to personalize your storefront.',
      button: {label: 'Get started', link: '/'},
    },
    // preferredLocale: 'en-CA',                       // BCP-47; default from storefront i18n
    // context: {attributes: {plan: 'premium'}},       // CQL: context's plan
  });

  return {hero: content};
}

export default function Index() {
  const {hero} = useLoaderData();

  return (
    <div>
      <strong>{hero.title}</strong>
      <p>{hero.subtitle}</p>
      <a href={hero.button.link}>{hero.button.label}</a>
    </div>
  );
}
```

Rules:

- **Version slot IDs** (`home-hero@1`); no version means latest.
- **Fallback**: CLI-added slots already include fallback content from `@croct/content`. Otherwise
  pass `fallback`.
- **Locale**: defaults to the storefront's `i18n` configuration; override with `preferredLocale` or
  a `localeResolver`. Missing locales fall back to the workspace default.
- **Attributes** go under `context: {attributes}` in server functions, and as `attributes` on
  client hooks/components. Limits (client options): up to 30 entries, 5 levels deep; keys numbers or
  non-empty strings up to 50 chars; values null, numbers, booleans, strings up to 50 chars, or
  nested maps.

### Client-side content

For content that must update on the client after load, use `useContent` or `<Slot>`. They need
`initial` to render on the server; without it, client rendering suspends (wrap in `<Suspense>`) and
SSR throws "The initial content is required for server-side rendering (SSR)."

```tsx
import {useContent, Slot} from '@croct/plug-hydrogen';

export function HomeHero() {
  const {content} = useContent('home-hero@1', {initial: null, fallback: {title: 'Welcome'}});

  if (content === null) {
    return <div>Personalizing...</div>;
  }

  return <h1>{content.title}</h1>;
}

export function HomeHeroDeclarative() {
  return (
    <Slot id="home-hero@1">
      {({content}) => <strong>{content.title}</strong>}
    </Slot>
  );
}
```

### Typing

```tsx
import type {SlotContent, ComponentContent} from '@croct/plug-hydrogen';

type HeroContent = SlotContent<'home-hero@1'>;
type CardProps = ComponentContent<'card@1'>;
```

Union slots resolve to a discriminated union on `_type` (switch on `props._type`); single-component
slots resolve to a plain object.

## Query evaluation

Server (preferred, flicker-free):

```tsx
import {useLoaderData} from 'react-router';
import {evaluate} from '@croct/plug-hydrogen/server';

export async function loader({context}) {
  const country = await evaluate<string | null>("location's country", {
    scope: context,
    fallback: null,
  });

  const isPremium = await evaluate("context's plan is 'premium'", {
    scope: context,
    context: {attributes: {plan: 'premium'}},
  });

  return {country, isPremium};
}

export default function Index() {
  const {country} = useLoaderData();

  return <p>Hello from {country ?? 'somewhere'}!</p>;
}
```

Client:

```tsx
import {useEvaluation, Personalization} from '@croct/plug-hydrogen';

export function CountryGreeting() {
  const country = useEvaluation("location's country", {initial: null});

  return <p>Hello from {country ?? 'somewhere'}!</p>;
}

export function ViewDocsLink() {
  return (
    <Personalization query="user's persona is 'developer'" initial={false} fallback={false}>
      {isDeveloper => (isDeveloper ? <a href="/docs">View docs</a> : <a href="/share">Share</a>)}
    </Personalization>
  );
}
```

Queries are limited to 500 characters. For CQL, see the `croct-cql` skill.

## Event tracking

With `<CroctProvider>` inside `<Analytics.Provider>`, the bundled analytics bridge forwards
Shopify storefront analytics automatically:

| Shopify analytics | Croct event |
| --- | --- |
| Product view | `productViewed` |
| Cart view | `cartViewed` |
| Cart update | `cartModified` |
| Collection view, search view | `interestShown` |

- **Checkout and orders** happen on Shopify-hosted checkout, which the SDK cannot see. Set up the
  Shopify pixel integration (`PUBLIC_CROCT_SHOPIFY_PIXEL=true` shares the visitor with the pixel).
- **Consent**: `track` defaults to `auto`, which waits for Shopify's Customer Privacy API to allow
  tracking. `always` ignores consent; `never` disables automatic tracking (manual tracking still
  works). Set through `PUBLIC_CROCT_TRACK` or the provider's `track` prop.
- **Custom events** via `useCroct`, called in event handlers or `useEffect`:

```tsx
import {useCroct} from '@croct/plug-hydrogen';

export function NewsletterButton() {
  const croct = useCroct();

  return (
    <button onClick={() => croct.track('goalCompleted', {goalId: 'newsletter-signup'})}>
      Subscribe
    </button>
  );
}
```

## Data collection

Client-side profile and session edits use the Plug API:

```tsx
const croct = useCroct();

croct.user.edit().set('email', email).save();                    // standard attribute
croct.user.edit().set('custom.expertise', 'Engineering').save(); // custom (query: user's expertise)
croct.session.edit().set('plan', 'premium').save();             // session (query: session's plan)
```

### Identity

| Situation | Approach |
| --- | --- |
| Shopify customer accounts (Customer Account API) | Nothing to do; the logged-in customer is identified on every request |
| Guest-only store, classic Storefront API accounts, Auth0/SSO/custom auth | Pass a `userIdResolver` to the middleware (RR7) or `createCroctContext` (Remix); return the ID or `null` |
| Control identity inside a request | `identify(userId, context)` / `anonymize(context)` in an action |

```tsx
// React Router 7
export const middleware = [
  createCroctMiddleware({
    userIdResolver: context => resolveUserId(context), // your auth; null when anonymous
  }),
];

// Remix
const croct = await createCroctContext(request, hydrogenContext, {
  userIdResolver: context => resolveUserId(context),
});
```

```tsx
// app/routes/login.tsx
import {redirect} from 'react-router';
import {identify} from '@croct/plug-hydrogen/server';
import type {Route} from './+types/login';

export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  await identify(String(form.get('customerId')), context);
  return redirect('/account');
}
```

```tsx
// app/routes/logout.tsx
import {redirect} from 'react-router';
import {anonymize} from '@croct/plug-hydrogen/server';
import type {Route} from './+types/logout';

export async function action({context}: Route.ActionArgs) {
  await anonymize(context);
  return redirect('/');
}
```

The re-issued token is persisted by `writeCroctCookies`. Purchase history from checkout requires the
Shopify pixel integration.

## Environment variables

`PUBLIC_*` values are baked into the browser bundle by the Vite plugin; the rest stay on the server.

| Variable | Default | Notes |
| --- | --- | --- |
| `PUBLIC_CROCT_APP_ID` | | Required. Application ID (UUID) |
| `CROCT_API_KEY` | | Required. Server only; needs **Issue user tokens** |
| `PUBLIC_CROCT_DEBUG` | `false` | Logs to server logs and browser console; disable before production |
| `PUBLIC_CROCT_TEST` | `false` | Fake event transport |
| `PUBLIC_CROCT_TRACK` | `auto` | `auto` / `always` / `never` |
| `PUBLIC_CROCT_SHOPIFY_PIXEL` | `false` | Share the visitor with the Shopify pixel via a cookie on the storefront/checkout common domain (uses `PUBLIC_CHECKOUT_DOMAIN`) |
| `PUBLIC_CROCT_SHOPIFY_PIXEL_COOKIE_DOMAIN` | common domain | Set if `PUBLIC_CHECKOUT_DOMAIN` is not defined |
| `PUBLIC_CROCT_BASE_ENDPOINT_URL` | `https://api.croct.io` | Mock server for tests |
| `CROCT_DISABLE_USER_TOKEN_AUTHENTICATION` | `false` | |
| `CROCT_TOKEN_DURATION` | `86400` | Seconds |
| `PUBLIC_CROCT_DEFAULT_FETCH_TIMEOUT` | `2000` | ms |
| `PUBLIC_CROCT_DEFAULT_PREFERRED_LOCALE` | | e.g. `en-us` |
| `PUBLIC_CROCT_CLIENT_ID_COOKIE_NAME` / `_DURATION` / `_DOMAIN` | `ct.client_id` / `31536000` / | |
| `PUBLIC_CROCT_USER_TOKEN_COOKIE_NAME` / `_DURATION` / `_DOMAIN` | `ct.user_token` / `604800` / | |
| `PUBLIC_CROCT_PREVIEW_TOKEN_COOKIE_NAME` / `_DOMAIN` | `ct.preview_token` / | |

## API reference

### Setup (`@croct/plug-hydrogen/server`, `/vite`)

| Signature | Notes |
| --- | --- |
| `croct(): Plugin` | Vite plugin; no arguments |
| `createCroctMiddleware(options?: CroctOptions): MiddlewareFunction` | React Router 7; export from root route `middleware` |
| `createCroctContext(request: Request, scope: ResolverContext, options?: CroctOptions): Promise<RequestContext>` | Remix; merge result under `croct` in the load context |
| `writeCroctCookies(response: Response, context: CroctContext): void` | Server entry, after session commit |

### Server functions (`@croct/plug-hydrogen/server`)

| Signature | Options |
| --- | --- |
| `fetchContent<I extends VersionedSlotId, C extends JsonObject>(slotId: I, options: FetchOptions<SlotContent<I, C>>): Promise<FetchResponse<I, C>>` | `scope` (load context, required), `context?: EvaluationContext`, `fallback?: JsonObject`, `preferredLocale?: string` |
| `evaluate<T extends JsonValue>(query: string, options: EvaluationOptions<T>): Promise<T>` | `scope`, `context?`, `fallback?: T` |
| `identify(userId: string, scope: CroctContext): Promise<void>` | Re-issues the user token for the customer |
| `anonymize(scope: CroctContext): Promise<void>` | Re-issues an anonymous token |

### Components and hooks (`@croct/plug-hydrogen`)

| API | Signature / props |
| --- | --- |
| `<CroctProvider>` | Props usually injected by the Vite plugin: `appId`, `debug`, `test`, `track` (`auto`/`always`/`never`), `clientId`, `token`, `userId`, `tokenScope` (`global`/`isolated`/`contextual`), `defaultFetchTimeout` (2000), `defaultPreferredLocale`, `eventMetadata`, `logger`, `urlSanitizer`, `baseEndpointUrl`, `cookie` |
| `useCroct(): Plug` | Plug instance; client-only methods |
| `useContent<T extends SlotId>(id: T, options?: FetchOptions): FetchResponse<T>` | Returns `{content, metadata}` |
| `useEvaluation<T extends JsonValue>(query: string, options?: EvaluationOptions): T` | Returns the result |
| `<Slot id children={(...) => ReactNode} ...>` | Render-prop child |
| `<Personalization query children={(result) => ReactNode} ...>` | Render-prop child |

Client options (hooks and components): `initial` (required for SSR; otherwise suspends), `fallback`
(otherwise throws on error), `expiration` (60000 ms; negative = never), `cacheKey`,
`staleWhileLoading` (false), `preferredLocale` (content only), `timeout`, `attributes`.

### Content helpers (`@croct/content`)

| Signature | Notes |
| --- | --- |
| `getSlotContent(slotId: string, language?: string): JsonObject \| null` | Sync default content |
| `loadSlotContent(slotId: string, language?: string): Promise<JsonObject \| null>` | Async; prefer with code splitting |

### Types

| Type | Shape |
| --- | --- |
| `CroctContext` | `{env: unknown, croct?: RequestContext}` (the loader/action `context`) |
| `RequestContext` | `{clientId, userToken, uri, clientAgent \| null, referrer \| null, clientIp \| null, preferredLocale \| null, previewToken \| null}` |
| `ResolverContext` | `{env, customerAccount: {isLoggedIn(), query()}, storefront: {i18n: {language, country}}}` |
| `CroctOptions` | `{userIdResolver?: UserIdResolver, localeResolver?: LocaleResolver}` |
| `UserIdResolver` | `(context: ResolverContext) => Promise<string \| null> \| string \| null` |
| `LocaleResolver` | `(context: ResolverContext) => Promise<string \| null> \| string \| null` (BCP-47) |
| `SlotContent<I extends VersionedSlotId>` / `ComponentContent<I extends VersionedComponentId>` | Content types |

## Testing

### Unit tests (Jest + React Testing Library)

Test mode is auto-detected when `NODE_ENV=test`; force with `PUBLIC_CROCT_TEST=true` or the
provider's `test` prop. Assert on tracked events:

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CroctProvider} from '@croct/plug-hydrogen';
import croct from '@croct/plug';
import InterestButton from './InterestButton';

it('adds an interest to the profile', async () => {
  render(
    <CroctProvider appId="00000000-0000-0000-0000-000000000000">
      <InterestButton />
    </CroctProvider>,
  );

  const listener = jest.fn();
  croct.tracker.addListener(listener);

  await userEvent.click(screen.getByText('Add interest'));

  expect(listener).toHaveBeenCalledWith(expect.objectContaining({
    status: 'confirmed',
    event: {
      type: 'userProfileChanged',
      patch: {operations: [{path: 'interest', type: 'add', value: 'tests'}]},
    },
  }));
});
```

Mock client content and evaluation by spying on the Plug:

```tsx
const fetchContent = jest.spyOn(croct, 'fetch');
fetchContent.mockResolvedValue({content: {title: 'Banner title'}});
// or .mockRejectedValue(new Error('Failed')) to test fallbacks

const evaluateQuery = jest.spyOn(croct, 'evaluate');
evaluateQuery.mockRejectedValue(new Error('Failed to evaluate query'));
```

The docs do not show how to unit test loaders that call the server functions.

### Integration tests

Set `PUBLIC_CROCT_BASE_ENDPOINT_URL=http://localhost:3000` and run a mock server (the docs use
Mockoon: `npm install -g @mockoon/cli`, `mockoon start --config croct.json`). Mockable paths:
`/client/web/cid`, `/client/web/evaluate`, `/client/web/track` (not needed in test mode),
`/content`.

## Troubleshooting

Enable `PUBLIC_CROCT_DEBUG=true`: server logs show loader/action fetches, the browser console shows
client tracking and evaluation, and responses include processing region and timing.

| Error / symptom | Cause | Fix |
| --- | --- | --- |
| "Did you forget to set the `PUBLIC_CROCT_APP_ID` environment variable?" | Required env var missing | Set `PUBLIC_CROCT_APP_ID` and `CROCT_API_KEY` |
| "Croct's request context is missing. Did you configure Croct's middleware (React Router) or `createCroctContext` (Remix)?" | Context never resolved for the request | RR7: register `createCroctMiddleware()` on the **root** route. Remix: call `createCroctContext` in `getLoadContext` and merge under `croct`. Pass the loader's own `context` as `scope` |
| "`useCroct()` can only be used in the context of a `<CroctProvider>` component." | Provider missing | Wrap the app in `<CroctProvider>` inside `<Analytics.Provider>` |
| "The initial content is required for server-side rendering (SSR)." | `useContent`/`<Slot>` without `initial` | Fetch in the loader with `fetchContent` and pass data down, or set `initial` |
| "The initial value is required for server-side rendering (SSR)." | `useEvaluation`/`<Personalization>` without `initial` | Evaluate in the loader with `evaluate`, or set `initial` |
| "Property `croct.someMethod` is not supported on server-side (SSR)..." | Plug method called during server render | Move into `useEffect` or an event handler; use server functions in loaders/actions |
| Visitor identity lost / cookies missing | `writeCroctCookies` called before session commit, or not called | Call it after `context.session.commit()` (inferred from the setup docs, not a documented problem) |
| Browser requests to Croct blocked | CSP | Add `connectSrc: ['https://api.croct.io']` (inferred from the setup docs, not a documented problem) |
| No automatic events | Provider outside `<Analytics.Provider>`, or consent not granted in `auto` mode | Move provider inside; check consent or set `PUBLIC_CROCT_TRACK=always` (inferred from the setup docs, not a documented problem) |

## Sources

- https://docs.croct.com/reference/sdk/hydrogen/integration.md
- https://docs.croct.com/reference/sdk/hydrogen/manual-installation.md
- https://docs.croct.com/reference/sdk/hydrogen/content-rendering.md
- https://docs.croct.com/reference/sdk/hydrogen/query-evaluation.md
- https://docs.croct.com/reference/sdk/hydrogen/data-collection.md
- https://docs.croct.com/reference/sdk/hydrogen/event-tracking.md
- https://docs.croct.com/reference/sdk/hydrogen/testing/unit-testing.md
- https://docs.croct.com/reference/sdk/hydrogen/testing/integration-testing.md
- https://docs.croct.com/reference/sdk/hydrogen/troubleshooting/debugging.md
- https://docs.croct.com/reference/sdk/hydrogen/troubleshooting/problem/missing-environment-variable.md
- https://docs.croct.com/reference/sdk/hydrogen/troubleshooting/problem/missing-context.md
- https://docs.croct.com/reference/sdk/hydrogen/troubleshooting/problem/missing-provider.md
- https://docs.croct.com/reference/sdk/hydrogen/troubleshooting/problem/missing-slot-content.md
- https://docs.croct.com/reference/sdk/hydrogen/troubleshooting/problem/missing-evaluation-result.md
- https://docs.croct.com/reference/sdk/hydrogen/troubleshooting/problem/client-logic-ssr.md
- https://docs.croct.com/reference/sdk/hydrogen/api/environment-variables.md
- https://docs.croct.com/reference/sdk/hydrogen/api/setup/vite-plugin.md
- https://docs.croct.com/reference/sdk/hydrogen/api/setup/create-croct-middleware.md
- https://docs.croct.com/reference/sdk/hydrogen/api/setup/create-croct-context.md
- https://docs.croct.com/reference/sdk/hydrogen/api/setup/write-croct-cookies.md
- https://docs.croct.com/reference/sdk/hydrogen/api/functions/fetch-content.md
- https://docs.croct.com/reference/sdk/hydrogen/api/functions/evaluate.md
- https://docs.croct.com/reference/sdk/hydrogen/api/functions/identify.md
- https://docs.croct.com/reference/sdk/hydrogen/api/functions/anonymize.md
- https://docs.croct.com/reference/sdk/hydrogen/api/components/croct-provider.md
- https://docs.croct.com/reference/sdk/hydrogen/api/components/slot.md
- https://docs.croct.com/reference/sdk/hydrogen/api/components/personalization.md
- https://docs.croct.com/reference/sdk/hydrogen/api/hooks/use-croct.md
- https://docs.croct.com/reference/sdk/hydrogen/api/hooks/use-content.md
- https://docs.croct.com/reference/sdk/hydrogen/api/hooks/use-evaluation.md
- https://docs.croct.com/reference/sdk/hydrogen/api/content/get-slot-content.md
- https://docs.croct.com/reference/sdk/hydrogen/api/content/load-slot-content.md
- https://docs.croct.com/reference/sdk/hydrogen/api/types/croct-context.md
- https://docs.croct.com/reference/sdk/hydrogen/api/types/request-context.md
- https://docs.croct.com/reference/sdk/hydrogen/api/types/resolver-context.md
- https://docs.croct.com/reference/sdk/hydrogen/api/types/croct-options.md
- https://docs.croct.com/reference/sdk/hydrogen/api/types/user-id-resolver.md
- https://docs.croct.com/reference/sdk/hydrogen/api/types/locale-resolver.md
- https://docs.croct.com/reference/sdk/hydrogen/api/types/slot-content.md
- https://docs.croct.com/reference/sdk/hydrogen/api/types/component-content.md
