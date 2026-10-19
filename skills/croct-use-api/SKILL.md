---
name: croct-use-api
description: >-
  Use when calling Croct's HTTP APIs directly instead of an SDK: from a backend, edge function,
  serverless handler, script, data pipeline, or custom client. Covers the Content API
  (`/client/web/content`, `/external/web/content`, `static-content`), Evaluation API
  (`/client/web/evaluate`, `/external/web/evaluate`), Event Tracking API (`/client/web/track`),
  and Data Export API (`/export/events`, `/export/session`, `/export/user`, `@croct/export`,
  `croct-export-client`). Triggers: `api.croct.io`; headers `X-App-Id`, `X-Api-Key`,
  `X-Client-Id`, `X-Token`, `X-Client-Ip`, `X-Suspension-Reason`; API key permissions; signed
  user tokens; trusted origins and CORS errors; `nextCursor` pagination; `202 Accepted` with no
  body; Problem Details errors under `croct.help/api/` like `missing-client-id`,
  `forbidden-origin`, `unsigned-token`, `invalid-query`, `invalid-payload`; "fetch Croct content
  with curl", "export Croct events to a warehouse", "evaluate CQL from my server".
---

# Call the Croct HTTP APIs

All endpoints share one base URL: `https://api.croct.io`. Request and response bodies are JSON.
Errors are [Problem Details (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457) documents.

## Decide whether to use the API at all

| Situation | Do this |
| --- | --- |
| JavaScript, React, Next.js, Vue, Nuxt, Shopify Hydrogen, PHP, Laravel, Symfony, Drupal app | Use the SDK instead (see the `croct-integrate-sdk` skill). The docs say the SDK handles authentication, client IDs, context detection, caching, and beacon delivery; call HTTP directly only for custom integrations or a new client. |
| Backend, edge function, or script with no fitting SDK | Use the **server** (`/external/...`) endpoints with an API key. |
| Browser or device code you write yourself | Use the **client** (`/client/...`) endpoints with the public application ID. |
| Exporting events, sessions, or users | Use the Data Export API, preferably through `@croct/export` (JS/TS) or `com.croct.client:croct-export-client` (Java). Add-on: the workspace must have it enabled. |
| Tracking events | `POST /client/web/track` has its own endpoint page. The SDK's standalone `track` reference also lists `/external/web/track` for server-side tracking, but it has no endpoint page; from a backend, prefer the JavaScript SDK's `track` from `@croct/plug/api` with an API key (see the `croct-track-events` skill). |

## Endpoints

| Service | Method and path | Auth | Reference |
| --- | --- | --- | --- |
| Content (dynamic) | `POST /client/web/content` | `X-App-Id` | [content-api.md](references/content-api.md) |
| Content (dynamic) | `POST /external/web/content` | `X-Api-Key` | [content-api.md](references/content-api.md) |
| Content (default only) | `POST /client/web/static-content` | `X-App-Id` | [content-api.md](references/content-api.md) |
| Content (default only) | `POST /external/web/static-content` | `X-Api-Key` | [content-api.md](references/content-api.md) |
| Evaluation | `POST /client/web/evaluate` | `X-App-Id` | [evaluation-api.md](references/evaluation-api.md) |
| Evaluation | `POST /external/web/evaluate` | `X-Api-Key` | [evaluation-api.md](references/evaluation-api.md) |
| Event tracking | `POST /client/web/track` | `X-App-Id` | [event-tracking-api.md](references/event-tracking-api.md) |
| Event tracking (server) | `/external/web/track` (listed only in the SDK `track` reference; no endpoint page, so method, headers, and body are undocumented) | API key, per the SDK `track` options | [event-tracking-api.md](references/event-tracking-api.md) |
| Export events | `GET /export/events`, `GET /export/events/{eventId}` | `X-Api-Key` (Export data) | [data-export-api.md](references/data-export-api.md) |
| Export sessions | `GET /export/session`, `GET /export/session/{sessionId}` | `X-Api-Key` (Export data) | [data-export-api.md](references/data-export-api.md) |
| Export users | `GET /export/user`, `GET /export/user/{userId}` | `X-Api-Key` (Export data) | [data-export-api.md](references/data-export-api.md) |

Note the path shapes exactly: events export is plural (`/export/events`), sessions and users are
singular (`/export/session`, `/export/user`).

## Client vs. server variants

| | Client (`/client/web/...`) | Server (`/external/web/...`) |
| --- | --- | --- |
| Credential | `X-App-Id`: public application ID (UUID v4) | `X-Api-Key`: secret API key (UUID v4) |
| Where it may run | Browser or device | Your backend only. Never ship the API key to client code. |
| CORS | `Origin` must match a trusted origin | Not applicable |
| User identity | `X-Client-Id` or `X-Token` required (static content included) | `X-Client-Id` or `X-Token` for dynamic content and evaluation; static content takes neither |
| Client IP / user agent | Not documented as headers | `X-Client-Ip`, `X-Client-Agent` (default to the incoming request's IP and `User-Agent`) |
| Rate limits | "Tuned for browser traffic" | "Tuned for backend traffic" |

Details on credentials, API key permissions, signed tokens, and trusted origins:
[authentication.md](references/authentication.md).

## Identity headers

| Header | Value | Rule |
| --- | --- | --- |
| `X-Client-Id` | UUID v4 | Persistent ID for the browser or device across sessions. Generate once, store it, reuse it. A non-UUID returns `invalid-client-id`. |
| `X-Token` | Base64-encoded JWT identifying the user | Pass it to use an identified user's context. If the application requires signed tokens, it must be signed with an API key that has **Issue user tokens**, or the call fails (`unsigned-token`, `invalid-token`, `expired-token`). |
| `X-Client-Library` | e.g. `Custom Client v1.0.0` | Optional. Name and version of your client, used for usage statistics and compatibility switches. |

Sending neither `X-Client-Id` nor `X-Token` where one is required returns `401 missing-client-id`.

## Minimal calls

Keep the API key in an environment variable; do not inline it or echo it.

```bash
# Personalized content from a backend
curl -sS -X POST 'https://api.croct.io/external/web/content' \
  -H 'Content-Type: application/json' \
  -H "X-Api-Key: $CROCT_API_KEY" \
  -H 'X-Client-Id: <CLIENT ID>' \
  -d '{"slotId": "home-hero"}'

# Default (non-personalized) content from a backend
curl -sS -X POST 'https://api.croct.io/external/web/static-content' \
  -H 'Content-Type: application/json' \
  -H "X-Api-Key: $CROCT_API_KEY" \
  -d '{"slotId": "home-hero"}'

# Evaluate a CQL expression from a backend
curl -sS -X POST 'https://api.croct.io/external/web/evaluate' \
  -H 'Content-Type: application/json' \
  -H "X-Api-Key: $CROCT_API_KEY" \
  -H 'X-Client-Id: <CLIENT ID>' \
  -d '{"query": "user is returning"}'

# Export one page of events
curl -sS -G 'https://api.croct.io/export/events' \
  -H "X-Api-Key: $CROCT_API_KEY" \
  --data-urlencode 'pageSize=100'
```

```js
// Browser: personalized content with the public application ID
const response = await fetch('https://api.croct.io/client/web/content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Id': '<APP ID>',
    'X-Client-Id': '<CLIENT ID>',
  },
  body: JSON.stringify({slotId: 'home-hero'}),
});

const {content, metadata} = await response.json();
```

## Handle every response status

| Status | Meaning | Do |
| --- | --- | --- |
| `200 OK` | Content or evaluation result in the body | Use it. |
| `204 No Content` | Event accepted (track only) | Nothing. Beacons that arrive too late are silently dropped but still return `204`. |
| `202 Accepted` | Service suspended; **empty body** | Not an error. Read `X-Suspension-Reason` (`tracking_and_personalization_suspended`, or for track also `bot_personalization_blocked`) and fall back to default behavior, such as your own fallback content. Do not call `response.json()` on it. |
| `4xx` / `5xx` | Problem Details body, `Content-Type: application/problem+json` | Branch on the `type` URL, not on `title` or `detail`. See [errors.md](references/errors.md). |

```js
if (response.status === 202) {
  // Suspended: fall back. Reason in response.headers.get('X-Suspension-Reason')
  return fallbackContent;
}

if (!response.ok) {
  const problem = await response.json(); // {type, title, status, detail, instance?, ...}
  throw new Error(`${problem.type}: ${problem.detail}`);
}

const {content, metadata} = await response.json();
```

Retry only `internal-error` (500) and Event Tracking's `incomplete-setup` (403, a newly created
application still provisioning), after a short delay. Every other error needs the request,
credentials, or account fixed first.

## Do / Don't

- **Do** send `Content-Type: application/json` on every `POST`.
- **Do** forward the end user's IP and user agent through `X-Client-Ip` and `X-Client-Agent` on
  server calls; otherwise location and device targeting see your server. A loopback IP such as
  `127.0.0.1` falls back to the request IP, which is useful locally.
- **Do** forward the `previewToken` URL parameter Croct appends in preview mode into the content
  request body so the previewed variant is returned.
- **Do** send the complete *processed* event payload to `/client/web/track`; the HTTP API does not
  fill in the properties the SDK normally adds.
- **Do** create API keys with only the permission the job needs: **Export data** for exports,
  **Issue user tokens** for signing tokens and server-side evaluation.
- **Don't** call `/external/...` from a browser or ship the API key in client bundles.
- **Don't** add broad origins such as `vercel.app` or `github.io` as trusted origins.
- **Don't** modify or parse export cursors; pass `nextCursor` back unchanged.
- **Don't** hard-code assumed rate limits; the docs say every endpoint is rate limited but
  publish no figures. Back off on repeated failures.

## Limits the docs state

| Item | Limit |
| --- | --- |
| CQL `query` (evaluation) | 1 to 500 UTF-8 characters |
| `context.attributes` (content, evaluation) | Up to 30 entries, 5 levels deep; keys are numbers or non-empty strings up to 50 chars; values are null, number, boolean, string (up to 50 chars), or nested map |
| Event `context.metadata` (track) | Up to 5 entries; keys up to 20 chars, start with a letter or underscore then letters, digits, or underscores; string values up to 300 chars |
| Export `pageSize` | 1 to 1000, default 100 |

## Reference files

- [content-api.md](references/content-api.md): content and static-content endpoints, every
  header, body field, and response field.
- [evaluation-api.md](references/evaluation-api.md): evaluate endpoints, result shapes, CQL errors.
- [event-tracking-api.md](references/event-tracking-api.md): track endpoint, envelope, contexts.
- [data-export-api.md](references/data-export-api.md): export client library, raw endpoints,
  pagination patterns, entity shapes.
- [authentication.md](references/authentication.md): application IDs, API keys and permissions,
  signed tokens, trusted origins.
- [errors.md](references/errors.md): error format and every documented error type.

For CQL syntax, see the `croct-cql` skill. For event payload schemas, see the
`croct-track-events` skill.

## When the bundled references fall short

- Index: `https://docs.croct.com/llms.txt`
- Any page as markdown: `https://docs.croct.com/reference/api/overview.md`
- Search: `https://docs.croct.com/api/search.md?term=<terms>`
- Every error `type` URL (`https://croct.help/api/...`) opens that error's documentation.
