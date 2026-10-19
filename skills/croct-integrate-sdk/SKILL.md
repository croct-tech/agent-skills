---
name: croct-integrate-sdk
description: >-
  Use when installing or using a Croct SDK in application code: rendering slot content, evaluating
  CQL queries, server or client fetching, prerendering, identifying users, app ID / API key env
  vars, testing, or debugging. Covers JavaScript (`@croct/plug`, `croct.fetch`, `croct.evaluate`),
  React (`@croct/plug-react`, `<CroctProvider>`, `useContent`, `<Slot>`, `useEvaluation`,
  `useCroct`), Next.js (`@croct/plug-next`, `fetchContent`, `cql`, middleware/proxy,
  `NEXT_PUBLIC_CROCT_APP_ID`, `CROCT_API_KEY`), Vue (`@croct/plug-vue`), Nuxt (`@croct/plug-nuxt`),
  Shopify Hydrogen (`@croct/plug-hydrogen`), PHP (`croct/plug-php`), Laravel, Symfony, and Drupal.
  Triggers: slot IDs like `home-hero@1`, `SlotContent`, "Croct is not plugged in", "initial
  content is required for server-side rendering", "Did you forget to configure Croct's
  middleware?", CORS errors.
---

# Integrate a Croct SDK

Wire a Croct SDK into an app so it renders slot content, evaluates CQL, and identifies users.
Content and audiences live in the Croct dashboard; the code only references **slots** by ID and
version and supplies a fallback.

## Workflow

```
- [ ] 1. Detect the stack and pick the SDK (table below)
- [ ] 2. Install with the CLI (`croct init`, run by the user), manual only if asked or the CLI cannot run
- [ ] 3. Add the slot with the CLI (`npx croct@latest add slot home-hero@1 --example`) for types + fallback
- [ ] 4. Render it: server-side when the framework allows, client-side otherwise
- [ ] 5. Identify/anonymize users at login/logout (or pass the user ID at init)
- [ ] 6. Verify: Integration page shows "Received traffic in the past 24 hours"; else debug mode
```

### 1. Pick the SDK

Read `package.json` / `composer.json` first. Pick the most specific SDK for the framework; never
use the plain JavaScript SDK inside React, Next.js, Vue, Nuxt, or Hydrogen.

| Stack | Package | Initialize with | Server rendering | Reference |
| --- | --- | --- | --- | --- |
| Plain JS, any bundler, or `<script>` tag | `@croct/plug` (or `https://cdn.croct.io/js/v1/lib/plug.js`) | `croct.plug({appId})` once at startup | Standalone `fetchContent`/`evaluate` from `@croct/plug/api` with `apiKey` | [javascript.md](references/javascript.md) |
| React (SPA, Vite, any non-Next SSR) | `@croct/plug-react` | `<CroctProvider appId="...">` at the root | Client hooks need `initial`; low-level `@croct/plug-react/api` | [react.md](references/react.md) |
| Next.js (App or Pages Router) | `@croct/plug-next` | middleware (`≤15`) / proxy (`≥16`) + `<CroctProvider>` from `@croct/plug-next/CroctProvider` | Yes: `@croct/plug-next/server` | [nextjs.md](references/nextjs.md) |
| Vue | `@croct/plug-vue` | `app.use(createCroct({appId}))` | Composables/components; SSR needs initial values | [vue.md](references/vue.md) |
| Nuxt | `@croct/plug-nuxt` | `modules: ['@croct/plug-nuxt']` in `nuxt.config` | Yes | [nuxt.md](references/nuxt.md) |
| Shopify Hydrogen (React Router 7 or Remix) | `@croct/plug-hydrogen` | Vite plugin + `createCroctMiddleware` / `createCroctContext` from `@croct/plug-hydrogen/server` | Yes | [hydrogen.md](references/hydrogen.md) |
| Plain PHP | `croct/plug-php` (+ a PSR-18 client, e.g. `guzzlehttp/guzzle nyholm/psr7`) | `Croct::fromDotenv()` then `Croct::emitCookies()` before output | Yes (server-first) | [php.md](references/php.md) |
| Laravel | `croct/plug-laravel` | `.env` credentials | Yes | [laravel.md](references/laravel.md) |
| Symfony | `croct/plug-symfony symfony/twig-bundle` | Register bundle in `config/bundles.php` + `.env` credentials | Yes (Twig) | [symfony.md](references/symfony.md) |
| Drupal | `croct/plug-drupal` | Enable module; credentials in `settings.php`; rebuild cache | Yes | [drupal.md](references/drupal.md) |
| Storyblok (JS or PHP) | — | Use the `croct-integrate-platforms` skill | — | — |
| Unsupported language or raw HTTP | — | Use the `croct-use-api` skill | — | — |

