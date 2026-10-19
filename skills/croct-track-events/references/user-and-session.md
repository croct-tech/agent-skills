# User profiles, sessions, and identity

How to write profile and session data, the attributes and limits, and how Croct decides who the
user is. Examples use `@croct/plug`; in React and Next.js client components use
`const croct = useCroct()` from `@croct/plug-react` / `@croct/plug-next`.

## Standard user attributes

Set with `croct.user.edit().set(path, value).save()`. Readable in CQL as `user's <attr>`
(e.g. `user's email ends with "@croct.com"`).

| Attribute | Type | Constraint | PII |
|---|---|---|---|
| `firstName` | `string\|null` | 1-50 chars | yes |
| `lastName` | `string\|null` | 1-50 chars | yes |
| `birthDate` | `string\|null` | ISO 8601 `YYYY-MM-DD` | yes |
| `gender` | `string` | `male`, `female`, `neutral`, `unknown` | yes |
| `email` | `string\|null` | 1-254 chars | yes |
| `alternateEmail` | `string\|null` | 1-254 chars | yes |
| `phone` | `string\|null` | 1-30 chars | yes |
| `alternatePhone` | `string\|null` | 1-30 chars | yes |
| `address` | `object\|null` | `street`, `district`, `city`, `region`, `country` (1-100 chars each), `postalCode` (1-20) | yes |
| `avatar` | `string\|null` | URL | yes |
| `company` | `string\|null` | 1-200 chars | yes |
| `companyUrl` | `string\|null` | URL | yes |
| `jobTitle` | `string\|null` | 1-50 chars | yes |
| `interests` | `Array<string>` | up to 30 strings, 1-30 chars each | no |
| `activities` | `Array<string>` | up to 30 strings, 1-30 chars each (e.g. `sign up`, `purchase`) | no |
| `stats.sessions` | `integer` | computed, incremented on each new session | no |
| `stats.orders` | `integer` | computed, incremented on each `orderPlaced` | no |

There is no `name` attribute; use `firstName` / `lastName` (one docs example uses
`.set('name', ...)`, which does not match the attribute list).

**PII while anonymous.** You can set PII attributes for an anonymous user. The values are held
until the user identifies (then migrated to the identified profile and usable in audiences) or
the session ends without identification (then discarded). This exists so erasure requests can
be honored. Consent and privacy-law compliance are the customer's responsibility.

## Custom user attributes

Path `custom.<name>`; read in CQL without the prefix (`user's expertise is "Engineering"`).

- Up to 10 custom attributes per profile.
- Names: up to 20 chars, letter or underscore first, then letters, digits, underscores.
  Case-insensitive (`loyaltyNumber` and `loyaltynumber` collide). Use camelCase.
- Values: strings (up to 100 chars), numbers, booleans, null, lists, maps.
- Lists and maps: up to 10 elements of primitives, lists of primitives, or maps of primitives.
  Map keys up to 50 chars.

```js
await croct.user.edit()
  .set('custom.expertise', 'Engineering')
  .add('custom.pets', 'crocodile')
  .save();
```

`userSignedUp.profile` and `leadGenerated.lead` accept the same attributes, with custom ones
nested under `custom: {...}` instead of the `custom.` path prefix.

## Session attributes

Per-visit facts (selected plan, referral code, experiment group). Set with
`croct.session.edit()`; read in CQL as `session's <attr>`. Same limits as custom user
attributes (10 attributes, 20-char case-insensitive names, 100-char strings, 10-element
collections, 50-char map keys), but **no** `custom.` prefix.

```js
await croct.session.edit().set('plan', 'premium').save();
```

## Patch API

`user.edit()` and `session.edit()` return a `Patch`. Operations chain and apply on `save()`,
which returns `Promise<Event>` (`userProfileChanged` or `sessionAttributesChanged`). A patch is
all-or-nothing: if any operation fails, the whole patch is discarded. Paths use dot notation.

