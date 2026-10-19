# Next.js SDK (`@croct/plug-next`)

Server-first SDK for the App Router and Pages Router. Server functions come from
`@croct/plug-next/server`; client hooks/components from `@croct/plug-next` (same API as the React
SDK); the provider from `@croct/plug-next/CroctProvider`; middleware from
`@croct/plug-next/middleware` (Next ≤ 15) or `@croct/plug-next/proxy` (Next ≥ 16).

## Install

CLI (recommended; automates the manual steps below). It is interactive, so ask the user to run it:

```sh
npx croct@latest init
```

Manual, four steps:

1. Install:

   ```sh
   npm install @croct/plug-next
   ```

2. Environment variables (`.env.local`). Create the API key with the **Issue user tokens**
   permission so the SDK can sign user tokens:

   ```bash
   NEXT_PUBLIC_CROCT_APP_ID=<APPLICATION_ID>
   CROCT_API_KEY=<API_KEY>
   ```

3. Middleware / proxy. New file at the project root:

   ```js
   // middleware.js (Next ≤ 15)
   export {middleware} from '@croct/plug-next/middleware';

   export const config = {
     matcher: "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
   };
   ```

   ```js
   // proxy.js (Next ≥ 16 renamed the middleware convention to proxy)
   export {proxy} from '@croct/plug-next/proxy';

   export const config = {
     matcher: "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
   };
   ```

   Existing middleware/proxy: wrap it with `withCroct` and pass your matcher so Croct extends it:

   ```js
   import {NextResponse} from 'next/server';
   import {withCroct} from '@croct/plug-next/proxy'; // '@croct/plug-next/middleware' on Next ≤ 15

   const config = {matcher: '/about/:path*'};

   function log(request) {
     return NextResponse.next();
   }

   export const proxy = withCroct({next: log, matcher: config.matcher}); // `middleware` on Next ≤ 15
   ```

4. Provider at the root (no `appId` prop needed; it reads `NEXT_PUBLIC_CROCT_APP_ID`):

   ```jsx
   // app/layout.jsx
   import {CroctProvider} from '@croct/plug-next/CroctProvider';

   export default function RootLayout({children}) {
     return (
       <html lang="en">
         <body>
           <CroctProvider>{children}</CroctProvider>
         </body>
       </html>
     );
   }
   ```

   ```jsx
   // pages/_app.jsx
   import {CroctProvider} from '@croct/plug-next/CroctProvider';

   export default function App({Component, pageProps}) {
     return (
       <CroctProvider>
         <Component {...pageProps} />
       </CroctProvider>
     );
   }
   ```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CROCT_APP_ID` | — | Application ID (required) |
| `CROCT_API_KEY` | — | API key with **Issue user tokens** (required; server only) |
| `NEXT_PUBLIC_CROCT_DEBUG` | `false` | Debug logs (server: terminal; client: browser console) |
| `NEXT_PUBLIC_CROCT_TEST` | `false` | Test mode |
| `NEXT_PUBLIC_CROCT_BASE_ENDPOINT_URL` | `https://api.croct.io` | Mock server URL |
| `CROCT_DISABLE_USER_TOKEN_AUTHENTICATION` | `false` | Disable token-based user auth |
| `CROCT_TOKEN_DURATION` | `86400` | User token lifetime (s) |
| `NEXT_PUBLIC_CROCT_DEFAULT_FETCH_TIMEOUT` | `2000` | Request timeout (ms) |
| `NEXT_PUBLIC_CROCT_DEFAULT_PREFERRED_LOCALE` | — | Only if not using Next i18n routing (auto-detected) |
| `NEXT_PUBLIC_CROCT_CLIENT_ID_COOKIE_NAME` / `_DURATION` / `_DOMAIN` | `ct.client_id` / `31536000` / — | Client ID cookie; set domain to share across subdomains |
| `NEXT_PUBLIC_CROCT_USER_TOKEN_COOKIE_NAME` / `_DURATION` / `_DOMAIN` | `ct.user_token` / `604800` / — | User token cookie |
| `NEXT_PUBLIC_CROCT_PREVIEW_TOKEN_COOKIE_NAME` / `_DOMAIN` | `ct.preview_token` / — | Preview token cookie |

Never prefix the API key with `NEXT_PUBLIC_`.

## Render content on the server

Add the slot first: `npx croct@latest add slot home-hero@1 --example` (types + default content
fallback). Always pass the ID; without it the CLI prompts for a slot.

`fetchContent<T extends SlotId>(id: T, options?: FetchOptions): Promise<FetchResponse<T>>` from
`@croct/plug-next/server`. It reads the request (client ID, IP, user agent, token, page, campaign,
preview token, i18n locale are forwarded automatically).

App Router (server component):

```jsx
import {fetchContent} from '@croct/plug-next/server';

export async function HomeHero() {
  const {content} = await fetchContent('home-hero@1');

  return (
    <div>
      <strong>{content.title}</strong>
      <p>{content.subtitle}</p>
      <a href={content.button.link}>{content.button.label}</a>
    </div>
  );
}
```

Pages Router: pass `route: context` (required outside the App Router):