### 2. Install

Every SDK's integration page, including PHP, Laravel, Symfony, Drupal, and Hydrogen, recommends
the CLI. `init` is interactive and needs a signed-in session, so ask the user to run it from the
project root in their own terminal:

```sh
npx croct@latest init
```

`croct init` detects the framework, signs in, selects the organization/workspace/application,
installs the matching SDK, and wires the setup (provider, middleware, env vars). When the user
already has a session and knows the IDs, you can run the non-interactive form yourself:
`npx croct@latest --no-interaction init --sdk next --org <org> --wor <workspace> --dev-app <dev-app> --prod-app <prod-app>`
(`--sdk` accepts only `javascript`, `react`, `vue`, `next`, `nuxt`; omit it to auto-detect). Flags,
CI use, and `croct.json` live in the `croct-use-cli` skill. Fall back to the manual steps in the
framework's reference file only when the user asks or the CLI cannot run.

### 3. Add the slot

Always pass the slot ID and version. Without them, the CLI prompts for a slot, which you cannot
answer:

```sh
npx croct@latest add slot home-hero@1 --example
```

This generates TypeScript types (so `useContent('home-hero@1')` / `fetchContent('home-hero@1')` are
typed), downloads the slot's default content as automatic fallback, and writes a working example.
Re-run `croct install` / `croct update` to resync after dashboard changes (see `croct-use-cli`).

## Core concepts (all SDKs)

### Slot IDs and versions

- Reference a slot as `<id>@<version>`, e.g. `home-hero@1`. No version (`home-hero`) means
  `home-hero@latest`.
- **Always pin a version.** Unpinned slots pick up breaking schema changes immediately. When the
  dashboard creates a new major version, the app keeps receiving the old version until the code is
  bumped.
- Type content with `SlotContent<'home-hero@1'>` and `ComponentContent<'card@1'>` (exported by
  `@croct/plug`, `@croct/plug-react`, `@croct/plug-next`). Union slots resolve to a discriminated
  union on `_type`.

### Fallback, default, and initial content

| Term | What it is | Where it comes from |
| --- | --- | --- |
| Default content | Slot content shown when no experience matches, the locale has none, static content is requested, or retrieval fails | Dashboard |
| Fallback | Value rendered when the request fails | `fallback` option in code, else CLI-downloaded default content (`@croct/content`) |
| Initial (React/Next client hooks) | Value rendered during SSR/prerender and while loading on the client | `initial` option; CLI adds it automatically |

Resolution order in the SDK: **dynamic content → explicit `fallback` → CLI default content →
error**. Without a fallback and without CLI content, a failed fetch throws (JS `croct.fetch`
rejects). Read CLI content directly with `getSlotContent(slotId, locale?)` /
`loadSlotContent(slotId, locale?)` from `@croct/content` (prefer the async one with code splitting).

### Client vs server rendering

| Need | Do |
| --- | --- |
| Final content in first HTML, no flicker, crawlable | Fetch on the server (Next `fetchContent` from `@croct/plug-next/server`, Nuxt, Hydrogen, PHP family) |
| Page must stay a static file / CDN / `output: 'export'` | Client hooks/components with an `initial` value or a `<Suspense>` boundary |
| Below-the-fold section where a skeleton is fine | Client-side is fine |
| Server rendering in plain React / custom SSR | `fetchContent` / `evaluate` from `@croct/plug-react/api` (or `@croct/plug/api`) with `apiKey`, then pass content as props |

Server-side requests authenticate with an **API key** (never ship it to the browser); client-side
requests use the **application ID**. Passing both `appId` and `apiKey` to a standalone function is
an error.

### Query evaluation

