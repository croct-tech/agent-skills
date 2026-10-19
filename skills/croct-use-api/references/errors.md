# Errors

Failed requests return an HTTP error status with a
[Problem Details (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457) body served as
`application/problem+json`:

```json
{
  "type": "https://croct.help/api/general/invalid-input",
  "title": "Invalid input.",
  "status": 400,
  "detail": "The request body must be a valid JSON document."
}
```

| Field | Always present | Meaning |
| --- | --- | --- |
| `type` | Yes | URI identifying the problem; opening it shows the error's documentation. Branch on this. |
| `title` | Yes | Short summary of the problem type. |
| `status` | Yes | HTTP status code. |
| `detail` | Yes | Explanation specific to this occurrence. |
| `instance` | No | URI of this occurrence, usually the request path. |

Some errors add extension fields (`violations`, `errors`, `resourceType`, `resourceId`), listed
below.

`202 Accepted` with an empty body is **not** an error: services are suspended and the client
should fall back (see `X-Suspension-Reason`).

## Error catalog

The `type` is the full URL shown. Note that some URL slugs differ from the page names (for
example, application ID errors use `...-public-id`).

### Credentials and identity

| `type` | Status | Cause | Fix |
| --- | --- | --- | --- |
| `https://croct.help/api/authentication/authorization-required` | 401 | No credentials at all. | Send `X-Api-Key` (server) or `X-App-Id` (client). |
| `https://croct.help/api/authentication/missing-public-id` | 401 | `X-App-Id` absent or empty on a client request. | Send the application ID. |
| `https://croct.help/api/authentication/invalid-public-id` | 401 | `X-App-Id` is not a UUID v4. | Fix the value. |
| `https://croct.help/api/authentication/unknown-public-id` | 401 | `X-App-Id` is a UUID but matches no application. | Copy it from the application settings. |
| `https://croct.help/api/authentication/missing-api-key` | 401 | `X-Api-Key` absent or empty. | Send the API key. |
| `https://croct.help/api/authentication/invalid-api-key` | 401 | `X-Api-Key` is not a UUID v4. | Fix the value. |
| `https://croct.help/api/authentication/unknown-api-key` | 401 | Key does not match an active key (revoked or never existed). | Generate a new key. |
| `https://croct.help/api/authentication/insufficient-permission` | 403 | Key lacks the permission for this operation. | Create a key with the right permission (permissions are immutable). |
| `https://croct.help/api/authentication/missing-client-id` | 401 | Neither `X-Client-Id` nor `X-Token` sent. | Send one of them. |
| `https://croct.help/api/authentication/invalid-client-id` | 401 | `X-Client-Id` is not a UUID v4. | Generate a UUID v4 and persist it. |
| `https://croct.help/api/authentication/invalid-token` | 401 | `X-Token` malformed or bad signature. | Check token generation. |
| `https://croct.help/api/authentication/expired-token` | 401 | `X-Token` expired. | Issue a new token and retry. |
| `https://croct.help/api/authentication/unsigned-token` | 401 | App requires signed tokens; token is unsigned. | Sign it in your backend. |
| `https://croct.help/api/authentication/forbidden-origin` | 403 | Browser `Origin` not in trusted origins. | Add the origin; wait a few minutes. |

### Account and billing

| `type` | Status | Cause | Fix |
| --- | --- | --- | --- |
| `https://croct.help/api/authentication/quota-exceeded` | 403 | Application hit its Monthly Active Users limit with overage disabled. Returning users are still served; new users are blocked. | Enable overage or upgrade in workspace billing settings. |
| `https://croct.help/api/authentication/past-due-subscription` | 402 | Payment overdue and grace period expired. | Settle the balance in workspace billing settings. |
| `https://croct.help/api/authentication/tracking-and-personalization-suspended` | 401 | Workspace suspended services. Returned only to SDKs older than `v0.19.1`; newer clients get `202 Accepted`. | Upgrade the SDK to `v0.19.1` or later; a custom client should handle `202`. |

### Request

| `type` | Status | Cause | Fix |
| --- | --- | --- | --- |
| `https://croct.help/api/authentication/invalid-method` | 405 | HTTP method not supported by the endpoint. | Use the documented method. |
| `https://croct.help/api/general/invalid-input` | 400 | Malformed request: body not valid JSON, too deep, or invalid query/path parameters. May include `violations`. | Correct the request. |
| `https://croct.help/api/general/invalid-payload` | 422 | Well-formed body fails schema or semantic validation (missing field, wrong type, constraint). Includes `violations`. | Correct the body. |
| `https://croct.help/api/general/resource-not-found` | 404 | Resource does not exist for this application or workspace. Includes `resourceType`, `resourceId`. | Verify the ID. |
| `https://croct.help/api/general/internal-error` | 500 | Temporary server-side issue. | Retry after a brief delay; contact support if it persists. |

### Service-specific

| `type` | Status | Service |
| --- | --- | --- |
| `https://croct.help/api/evaluation/invalid-query` | 422 | Evaluation: CQL syntax error. Includes `errors`. |
| `https://croct.help/api/evaluation/evaluation-failed` | 422 | Evaluation: runtime error. Includes `errors`. |
| `https://croct.help/api/evaluation/unserializable-result` | 422 | Evaluation: result is not JSON-serializable. |
| `https://croct.help/api/authentication/incomplete-setup` | 403 | Event tracking: new application still provisioning; retry shortly. |

## Extension fields

`violations` (on `invalid-input`, optional; on `invalid-payload`, always):

```json
{
  "type": "https://croct.help/api/general/invalid-payload",
  "title": "Invalid payload.",
  "status": 422,
  "detail": "Some of the request parameters are invalid.",
  "violations": [
    {"path": "/payload/type", "reason": "The object must have a property whose name is \"type\"."}
  ]
}
```

- `violations[].path`: JSON pointer to the invalid field, when applicable (optional).
- `violations[].reason`: the violated constraint.

`resourceType` and `resourceId` (on `resource-not-found`):

```json
{
  "type": "https://croct.help/api/general/resource-not-found",
  "title": "Resource not found.",
  "status": 404,
  "detail": "Event with ID '792ebe4f-e49c-4d3c-851c-cac14a1486f9' does not exist.",
  "instance": "/events/792ebe4f-e49c-4d3c-851c-cac14a1486f9",
  "resourceType": "Event",
  "resourceId": "792ebe4f-e49c-4d3c-851c-cac14a1486f9"
}
```

`errors` (on `invalid-query` and `evaluation-failed`): see `evaluation-api.md` in this skill's references.

## Retry policy

| Retry | Don't retry until fixed |
| --- | --- |
| `internal-error` (500), `incomplete-setup` (403), after a brief delay | Every other error |

The docs state that all endpoints are rate limited but publish no limits and no rate-limit error
type or headers.

## Sources

- https://docs.croct.com/reference/api/overview.md
- https://docs.croct.com/reference/api/error.md
- https://docs.croct.com/reference/api/error/authorization-required.md
- https://docs.croct.com/reference/api/error/missing-application-id.md
- https://docs.croct.com/reference/api/error/invalid-application-id.md
- https://docs.croct.com/reference/api/error/unknown-application-id.md
- https://docs.croct.com/reference/api/error/missing-api-key.md
- https://docs.croct.com/reference/api/error/invalid-api-key.md
- https://docs.croct.com/reference/api/error/unknown-api-key.md
- https://docs.croct.com/reference/api/error/insufficient-permission.md
- https://docs.croct.com/reference/api/error/missing-client-id.md
- https://docs.croct.com/reference/api/error/invalid-client-id.md
- https://docs.croct.com/reference/api/error/invalid-token.md
- https://docs.croct.com/reference/api/error/expired-token.md
- https://docs.croct.com/reference/api/error/unsigned-token.md
- https://docs.croct.com/reference/api/error/forbidden-origin.md
- https://docs.croct.com/reference/api/error/quota-exceeded.md
- https://docs.croct.com/reference/api/error/past-due-subscription.md
- https://docs.croct.com/reference/api/error/tracking-and-personalization-suspended.md
- https://docs.croct.com/reference/api/error/invalid-method.md
- https://docs.croct.com/reference/api/error/invalid-input.md
- https://docs.croct.com/reference/api/error/invalid-payload.md
- https://docs.croct.com/reference/api/error/resource-not-found.md
- https://docs.croct.com/reference/api/error/internal-error.md
- https://docs.croct.com/reference/api/service/evaluation/error/invalid-query.md
- https://docs.croct.com/reference/api/service/evaluation/error/evaluation-failed.md
- https://docs.croct.com/reference/api/service/evaluation/error/unserializable-result.md
- https://docs.croct.com/reference/api/service/event-tracking/error/incomplete-setup.md