```jsx
import {fetchContent} from '@croct/plug-next/server';
import {HomeHero} from '../components/HomeHero';

export const getServerSideProps = async context => ({
  props: await fetchContent('home-hero@1', {route: context}),
});

export default function HomePage({content}) {
  return <HomeHero {...content} />;
}
```

Common options (all optional):

```js
await fetchContent('home-hero@1', {
  fallback: {title: 'Welcome to Croct!'},        // overrides CLI default content
  preferredLocale: 'en-ca',                      // Pages Router i18n routing: auto; App Router: pass it or use `localeResolver`
  context: {attributes: {plan: 'premium'}},      // CQL: context's plan is "premium"
  timeout: 2000,
});
```

Other options: `route: {req, res}`, `clientId`, `clientAgent`, `clientIp`, `userToken`,
`previewToken` (all auto-configured), `static` (fetch default static content), `includeSchema`,
`baseEndpointUrl`, `extra`, `logger` (default: warnings and errors to console), `context.timeZone`,
`context.campaign`, `context.page`. Returns `{content, metadata}`.

Typing: `import type {SlotContent, ComponentContent} from '@croct/plug-next';`.

## Render content on the client

Same API as the React SDK, imported from `@croct/plug-next`, inside `'use client'` components:

```jsx
'use client';

import {useContent} from '@croct/plug-next';

export function HomeHero() {
  const {content} = useContent('home-hero@1', {
    initial: {title: 'Welcome to Croct!', subtitle: 'The easiest way to personalize your application.'},
  });

  return <strong>{content.title}</strong>;
}
```

Options for `useContent` / `<Slot>` / `useEvaluation` / `<Personalization>` (`initial`,
`fallback`, `expiration`, `cacheKey`, `staleWhileLoading`, `preferredLocale`, `timeout`,
`attributes`): see `references/react.md` (listed in SKILL.md). `initial` (or `<Suspense>`) is required because pages
prerender on the server.

## Prerendering and static pages

| | Server (`fetchContent`) | Client (`useContent` + `initial`) |
| --- | --- | --- |
| Final content on first load | Yes | No |
| No flicker | Yes | No |
| Visible to crawlers | Yes | No (crawlers see `initial`) |
| Served as a static file | No | Yes |
| Runs without a server (`output: 'export'`) | No | Yes |

- Default to the server. `fetchContent` reads the request, so Next renders that route
  **dynamically**; the rest of the site stays prerendered. Optionally make it explicit with
  `export const dynamic = 'force-dynamic';`.
- In the App Router, wrap the component that calls `fetchContent` in `<Suspense>` to stream it
  without blocking the page.
- To keep a route static (CDN, `output: 'export'`, below-the-fold sections), **do not** call
  `fetchContent` there; use client hooks with `initial`.
- With `output: 'export'` there is no server, so the middleware/proxy, `userIdResolver`, and
  server-side `identify` never run (a consequence of static export; the docs do not cover it).
  Identify users on the client with `useCroct().identify()`.

## Evaluate queries

Server: `evaluate<T extends JsonValue>(query, options?)` or the App-Router-only tag
`` cql`...` `` (auto-interpolates values, no options). Max 500 characters.

```jsx
import {evaluate, cql} from '@croct/plug-next/server';

export async function DocsLink() {
  const isDeveloper = await evaluate("user's persona is 'developer'", {fallback: false});
  return isDeveloper ? <a href="/docs">View docs</a> : <a href="/share">Share with your developer</a>;
}

export async function Location() {
  const roles = ['developer', 'engineer'];
  const isTechnical = await cql`user's persona is in ${roles}`;
  const location = await cql`location`;
  return <address>{location.cityName}, {location.countryName}</address>;
}
```

Pages Router: `await evaluate('user is returning', {route: context, fallback: false})` inside
`getServerSideProps`. Attributes go in `context: {attributes: {...}}`. Evaluate options mirror
`fetchContent` minus content-only ones (`static`, `preferredLocale`, `previewToken`,
`includeSchema`).

Client: `useEvaluation` / `<Personalization>` from `@croct/plug-next` (see `references/react.md`, listed in SKILL.md).

## Identify and anonymize

Preferred (automatic): resolve the user ID from your auth session on every request so the Croct
token stays in sync (renewal, expired sessions):

```js
// proxy.js (Next ≥ 16); use '@croct/plug-next/middleware' and `export const middleware` on ≤ 15
import jwt from 'next-auth/jwt';
import {withCroct} from '@croct/plug-next/proxy';

const secret = process.env.SECRET;

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
};

export const proxy = withCroct({
  userIdResolver: async req => (await jwt.getToken({req, secret}))?.sub ?? null,
});
```

Manual: `identify(userId: string, route?: RouteContext): Promise<void>` and
`anonymize(route?: RouteContext): Promise<void>` from `@croct/plug-next/server`.

```js
// app/actions.js
'use server';

import {identify, anonymize} from '@croct/plug-next/server';

export async function identifyUser(userId) {
  await identify(userId);
}

