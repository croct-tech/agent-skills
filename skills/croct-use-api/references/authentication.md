# Authentication, signed tokens, and trusted origins

## Credentials

| Credential | Header | Secret? | Used by | Where to get it |
| --- | --- | --- | --- | --- |
| Application ID | `X-App-Id` | No (public) | `/client/web/*` endpoints | Application settings in the Croct dashboard |
| API key | `X-Api-Key` | Yes | `/external/web/*` and `/export/*` endpoints | Application API keys page |

Both must be version 4 UUIDs. A malformed value returns `invalid-application-id` or
`invalid-api-key`; a well-formed value that does not exist returns `unknown-application-id` or
`unknown-api-key`. Applications are per channel and environment (for example a production and a
development application), so check you are using the ID and key of the intended application.

## API keys

- Only users with the **Owner** or **Manager** role can create API keys.
- Create one: API keys page, **New**, name it, choose permissions, **Save**.
- Permissions **cannot be changed** after creation. Create a new key instead.
- The key is shown **once**. Store it in a secret manager or environment variable right away.
- Revoke a key by deleting it; anything using it stops working. Revoke immediately if it may be
  compromised.

| Permission | Grants |
| --- | --- |
| Read resources | Read-only access to all resources in the application hierarchy (used by the CLI). |
| Export data | Read-only export of events, sessions, and users (Data Export API). |
| Issue user tokens | Issuing user tokens and evaluating expressions on the server side. |

A valid key without the needed permission returns `403 insufficient-permission`.

Never use an API key in client-side code.

## User tokens (`X-Token`)

`X-Token` is a base64-encoded JWT that identifies the user. Every visitor otherwise has an
anonymous ID, identified by `X-Client-Id`.

| Token | What it is | When to use |
| --- | --- | --- |
| Unsigned | Generated automatically; fine for anonymous visitors | Default |
| Signed | Created by your application and signed with an API key that has **Issue user tokens** | Identified users, to prevent impersonation |

Why sign: without a signature, someone who knows or guesses another user's ID (email, username,
sequential number) can forge a token and see that user's personalized content or act as them.
Random IDs make guessing harder but do not solve it. Croct verifies the signature and rejects
modified tokens.

Enforce signed tokens: Application settings, **Security** section, enable **Require signed
token**. Once enabled, requests with unsigned tokens fail with `401 unsigned-token`. Disabling it
again accepts both signed and unsigned tokens.

Croct's server-side SDKs sign tokens automatically. The docs do not publish the JWT claims,
header, or signing algorithm, so when you need signed tokens without an SDK, generate them with a
Croct server-side SDK (see the `croct-integrate-sdk` skill) rather than hand-rolling a JWT.

Token errors:

| `type` suffix | Status | Cause |
| --- | --- | --- |
| `invalid-token` | 401 | Malformed or bad signature. Check how your backend generates tokens. |
| `expired-token` | 401 | Valid but past expiration. Issue a new token and retry. |
| `unsigned-token` | 401 | App requires signed tokens but the token is unsigned. |

## Trusted origins (CORS)

Client endpoints check the browser's `Origin` header against the application's trusted origins.
A non-listed origin gets `403 forbidden-origin`, and browsers block the request. Server
(`/external`) endpoints are not subject to this check.

Add an origin: Application settings, **Trusted origins**, **Add origin**. Enter the domain
**without the protocol** (`example.com`), then optionally:

- **Port** for non-standard ports (`example.com:8080`, `localhost:3000`).
- **Allow any subdomain** for `*.example.com`.
- **Allow insecure HTTP** to accept `http://` as well as `https://` (needed for
  `http://localhost:3000`).

Rules:

- Changes take a few minutes to propagate. If CORS errors persist after 5 minutes, check that the
  origin exactly matches the app's URL (scheme, port, subdomain).
- You can edit an origin's options but not its domain; delete and re-add to change the domain.
- Never authorize shared hosting domains such as `vercel.app` or `github.io`; anyone with a
  subdomain there could reach your application's data.
- Removing an origin immediately blocks that domain.

## Sources

- https://docs.croct.com/reference/api/overview.md
- https://docs.croct.com/explanation/application/overview.md
- https://docs.croct.com/explanation/application/api-keys.md
- https://docs.croct.com/explanation/application/signed-tokens.md
- https://docs.croct.com/explanation/application/trusted-origins.md
- https://docs.croct.com/reference/api/error/insufficient-permission.md
- https://docs.croct.com/reference/api/error/unsigned-token.md
- https://docs.croct.com/reference/api/error/forbidden-origin.md
