# Getting data to Croct reliably

Routing SDK traffic through your domain, sharing identity across subdomains, signing user
tokens, tracking from a server, and what gets filtered out (bots).

## Ad blockers

Ad blockers match request URLs against filter lists (EasyList, EasyPrivacy) and drop matches
silently at the network level: no response and usually no error in your code. Analytics and
personalization vendors are commonly listed. The ad-blocker guide lists three browser SDK
endpoints on `https://api.croct.io`:

| Path | Purpose | When blocked |
|---|---|---|
| `/client/web/evaluate` | CQL query evaluation | Audience conditions cannot resolve |
| `/client/web/track` | Event tracking | Events lost, analytics undercount |
| `/content` | Slot content | Default content or nothing renders |

The guide writes the content path as `/content`; the Content API documents the client endpoint as
`/client/web/content` (see the `croct-use-api` skill). The SDK testing pages also list
`/client/web/cid` (assigns the client ID); the ad-blocker guide does not say whether filter lists
block it.

Symptoms: conversion rates and engagement undercount, some visitors see only default content,
audiences and experiments run on partial traffic. The fix is first-party routing.

## First-party API routing (proxy)

Serve `your-domain.com/croct/*` and forward to `https://api.croct.io/*`, then point the SDK at
it. Pick one proxy:

```js
// next.config.js (Next.js or Vercel; no extra server)
module.exports = {
  async rewrites() {
    return [
      {source: '/croct/:path*', destination: 'https://api.croct.io/:path*'},
    ];
  },
};
```

```js
// worker.js (Cloudflare Worker; route your-domain.com/croct/* to it)
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL(url.pathname.replace('/croct', ''), 'https://api.croct.io');

    target.search = url.search;

    const headers = new Headers(request.headers);

    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP'));

    return fetch(new Request(target, {method: request.method, headers: headers, body: request.body}));
  },
};
```

```nginx
# nginx.conf
location /croct/ {
  proxy_pass https://api.croct.io/;
  proxy_ssl_server_name on;
  proxy_set_header Host api.croct.io;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

```js
// server.js (Express; deps: express ^4.21.0, http-proxy-middleware ^3.0.0)
const express = require('express');
const {createProxyMiddleware} = require('http-proxy-middleware');

const app = express();

app.use(
  '/croct',
  createProxyMiddleware({
    target: 'https://api.croct.io',
    changeOrigin: true,
    pathRewrite: {'^/croct': ''},
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader('X-Forwarded-For', req.ip);
      },
    },
  }),
);

app.listen(process.env.PORT || 3001);
```

Keep the `X-Forwarded-For` header forwarding where an example sets it. The Next.js rewrite example
sets no headers; the docs do not say whether rewrites preserve the client IP.

Configure the SDK:

| SDK | Setting |
|---|---|
| `@croct/plug` | `croct.plug({appId, baseEndpointUrl: 'https://your-domain.com/croct'})` |
| `@croct/plug-react` | `<CroctProvider appId="..." baseEndpointUrl="https://your-domain.com/croct">` |
| `@croct/plug-next` | `NEXT_PUBLIC_CROCT_BASE_ENDPOINT_URL=https://your-domain.com/croct` |
| `@croct/plug-vue` | `createCroct({appId, baseEndpointUrl: '...'})` |
| `@croct/plug-nuxt` | `croct: {appId, baseEndpointUrl: '...'}` in `nuxt.config` |

Verify: in the Network tab, requests go to `/croct/...` on your domain and none to
`api.croct.io`; then enable an ad blocker, reload, and confirm requests still succeed and
dynamic content renders.

## Cross-subdomain identification

By default the SDK stores identifiers in `localStorage`, scoped to one origin, so
`www.example.com` and `app.example.com` see different anonymous users. Store both identifiers
in first-party cookies on the parent domain instead:

- `clientId`: identifies the browser.
- `userToken`: holds the user token.

Apply the same configuration on **every** domain and subdomain where the SDK runs, and set
`domain` to the main domain (`example.com`) even on subdomains.

```js
import croct from '@croct/plug';

croct.plug({
  appId: 'APPLICATION_ID',
  cookie: {
    clientId: {name: 'croct.id', maxAge: 31536000, domain: 'example.com', path: '/'},
    userToken: {name: 'croct.user_token', maxAge: 31536000, domain: 'example.com', path: '/'},
  },
});
```

React: pass the same object as `<CroctProvider cookie={{...}}>`. Nuxt: `croct.cookie` in
`nuxt.config`. Next.js uses environment variables:

```bash
NEXT_PUBLIC_CROCT_CLIENT_ID_COOKIE_DOMAIN=example.com
NEXT_PUBLIC_CROCT_USER_TOKEN_COOKIE_DOMAIN=example.com
```

(The Next.js tutorial snippet shows only the user-token variable; the environment-variable
reference documents both for multi-subdomain recognition. Defaults: cookie names
`ct.client_id` / `ct.user_token`, durations 1 year / 7 days.)

Cookie options per entry (`clientId`, `userToken`, `previewToken`): `name` (required, ASCII),
`secure` (default `true`), `maxAge` (seconds), `domain`, `path`, `sameSite` (`strict`, `lax`,
`none`; default `none`). `strict` or `lax` resets the cookie when users arrive from another
domain.

Verify: the `croct.id` cookie value is identical on two subdomains (DevTools, Application,
Cookies).