export async function anonymizeUser() {
  await anonymize();
}
```

Pages Router / API routes: `await identify(username, {req, res})`, `await anonymize({req, res})`.

### `withCroct` signatures

```ts
withCroct(): NextProxy                                    // same as the exported proxy/middleware
withCroct(next: NextProxy, userIdResolver?: UserIdResolver): NextProxy
withCroct(options: CroctProxyOptions): NextProxy
```

Options: `next` (your handler, runs after Croct), `matcher` (merged with Croct's), `userIdResolver:
(request: NextRequest) => Promise<string | null>`, `localeResolver: (request: NextRequest) =>
Promise<string | null>` (locale from URL, subdomain, header, or cookie; `null` = workspace
default).

## Data collection and tracking (client)

```jsx
'use client';

import {useCroct} from '@croct/plug-next';

export function PlanCard({plan}) {
  const croct = useCroct();

  const onSelect = () => {
    croct.session.edit().set('plan', plan).save();
    croct.track('goalCompleted', {goalId: 'plan-selected'});
  };

  return <button onClick={onSelect}>Select</button>;
}
```

`useCroct()` returns the JavaScript SDK `Plug`; call it only in effects or handlers. Profile:
`croct.user.edit().set('email', email).save()`; custom attributes use the `custom.` prefix. Events:
`croct-track-events` skill.

## Provider props

`<CroctProvider>` (from `@croct/plug-next/CroctProvider`) accepts the JavaScript SDK plug options
as props; most are auto-configured or have env var equivalents: `appId`
(`NEXT_PUBLIC_CROCT_APP_ID`), `debug`, `test`, `track`, `clientId` and `token`/`userId`
(auto-forwarded from the request), `tokenScope`, `defaultFetchTimeout` (2000 ms),
`defaultPreferredLocale`, `eventMetadata`, `logger`, `urlSanitizer`, `baseEndpointUrl`, `cookie`
(`clientId`, `userToken`, `previewToken` cookie settings).

## Testing

- Test mode auto-enables when `NODE_ENV=test`; or set `NEXT_PUBLIC_CROCT_TEST=true` or
  `<CroctProvider test>`.
- Client components: render inside
  `<CroctProvider appId="00000000-0000-0000-0000-000000000000">` and spy on `@croct/plug`
  (`jest.spyOn(croct, 'fetch')`, `jest.spyOn(croct, 'evaluate')`, `croct.tracker.addListener`),
  exactly as in the Testing section of `references/react.md`.
- Integration tests: `NEXT_PUBLIC_CROCT_BASE_ENDPOINT_URL=http://localhost:3000` and a mock server
  (Mockoon). Mockable paths: `/client/web/cid`, `/client/web/evaluate`, `/client/web/track` (skip
  in test mode), `/content`. Server functions call `/external/web/content`,
  `/external/web/static-content`, and `/external/web/evaluate`.

## Troubleshooting

Set `NEXT_PUBLIC_CROCT_DEBUG=true`; read server logs in the terminal and client logs in the
browser console. API-level errors (credentials, CORS, timeouts, MAU, suspension):
the Troubleshooting section of `references/javascript.md`. Client hook errors: the Troubleshooting
section of `references/react.md`.

| Error | Fix |
| --- | --- |
| `Did you forget to configure Croct's middleware?` | Add `middleware.js` / `proxy.js` (all server functions depend on request data it provides) |
| `someFunction() requires specifying the route parameter outside app routes.` | Pages Router / API routes: pass `route: context` or `{req, res}` to `fetchContent`, `evaluate`, `identify`, `anonymize` |
| `cql() can only be used with App Router.` | Use `evaluate(query, {route})` |
| `Did you forget to set the SOME_ENV_VAR environment variable?` | Set `NEXT_PUBLIC_CROCT_APP_ID` and `CROCT_API_KEY` |
| A page you expected to be static renders dynamically | It calls `fetchContent`/`evaluate`; switch to client hooks with `initial` |

## Sources

- https://docs.croct.com/reference/sdk/nextjs/integration.md
- https://docs.croct.com/reference/sdk/nextjs/manual-installation.md
- https://docs.croct.com/reference/sdk/nextjs/content-rendering.md
- https://docs.croct.com/reference/sdk/nextjs/query-evaluation.md
- https://docs.croct.com/reference/sdk/nextjs/data-collection.md
- https://docs.croct.com/reference/sdk/nextjs/event-tracking.md
- https://docs.croct.com/reference/sdk/nextjs/prerendering.md
- https://docs.croct.com/reference/sdk/nextjs/testing/unit-testing.md
- https://docs.croct.com/reference/sdk/nextjs/testing/integration-testing.md
- https://docs.croct.com/reference/sdk/nextjs/troubleshooting/debugging.md
- https://docs.croct.com/reference/sdk/nextjs/troubleshooting/problem.md
- https://docs.croct.com/reference/sdk/nextjs/api/environment-variables.md
- https://docs.croct.com/reference/sdk/nextjs/api/components/croct-provider.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/fetch-content.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/evaluate.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/cql.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/identify.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/anonymize.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/with-croct.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/proxy.md
- https://docs.croct.com/reference/sdk/nextjs/api/hooks/use-content.md
