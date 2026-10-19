# Event Tracking API

Send event beacons. The payload is validated against its event type's schema, enriched with
server-side context, and published for processing. For which events to send and their payload
schemas, see the `croct-track-events` skill.

```
POST https://api.croct.io/client/web/track
```

This is the only tracking endpoint with its own reference page. It authenticates with the public application ID.

## Request headers

| Header | Required | Notes |
| --- | --- | --- |
| `Content-Type` | Yes | `application/json` |
| `X-App-Id` | Yes | Public application ID |
| `X-Client-Id` | One of `X-Client-Id`/`X-Token` | UUID persistently identifying the browser or device across sessions |
| `X-Token` | One of `X-Client-Id`/`X-Token` | Base64 JWT identifying the user; must be signed with an **Issue user tokens** API key when the app enforces signed tokens |
| `X-Client-Library` | No | Client name and version |
| `Origin` | Browsers set it | Must match one of the application's trusted origins |

## Body (the beacon envelope)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `originalTime` | integer | Yes | When the event was tracked, ms since Unix epoch. |
| `departureTime` | integer | Yes | When the beacon was sent, ms since Unix epoch. |
| `context` | object | Yes | Client context; shape depends on `context.type`. |
| `payload` | object | Yes | The event. `payload.type` selects the event type, such as `pageOpened`. |

### `context` when `type` is `web`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string | See gaps | `web` |
| `url` | string | Yes | Page URL when the event was tracked. |
| `tabId` | string | No | UUID identifying the tab across the session. |
| `timeZone` | string | No | IANA ID. |
| `metadata` | object | No | Up to 5 entries; keys up to 20 chars, starting with a letter or underscore followed by letters, digits, or underscores; values are strings up to 300 chars. Useful for recording the app version that produced the event. |

### `context` when `type` is `server`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string | See gaps | `server` |
| `metadata` | object | No | Same rules as for `web`. |

### `payload`

Send the **processed payload**: the full schema shown on the "Processed payload" tab of each
event's reference page, including the processed properties the SDK normally fills in. The HTTP
API does not add them for you.

## Example

```bash
curl -X POST 'https://api.croct.io/client/web/track' \
  -H 'Content-Type: application/json' \
  -H 'X-App-Id: <APP ID>' \
  -H 'X-Client-Id: <CLIENT ID>' \
  -d '{
    "originalTime": 1612137600000,
    "departureTime": 1612137600050,
    "context": {
      "url": "https://example.com/home",
      "tabId": "123e4567-e89b-12d3-a456-426614174000",
      "timeZone": "America/New_York"
    },
    "payload": {
      "type": "pageOpened",
      "url": "https://example.com/home",
      "referrer": "https://example.com/"
    }
  }'
```

```js
await fetch('https://api.croct.io/client/web/track', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Id': '<APP ID>',
    'X-Client-Id': '<CLIENT ID>',
  },
  body: JSON.stringify({
    originalTime: Date.now(),
    departureTime: Date.now(),
    context: {url: 'https://example.com/home'},
    payload: {type: 'pageOpened', url: 'https://example.com/home'},
  }),
});
```

## Response

| Status | Meaning |
| --- | --- |
| `204 No Content` | Accepted; empty body. Beacons that arrive too late to process are silently dropped but still return `204`. |
| `202 Accepted` | Not tracked; empty body. `X-Suspension-Reason` is `tracking_and_personalization_suspended` (workspace suspended services) or `bot_personalization_blocked` (request identified as a bot). Treat as traffic control, not an error. |

## Tracking-specific error

| `type` | Status | Cause | Fix |
| --- | --- | --- | --- |
| `https://croct.help/api/authentication/incomplete-setup` | 403 | A newly created application has not finished provisioning (takes a few seconds). | Retry after a brief delay; if it persists for more than a few seconds, contact Croct support. |

A payload that fails schema validation returns `422 invalid-payload` with `violations` (see `errors.md`).

## Gaps in the docs

- The reference lists `context.type` (`web` or `server`) as the discriminator, but every official
  example omits it, and exported events show `"context": {"type": "web", ...}`. Whether `type`
  is required on input is not stated; when a request fails with `invalid-payload`, check the
  `violations` path.
- A `server` context is documented. The only tracking endpoint with its own page is the client one
  (`/client/web/track`, `X-App-Id`). The JavaScript SDK's standalone `track` reference lists
  `/external/web/track` as the server-side tracking endpoint used with an API key, but no page
  documents its request format. From a backend, prefer `track` from `@croct/plug/api` with
  `apiKey`; for raw HTTP, ask the user or check the live docs before assuming the client format.

## Sources

- https://docs.croct.com/reference/api/service/event-tracking/quick-start.md
- https://docs.croct.com/reference/api/service/event-tracking/endpoint/track.md
- https://docs.croct.com/reference/api/service/event-tracking/error/incomplete-setup.md
- https://docs.croct.com/reference/sdk/javascript/api/functions/track.md
