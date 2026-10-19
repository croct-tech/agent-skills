# Evaluation API

Evaluate a CQL expression in real time against a user's context and get the result as JSON. For
CQL syntax, see the `croct-cql` skill.

| Endpoint | Auth | Use for |
| --- | --- | --- |
| `POST https://api.croct.io/client/web/evaluate` | `X-App-Id` | Browser or device code, against the current user |
| `POST https://api.croct.io/external/web/evaluate` | `X-Api-Key` | Backend, on behalf of a specific user |

The API key permission **Issue user tokens** is the one the docs describe as allowing "evaluating
expressions on the server side".

## Request headers

| Header | Client | Server | Notes |
| --- | --- | --- | --- |
| `Content-Type` | Required | Required | `application/json` |
| `X-App-Id` | Required | | Public application ID |
| `X-Api-Key` | | Required | Never in client code |
| `X-Client-Id` | One of `X-Client-Id`/`X-Token` | One of `X-Client-Id`/`X-Token` | UUID persistently identifying the browser or device |
| `X-Token` | One of `X-Client-Id`/`X-Token` | One of `X-Client-Id`/`X-Token` | Base64 JWT for an identified user; must be signed when the app enforces signed tokens |
| `X-Client-Ip` | | Optional | Defaults to the request IP; loopback falls back to the request IP |
| `X-Client-Agent` | | Optional | Defaults to the request `User-Agent` |
| `X-Client-Library` | Optional | Optional | Client name and version |
| `Origin` | Must match a trusted origin | | Browsers set it |

## Body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `query` | string | Yes | CQL expression, 1 to 500 UTF-8 characters. |
| `context` | object or null | No | Extra signals for the expression. |
| `context.timeZone` | string or null | No | IANA ID. Used in time-based expressions. |
| `context.page` | object or null | No | `url` (required when `page` is present), `title`, `referrer`. |
| `context.campaign` | object or null | No | `name`, `source`, `medium`, `content`, `term` (all string or null). |
| `context.attributes` | object or null | No | Custom values readable as `context's <key>`. Up to 30 entries, 5 levels deep; keys are numbers or non-empty strings up to 50 chars; values null, number, boolean, string up to 50 chars, or nested map. |

## Example

```bash
curl -X POST 'https://api.croct.io/external/web/evaluate' \
  -H 'Content-Type: application/json' \
  -H "X-Api-Key: $CROCT_API_KEY" \
  -H 'X-Client-Id: <CLIENT ID>' \
  -H 'X-Token: <USER TOKEN>' \
  -H 'X-Client-Ip: 192.0.2.10' \
  -H 'X-Client-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \
  -d '{
    "query": "user is returning",
    "context": {
      "timeZone": "America/New_York",
      "page": {"url": "https://example.com/pricing", "title": "Pricing", "referrer": "https://google.com"},
      "campaign": {"name": "summer-sale", "source": "google", "medium": "cpc"},
      "attributes": {"plan": "pro"}
    }
  }'
```

```js
// Browser
const response = await fetch('https://api.croct.io/client/web/evaluate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Id': '<APP ID>',
    'X-Client-Id': '<CLIENT ID>',
  },
  body: JSON.stringify({query: 'user is returning'}),
});

const result = await response.json();
```

## Response

`200 OK` or `202 Accepted`.

- **200 OK**: the body *is* the result, as raw JSON. Its type depends on the expression: boolean,
  number, string, array, or object. `user is returning` returns `true`; `campaign` returns an
  object such as:

  ```json
  {"name": "summer-sale", "source": "google", "medium": "cpc", "term": "pricing", "content": "banner-a"}
  ```

- **202 Accepted**: empty body, services suspended. `X-Suspension-Reason:
  tracking_and_personalization_suspended`. Fall back to default behavior.

## Evaluation-specific errors

All three return `422` with a Problem Details body.

| `type` | Cause | Fix |
| --- | --- | --- |
| `https://croct.help/api/evaluation/invalid-query` | Syntax error in the expression. | Check the syntax against the CQL reference. |
| `https://croct.help/api/evaluation/evaluation-failed` | Valid syntax, runtime failure: undefined variable, invalid operation such as division by zero, missing node. | Fix the expression logic. |
| `https://croct.help/api/evaluation/unserializable-result` | Result cannot be serialized to JSON, e.g. a raw `weekday`, `user`, or `session` object. | Return a scalar or collection, or convert with a CQL modifier. |

`invalid-query` and `evaluation-failed` add an `errors` array:

```json
{
  "type": "https://croct.help/api/evaluation/invalid-query",
  "title": "The query is invalid.",
  "status": 422,
  "detail": "The query contains one or more syntax errors.",
  "errors": [
    {
      "cause": "No viable alternative at the end of input",
      "location": {
        "start": {"line": 1, "column": 3, "index": 3},
        "end": {"line": 1, "column": 3, "index": 3}
      }
    }
  ]
}
```

- `errors[].cause`: human-readable description.
- `errors[].location.start` / `end`: `line` (1-based), `column` (0-based), `index` (0-based
  character offset). For `evaluation-failed`, `location` is present only when the failing node
  has source location information.

## Gaps in the docs

- The quick start's server cURL example sends neither `X-Client-Id` nor `X-Token`, while the
  server endpoint reference says one of them must be present. Send one.

## Sources

- https://docs.croct.com/reference/api/service/evaluation/quick-start.md
- https://docs.croct.com/reference/api/service/evaluation/endpoint/client/evaluate.md
- https://docs.croct.com/reference/api/service/evaluation/endpoint/server/evaluate.md
- https://docs.croct.com/reference/api/service/evaluation/error/invalid-query.md
- https://docs.croct.com/reference/api/service/evaluation/error/evaluation-failed.md
- https://docs.croct.com/reference/api/service/evaluation/error/unserializable-result.md
- https://docs.croct.com/explanation/application/api-keys.md
