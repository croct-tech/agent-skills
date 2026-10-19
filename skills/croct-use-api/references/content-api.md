# Content API

Fetch a slot's content over HTTP. Four endpoints, all `POST`, all on `https://api.croct.io`:

| Endpoint | Personalized | Auth | Use for |
| --- | --- | --- | --- |
| `/client/web/content` | Yes | `X-App-Id` | Browser or device code |
| `/external/web/content` | Yes | `X-Api-Key` | Backend, on behalf of a specific user |
| `/client/web/static-content` | No | `X-App-Id` | Browser code that wants predictable, cacheable default content |
| `/external/web/static-content` | No | `X-Api-Key` | Server-side rendering or cache-friendly responses with no personalization context |

Dynamic endpoints apply audience targeting and experiment assignment and return the active
experience for the user. Static endpoints return the slot's default content without audience
targeting, experience evaluation, or experiment assignment.

## Request headers

| Header | Client dynamic | Server dynamic | Client static | Server static |
| --- | --- | --- | --- | --- |
| `Content-Type: application/json` | Required | Required | Required | Required |
| `X-App-Id` | Required | | Required | |
| `X-Api-Key` | | Required | | Required |
| `X-Client-Id` | One of `X-Client-Id`/`X-Token` | One of `X-Client-Id`/`X-Token` | One of `X-Client-Id`/`X-Token` | Not accepted |
| `X-Token` | One of `X-Client-Id`/`X-Token` | One of `X-Client-Id`/`X-Token` | One of `X-Client-Id`/`X-Token` | Not accepted |
| `X-Client-Ip` | | Optional | | |
| `X-Client-Agent` | | Optional | | |
| `X-Client-Library` | Optional | Optional | Optional | Optional |
| `Origin` | Must match a trusted origin (browsers set it) | | Must match a trusted origin | |

- `X-Client-Id`: UUID that persistently identifies the browser or device across sessions.
- `X-Token`: base64-encoded JWT identifying the user. Pass it to use the identified user's
  context. When the application enforces signed tokens, it must be signed with an API key that
  has the **Issue user tokens** permission, or the request fails with an authorization error.
- `X-Client-Ip`: the end user's IP. Defaults to the IP of the incoming request; a loopback
  address such as `127.0.0.1` also falls back to the request IP.
- `X-Client-Agent`: the end user's user agent. Defaults to the request's `User-Agent`.
- `X-Client-Library`: SDK or client name and version, such as `Croct SDK JS v0.20.0`.

## Body: dynamic content

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `slotId` | string | Yes | Slot ID, such as `hero-banner`. |
| `version` | string | No | Slot schema version in `major` or `major.minor` form (`1`, `1.2`). Latest when omitted. |
| `preferredLocale` | string or null | No | `en`, `en-us`, `pt-br`. Case-insensitive; hyphen or underscore. Falls back to the default locale when unsupported or omitted; `null` explicitly uses the default. This page says "slot's default locale"; the Next.js SDK docs say the workspace default locale (the locale set in workspace settings). |
| `previewToken` | string | No | Base64-encoded JWT that Croct passes to your app as a URL parameter during preview. Forward it here to enable preview mode; audience targeting is bypassed and the previewed variant is returned. |
| `includeSchema` | boolean | No | Default `false`. When `true`, returns the slot's content schema in `metadata.schema`. |
| `context` | object | No | User context used for audience targeting and CQL. See below. |

`context` fields:

| Field | Type | Notes |
| --- | --- | --- |
| `timeZone` | string | IANA ID, such as `America/New_York`. Used for time-based rules. |
| `page.url` | string | Required when `page` is present. |
| `page.title` | string | Optional. |
| `page.referrer` | string | Optional. URL of the linking page. |
| `campaign.name` / `source` / `medium` / `content` / `term` | string | Optional. UTM-compatible campaign data. |
| `attributes` | object | Custom key-value pairs, available in CQL through the `context` variable. Up to 30 entries and 5 levels deep; keys are numbers or non-empty strings up to 50 chars; values are null, numbers, booleans, strings up to 50 chars, or nested maps with the same rules. |

With `{"cities": ["New York", "San Francisco"]}` as attributes, a rule can read
`context's cities include location's cityName`.

## Body: static content