| Method | Effect | Fails (discarding the patch) when |
|---|---|---|
| `set(path, value)` | Create or overwrite the value. | Parent path missing or not a collection. |
| `unset(path)` | Delete the key and value. Never fails. | |
| `clear(path)` | Collections become empty, other values `null`; key kept. Never fails. | |
| `add(path, element)` | Append to a list, duplicates allowed (`['a','b'] + 'a'` = `['a','b','a']`). Missing/null = empty list; `null` element ignored. | Target is not a collection. |
| `combine(path, value)` | Set union without duplicates; value may be a single item or list; nulls dropped. | Target is not a collection. |
| `merge(path, map\|list)` | Maps: merge keys (incoming wins). Lists: concatenate. Scalar target is wrapped (`1` + `[2]` = `[1,2]`). | Target is not a collection. |
| `remove(path, value)` | Remove every occurrence from a list; missing path or value is a no-op. | Target is not a list. |
| `increment(path, n = 1)` | Add to a number; missing/null = 0. | Target is not a number. |
| `decrement(path, n = 1)` | Subtract from a number; missing/null = 0. | Target is not a number. |

Use `combine` for `interests` / `activities` to avoid duplicates; use `add` when repeats matter.

## Identity API (JavaScript SDK)

| Member | Signature | Behavior |
|---|---|---|
| `identify` | `croct.identify(userId: string): void` | Issues an **unsigned** token for `userId`. Emits `userSignedOut` + `userSignedIn` when the identity changes, ending the session and starting a new one. Issues a new token even if the ID is unchanged. |
| `anonymize` | `croct.anonymize(): void` | Clears the user; emits `userSignedOut`, new session. No-op if already anonymous. |
| `setToken` | `croct.setToken(token: string\|null): void` | Like `identify` but with a JWT you provide (required for signed tokens). `null` = `unsetToken`. |
| `unsetToken` | `croct.unsetToken(): void` | Clears the token, anonymizing the user; emits `userSignedOut`. No-op without a token. |
| `getUserId` | `croct.getUserId(): string\|null` | The token's `sub` claim, or `null` if anonymous. |
| `isAnonymous` | `croct.isAnonymous(): boolean` | Shorthand for `croct.user.isAnonymous()`. A token without a subject is anonymous. |
| `user.isIdentified` | `croct.user.isIdentified(): boolean` | Inverse of `isAnonymous`. |

Initialization options in `croct.plug({...})` (React: `<CroctProvider>` props):

- `userId`: the logged-in user's ID. Set it whenever the user is already logged in on load,
  otherwise the SDK sends anonymous events first and you get two sessions. Use `null`/omit for
  anonymous. Only when **Require signed token** is off.
- `token`: a JWT instead of `userId` (never both). Required form when signed tokens are enforced:
  signed with an API key that has **Issue user tokens** permission.
- `tokenScope` (default `global`): `global` = all tabs share the user (identify/anonymize in one
  tab reflects in all); `isolated` = each tab independent (apps that do not keep users logged in
  across tabs); `contextual` = new tabs inherit the user of the last viewed tab (multi-account
  apps, Gmail-like).
- `track` (default `true`): automatic tracking on init. `croct.tracker.enable()` /
  `croct.tracker.disable()` toggle it later; manual `track` calls work either way.

### Next.js

- Server-side identification keeps the Croct token in sync with your auth on each request:
  `withCroct({userIdResolver: async request => userIdOrNull})` exported as `middleware`
  (`@croct/plug-next/middleware`, Next ≤ 15) or `proxy` (`@croct/plug-next/proxy`, Next ≥ 16).
- Manual alternative: `identify(userId, route?)` and `anonymize(route?)` from
  `@croct/plug-next/server`, called in server actions, route handlers, or API routes. In the
  Pages Router pass `{req, res}`.
- Tokens are signed by the SDK using `CROCT_API_KEY` (needs **Issue user tokens**). Related env
  vars: `CROCT_TOKEN_DURATION` (default 86400s), `CROCT_DISABLE_USER_TOKEN_AUTHENTICATION`.

```js
// middleware.js (Next ≤ 15). For Next ≥ 16 import from '@croct/plug-next/proxy' and export `proxy`.
import {withCroct} from '@croct/plug-next/middleware';
import authorizer from '@/services/authorizer';

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
};

export const middleware = withCroct({
  userIdResolver: async request => {
    const sessionToken = request.cookies.get('my-session-token');

    if (sessionToken === null) {
      return null;
    }

    try {
      return await authorizer(sessionToken);
    } catch {
      return null;
    }
  },
});
```

## Anonymous vs identified profiles

- All users start anonymous. Identify via `identify`/`setToken`/`userId`, or by tracking user
  account events.
- On identification, the anonymous profile's data merges into the identified one.
- On logout, the user returns to the previous anonymous profile; identified data does not flow
  back. Anonymous and identified profiles of one person count as two users.