Evaluate CQL at runtime with `croct.evaluate(query, {attributes})` (JS), `useEvaluation` /
`<Personalization>` (React/Next client), or `evaluate` / `` cql`...` `` (Next server). Queries are
limited to **500 characters**; results can be any JSON (`'location'` returns an object). Always
supply a fallback (`.catch(() => false)` or `fallback: false`). CQL syntax: `croct-cql` skill.

Evaluation or slot? The docs present slots as the way to update content without code changes;
an evaluated query lives in code and changes only with a deploy.

| Need | Use |
| --- | --- |
| Content, audience, or rollout that marketers change, schedule, or A/B test | A slot plus an experience (see `croct-personalize-and-test`) |
| Logic fixed by engineering (show/hide a widget, branch on a condition), no content to edit | `evaluate` / `useEvaluation` with a fallback |

### Context attributes

Pass app-specific data (plan, cart state) as `attributes` (JS/React) or `context.attributes`
(Next server, standalone functions); read it in CQL as `context's plan is "premium"`. Limits: up
to 30 entries, 5 levels deep, keys ≤ 50 chars, string values ≤ 50 chars.

### Credentials and environment variables

| Stack | App ID | API key |
| --- | --- | --- |
| Next.js | `NEXT_PUBLIC_CROCT_APP_ID` | `CROCT_API_KEY` |
| Nuxt | `NUXT_PUBLIC_CROCT_APP_ID` | `NUXT_CROCT_API_KEY` |
| Hydrogen | `PUBLIC_CROCT_APP_ID` | `CROCT_API_KEY` |
| PHP, Laravel, Symfony | `CROCT_APP_ID` | `CROCT_API_KEY` |
| Drupal | `$settings['croct.app_id']` | `$settings['croct.api_key']` |
| JavaScript, React, Vue | `appId` option / prop | server-side standalone functions only |

- Find the app ID on the application's Integration page; create keys on its API keys page.
- For server SDKs that issue user tokens (Next.js), the API key needs the **Issue user tokens**
  permission.
- Each environment has its own application. A production app ID used on localhost (or vice versa)
  fails with invalid credentials.

### Identify and anonymize

- Call `identify(userId)` on login/sign-up and `anonymize()` on logout. Identity changes end the
  current session and start a new one.
- If the user is already logged in when the page loads, pass the ID at init (`userId` in
  `croct.plug` / `<CroctProvider>`) so the SDK does not create an extra anonymous session.
- `userId` must be a **string**; convert numeric IDs (preferably server-side). Prefer random IDs
  (UUID v4) over emails or sequential numbers.
- When **Require signed token** is on in Application settings, `userId`/`identify` (unsigned
  tokens) fail; pass a signed `token` instead. Next.js signs tokens for you with `CROCT_API_KEY`.
- Next.js: prefer `withCroct({userIdResolver})` in middleware/proxy to keep the token in sync with
  the auth session on every request.

### Plug options worth knowing