Only `slotId`, `version`, `preferredLocale`, and `includeSchema`, with the same meaning as above.
No `context`, no `previewToken`.

## Example: dynamic content from a backend

```bash
curl -X POST 'https://api.croct.io/external/web/content' \
  -H 'Content-Type: application/json' \
  -H "X-Api-Key: $CROCT_API_KEY" \
  -H 'X-Client-Id: <CLIENT ID>' \
  -H 'X-Token: <USER TOKEN>' \
  -H 'X-Client-Ip: 192.0.2.10' \
  -H 'X-Client-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \
  -H 'X-Client-Library: Custom Client v1.0.0' \
  -d '{
    "slotId": "home-hero",
    "version": "1",
    "preferredLocale": "en-us",
    "includeSchema": true,
    "context": {
      "timeZone": "America/New_York",
      "page": {
        "url": "https://example.com/pricing",
        "title": "Pricing",
        "referrer": "https://google.com"
      },
      "campaign": {"name": "summer-sale", "source": "google", "medium": "cpc"},
      "attributes": {"plan": "pro"}
    }
  }'
```

## Example: dynamic content from a browser

```js
const response = await fetch('https://api.croct.io/client/web/content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Id': '<APP ID>',
    'X-Client-Id': '<CLIENT ID>',
  },
  body: JSON.stringify({
    slotId: 'home-hero',
    context: {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      page: {url: location.href, title: document.title, referrer: document.referrer},
    },
  }),
});

const {content, metadata} = await response.json();
```

## Example: static content from a backend

```js
const response = await fetch('https://api.croct.io/external/web/static-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.CROCT_API_KEY,
  },
  body: JSON.stringify({slotId: 'home-hero'}),
});

const {content, metadata} = await response.json();
```

## Response

`200 OK` or `202 Accepted`.

### 200 OK

| Field | Type | Notes |
| --- | --- | --- |
| `content` | object | Shaped by the slot's content schema, plus `_component`. |
| `content._component` | string or null | Component ID and major version, such as `hero-banner@1`; `null` when no component is associated. |
| `metadata.version` | string | Resolved slot schema version. |
| `metadata.contentSource` | string | `slot` (default content), `experience` (an active experience matched), or `experiment` (a variant was assigned). Always `slot` for static content. |
| `metadata.experience.experienceId` | string | Present when `contentSource` is `experience` or `experiment`. |
| `metadata.experience.audienceId` | string | The audience the user matched. |
| `metadata.experience.experiment.experimentId` | string | Present when the experience has an active experiment. |
| `metadata.experience.experiment.variantId` | string | The assigned variant. |
| `metadata.schema` | object | Only when `includeSchema` is `true`. Labels and descriptions are omitted. |

Static content returns only `content`, `metadata.version`, `metadata.contentSource`, and the
optional `metadata.schema`.

```json
{
  "content": {
    "_component": "home-hero@1",
    "heading": "Personalized for Pro users",
    "cta": {"label": "Upgrade now", "link": "https://example.com/upgrade"}
  },
  "metadata": {
    "version": "1.0",
    "contentSource": "experience",
    "experience": {
      "experienceId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      "audienceId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "experiment": {
        "experimentId": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
        "variantId": "6ba7b812-9dad-11d1-80b4-00c04fd430c8"
      }
    }
  }
}
```

### 202 Accepted

Empty body. The workspace has suspended services. `X-Suspension-Reason:
tracking_and_personalization_suspended`. Treat it as a traffic-control signal, not an error, and
fall back to default behavior.

## Gaps in the docs

- The client dynamic-content example sends `X-Client-Ip` and `X-Client-Agent`, but the client
  header list does not document them. Only the server variant documents them.
- The quick start's first "personalized content" cURL tab calls `/external/web/content` with an
  API key while its JavaScript tab calls `/client/web/content` with an app ID. Both endpoints are
  valid; pick by where the code runs.
- No rate-limit figures and no required API key permission for content endpoints are published.

## Sources

- https://docs.croct.com/reference/api/service/content/quick-start.md
- https://docs.croct.com/reference/api/service/content/endpoint/client/content.md
- https://docs.croct.com/reference/api/service/content/endpoint/server/content.md
- https://docs.croct.com/reference/api/service/content/endpoint/client/static-content.md
- https://docs.croct.com/reference/api/service/content/endpoint/server/static-content.md