Related options: `clientId` (pass a server-generated ID), `cidAssignerEndpointUrl` (custom
client ID assigner, e.g. one that sets a server-side cookie shared across subdomains; use the
same cookie name for `cookie.clientId`), `disableCidMirroring` (default `false`; by default the
current CID is sent to the assigner as `?cid=` to ease migration).

## Signed user tokens

- Default: each visitor gets an **unsigned** token holding an anonymous ID, generated and stored
  in the browser. `identify` and the `userId` option also issue unsigned tokens.
- **Signed** tokens are JWTs your server signs with an API key. They prevent impersonation, where
  someone edits their token to claim another user's ID. Risk is highest with guessable IDs
  (emails, usernames, sequential numbers); Croct recommends signed tokens for identified users
  whatever the ID format.
- Enforce: Application settings, Security, enable **Require signed token**. Once enabled,
  `identify` and `userId` fail with authentication errors; use `setToken(jwt)` or the `token`
  option with a token signed by an API key that has **Issue user tokens** permission. When
  disabled again, both signed and unsigned tokens are accepted.
- Server-side SDKs (e.g. `@croct/plug-next`) sign tokens automatically, so enforcement needs no
  code change there.
- The user ID is the JWT `sub` claim (`croct.getUserId()`).

## Tracking from a server or sandbox

Use the standalone function; it does **not** add session details, so you provide them:

The docs do not say how a backend (for example, a payment webhook) obtains the visitor's
`clientId` or `userToken`. Do not invent a mechanism; ask the user how their app stores them
(for example, captured in the browser and saved with the order).

```js
import {track} from '@croct/plug/api';

await track(
  {
    type: 'goalCompleted',
    payload: {goalId: 'signup'},
    clientId: '00000000-0000-0000-0000-000000000001', // persistent browser ID (UUID)
    timestamp: Date.now(),
    context: {tabId: '00000000-0000-0000-0000-000000000002', url: 'https://example.com/signup'},
    // userToken, clientIp, clientAgent: optional, see below
  },
  {apiKey: process.env.CROCT_API_KEY}, // or {appId} for client-side use; never both
);
```

- `payload` follows the event's **processed** properties: `userSignedUp` takes `patch` instead
  of `profile`; cart events take the cart's `lastUpdateTime`. Events that identify a user take
  `userId`, sent as `externalUserId`.
- `context`: `url` (required), `tabId`, `timeZone`, `metadata` (up to 5 entries) optional.
- `userToken`: base64 JWT for the user; must be signed (API key with **Issue user tokens**) when
  **Require signed token** is on.
- `clientIp`: without it, location data is limited; `127.0.0.1` makes the API use the request
  IP (local development). `clientAgent`: without it, device data is limited.
- Options: `timeout` (ms), `baseEndpointUrl` (uses `/client/web/track` or
  `/external/web/track`), `extra` (fetch options), `logger`.
- Never ship `apiKey` to the browser.

### Setting a profile attribute from a server

The docs list `userProfileChanged` as auto-tracked by `user.edit().save()` and do not explicitly
document sending it from a server. The standalone `track` docs say `payload` follows the processed
properties, so this is the shape implied by the docs, not a documented recipe; tell the user so:

```js
import {track} from '@croct/plug/api';

await track(
  {
    type: 'userProfileChanged',
    payload: {
      patch: {
        operations: [{type: 'set', path: 'custom.loyaltyTier', value: 'gold'}],
      },
    },
    clientId: '00000000-0000-0000-0000-000000000001',
    userToken: '<the user token>', // ties the change to the identified user
    timestamp: Date.now(),
    context: {url: 'https://example.com/account'},
  },
  {apiKey: process.env.CROCT_API_KEY},
);
```

Custom attributes are then readable in CQL as `user's loyaltyTier` (see the `croct-cql`
skill).

For raw HTTP calls to the tracking API, see the `croct-use-api` skill.

## Bot exclusion

Growth and Scale plans. Turn on in workspace settings. Bots are identified with the
WhatIsMyBrowser user-agent list.

- Content: known bots get slot default content, not experience or experiment content.
- Events: nothing is tracked for known server- and client-side bots, nor for unknown server-side
  bots that fetch content but never run client code. Their sessions are excluded from monthly
  visitors, analytics, and experience and experiment metrics.
- To target bots instead (e.g. SEO content), audience condition: `device's category is "bot"`.

## Other SDK options that affect collected data

- `eventMetadata`: up to 5 string entries attached to every event's context (e.g. app version).
- `urlSanitizer: (url: string) => URL`: strip tokens or personal data from URLs before they are
  sent in events.
- `track: false` / `croct.tracker.disable()`: no automatic events; manual `track` still works.
- `test: true`: mock transport that fakes successful sends (tests only).
- `debug: true`: extra console logging.

## Sources

- https://docs.croct.com/immersion/guides/ad-blocker-interference.md
- https://docs.croct.com/immersion/tutorials/first-party-api-routing.md
- https://docs.croct.com/immersion/tutorials/cross-subdomain-identification.md
- https://docs.croct.com/explanation/application/signed-tokens.md
- https://docs.croct.com/explanation/workspace/bot-exclusion.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/plug.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/identify.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/set-token.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/get-user-id.md
- https://docs.croct.com/reference/sdk/javascript/api/functions/track.md
- https://docs.croct.com/reference/sdk/javascript/api/tracker/disable.md
- https://docs.croct.com/reference/sdk/nextjs/api/environment-variables.md