`appId`, `debug`, `test`, `track` (auto tracking, default `true`), `userId` / `token` (mutually
exclusive), `tokenScope` (`global` | `isolated` | `contextual`), `defaultFetchTimeout` (JS/React
5000 ms; Next 2000 ms), `defaultPreferredLocale`, `baseEndpointUrl` (mock servers), `cookie`
(store client ID / user token / preview token in first-party cookies), `eventMetadata`,
`urlSanitizer`, `logger`. Full list: [javascript.md](references/javascript.md#plug-configuration).

### Tracking and data collection

Track goals with `croct.track('goalCompleted', {goalId})`; edit profile/session with
`croct.user.edit().set(...).save()` / `croct.session.edit()`. Event catalog, recommended events,
and attribute rules: `croct-track-events` skill.

## Pitfalls

Do:

- Pin slot versions (`home-hero@1`) and keep fallbacks (CLI default content or explicit).
- Provide `initial` (or `<Suspense>`) for every client `useContent`/`useEvaluation` that may render
  on the server.
- Call client-only `Plug` methods (`useCroct().track`, `identify`, `user.edit`) inside `useEffect`
  or event handlers, never during render.
- Add every domain that loads the SDK to the application's **Trusted origins**.
- Turn on debug mode first when something is off (`debug: true`, `NEXT_PUBLIC_CROCT_DEBUG=true`),
  then check the Network tab.

Don't:

- Call `croct.plug` twice (call `unplug()` first) or call any method before `plug` ("Croct is not
  plugged in").
- Put the API key in client code or in `NEXT_PUBLIC_*` variables.
- Specify the app ID both in the script tag `?appId=` and in `plug` (conflicting app ID error).
- Call Next `fetchContent` on a route you want to stay static; it opts the route into dynamic
  rendering. Use client hooks there.
- Use the `cql` tag outside the Next.js App Router; use `evaluate` with `route`.

## Common errors

| Error | Fix |
| --- | --- |
| `Croct is not plugged in.` | Call `croct.plug` at startup before other calls |
| `The app ID must be specified when it cannot be auto-detected.` | Pass `appId` (or `?appId=` on the script tag) |
| `The request was not authorized, most likely due to invalid credentials.` | Wrong app ID, wrong environment, expired/tampered token (clear cookies + local storage), or unsigned token with **Require signed token** on |
| CORS error / `The origin of the request is not allowed in your application settings.` | Add the domain under Trusted origins |
| `The user ID must be a string.` | Convert the ID to a string |
| `The request timed out.` | Raise `timeout` / default timeout; check `X-Croct-Timing` / `X-Croct-Region` in debug logs |
| `The query is too complex.` | Query over 500 chars; simplify, split, or pass data via attributes |
| `The service is temporarily suspended.` | Not a code bug: workspace suspended or bot traffic (`X-Suspension-Reason`); keep fallbacks |
| `The application has exceeded the monthly active users (MAU) quota.` | Upgrade plan or wait for next cycle |
| `useCroct() can only be used in the context of a <CroctProvider> component.` | Wrap the tree in `<CroctProvider>` |
| `The initial content/value is required for server-side rendering (SSR).` | Add `initial`, or fetch on the server |
| `Did you forget to configure Croct's middleware?` | Add Next middleware/proxy |
| `someFunction() requires specifying the route parameter outside app routes.` | Pass `route: context` (Pages Router/API routes) |
| `Did you forget to set the SOME_ENV_VAR environment variable?` | Set `NEXT_PUBLIC_CROCT_APP_ID` / `CROCT_API_KEY` |
| Content not updated after publishing (no error) | Client hooks cache results for `expiration` (60 s, extended on every render); change `cacheKey` to force a refetch. Check the change is published, not a draft. A pinned version (`home-hero@1`) never gets a new major version: run `croct upgrade`. Stale fallback after a failed request: `croct update` refreshes CLI default content |

## Reference index

Load only the file for the stack in use.

- [references/javascript.md](references/javascript.md) — `@croct/plug`: plug options, `fetch`,
  `evaluate`, `test`, identity, patches, standalone `@croct/plug/api`, testing, errors.
- [references/react.md](references/react.md) — `@croct/plug-react`: provider, `useContent`,
  `<Slot>`, `useEvaluation`, `<Personalization>`, `useCroct`, SSR initial values, testing.
- [references/nextjs.md](references/nextjs.md) — `@croct/plug-next`: middleware/proxy, server
  `fetchContent`/`evaluate`/`cql`/`identify`/`anonymize`, prerendering, env vars, testing.
- [references/vue.md](references/vue.md) — `@croct/plug-vue`.
- [references/nuxt.md](references/nuxt.md) — `@croct/plug-nuxt`.
- [references/hydrogen.md](references/hydrogen.md) — `@croct/plug-hydrogen`.
- [references/php.md](references/php.md) — `croct/plug-php`.
- [references/laravel.md](references/laravel.md) — `croct/plug-laravel`.
- [references/symfony.md](references/symfony.md) — `croct/plug-symfony`.
- [references/drupal.md](references/drupal.md) — `croct/plug-drupal`.

## Live docs

- SDK index: `https://docs.croct.com/reference/sdk.md`
- Any SDK page as markdown: `https://docs.croct.com/reference/sdk/<framework>/<page>.md`
  (e.g. `.../nextjs/content-rendering.md`)
- Search: `https://docs.croct.com/api/search.md?term=<terms>`; index: `https://docs.croct.com/llms.txt`