- In the dashboard timeline, the anonymous and identified sessions appear as linked sessions.
- Profile tags such as **Buyer** (`orderPlaced`), **Contact info**, **Work info**, and
  **Custom attributes** need tracking; Contact and Work info only show for identified users.

## Anonymity scope

Application setting that controls how **anonymous** users are recognized (identified users are
always recognized by their ID):

| Scope | Recognizes anonymous users across | Default for |
|---|---|---|
| Application | sessions in the same application only | development applications |
| Workspace | all applications in the workspace (recommended) | production applications |
| Organization | all applications in the organization | |

Changing the scope restarts active anonymous sessions, treats returning anonymous users as new,
and unlinks them from previous anonymous profiles (history is kept). Concurrent sessions across
applications appear only at workspace or organization scope.

## Sessions

- Each event either extends a still-valid session or starts a new one. Passive or no-op events
  do not necessarily start or extend sessions.
- States: active, closed (still accepts late events during the grace period), expired.
- **Timeout policy** (default): new session after the inactivity timeout, default 30 minutes,
  configurable 1 minute to 24 hours.
- **Midnight policy**: one session per calendar day in the configured time zone.
- Grace period for late (offline, buffered) events: default 24 hours, configurable 0-24 hours.
  Sessions are never reopenable more than 48 hours after their latest event.
- A session shows as live for up to 10 minutes after its last event.
- Identifying or anonymizing ends the current session and starts a new one (the
  ended session's `parentId` points to the session that superseded it).

## Identity resolution (add-on)

Connects separate profiles of the same person (devices, workspaces) and syncs their attributes.

- Scope: one matching pool per organization. Anonymous profiles only sync with anonymous ones,
  identified with identified.
- Anonymous profiles connect across workspaces automatically when the anonymity scope is
  organization. Identified profiles across workspaces need matching rules, even with the same
  external user ID.
- Matching rules: sets of attributes that must all be equal (e.g. `email`; or `phone` +
  `firstName` + `lastName`). Any rule matching syncs the profiles. `email`/`alternateEmail` and
  `phone`/`alternatePhone` are equivalent by default.
- Propagation repeats matching up to 5 rounds.
- Conflicts resolve per attribute: most recent update wins. `interests` and `activities` are
  unioned and deduplicated.
- Each workspace chooses which attributes it accepts (all by default, including custom).
  Already-synced data stays if rules change.

Implication for tracking: populate contact attributes (`email`, `phone`, names) consistently
so matching rules have data to work with.

## Sources

- https://docs.croct.com/reference/user/overview.md
- https://docs.croct.com/reference/user/standard-attributes.md
- https://docs.croct.com/reference/user/custom-attributes.md
- https://docs.croct.com/reference/event/data-types/session.md
- https://docs.croct.com/reference/sdk/javascript/data-collection.md
- https://docs.croct.com/reference/sdk/react/data-collection.md
- https://docs.croct.com/reference/sdk/nextjs/data-collection.md
- https://docs.croct.com/reference/sdk/javascript/api/user/edit.md
- https://docs.croct.com/reference/sdk/javascript/api/user/is-anonymous.md
- https://docs.croct.com/reference/sdk/javascript/api/user/is-identified.md
- https://docs.croct.com/reference/sdk/javascript/api/session/edit.md
- https://docs.croct.com/reference/sdk/javascript/api/patch.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/set.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/add.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/combine.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/merge.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/remove.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/clear.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/unset.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/increment.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/decrement.md
- https://docs.croct.com/reference/sdk/javascript/api/patch/save.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/plug.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/identify.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/anonymize.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/set-token.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/unset-token.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/get-user-id.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/is-anonymous.md
- https://docs.croct.com/reference/sdk/javascript/api/tracker/enable.md
- https://docs.croct.com/reference/sdk/javascript/api/tracker/disable.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/identify.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/anonymize.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/with-croct.md
- https://docs.croct.com/reference/sdk/nextjs/api/environment-variables.md
- https://docs.croct.com/explanation/user-profiles/introduction.md
- https://docs.croct.com/explanation/user-profiles/identity-resolution.md
- https://docs.croct.com/explanation/user-profiles/timeline.md
- https://docs.croct.com/explanation/application/anonymity-scope.md
- https://docs.croct.com/explanation/application/sessions.md
