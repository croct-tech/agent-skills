# Where CQL runs: audiences, evaluation, dynamic values, estimation

## Audiences

An audience is a CQL boolean expression evaluated against the user's current context (device,
pages visited, profile, and more) each time the user interacts. Users matching the criteria are in
the audience; Croct then picks the highest-priority experience for it. Audiences are edited in the
dashboard (from an experience's settings or the audiences list).

- `true` matches everyone. Give an all-users experience the lowest priority so it does not override
  specific experiences.
- Boolean error tolerance turns undefined values, failed conversions, and invalid comparisons into
  `false`, so missing data makes a condition fail instead of raising an error.

## SDK evaluation

Queries passed to the SDKs are limited to **500 characters**. Always handle failures.

### JavaScript (`@croct/plug`)

```ts
import croct from '@croct/plug';

const returning = await croct.evaluate<boolean>('user is returning')
  .catch(() => false); // fail-safe fallback
```

Signature: `croct.evaluate<T extends JsonValue>(query: string, options?: EvaluationOptions): Promise<T>`.
Options: `timeout` (ms; a default can be set at `croct.plug()`), `attributes`.

Results are any JSON value, not only booleans: `await croct.evaluate('location')` returns the
location map.

### Passing context attributes

```ts
import croct from '@croct/plug';

const inList = await croct.evaluate<boolean>(
  "context's countries include location's countryName",
  {attributes: {countries: ['United States', 'Canada', 'Mexico']}},
);
```

Attributes become `context's <name>` in the query. Limits: up to 30 entries and 5 levels deep;
keys are numbers or non-empty strings up to 50 characters; values are null, numbers, booleans,
strings up to 50 characters, or nested maps with the same rules.

### React (`@croct/plug-react`)

```tsx
import {useEvaluation} from '@croct/plug-react';

export function DocsLink() {
  const isDeveloper = useEvaluation<boolean>("user's persona is 'developer'");

  return isDeveloper ? <a href="/docs">View docs</a> : <a href="/share">Share</a>;
}
```

The declarative alternative is `<Personalization query="...">{result => ...}</Personalization>`.

### Next.js (`@croct/plug-next/server`)

```tsx
// App Router server component
import {evaluate, cql} from '@croct/plug-next/server';

export async function DocsLink() {
  const isDeveloper = await evaluate<boolean>("user's persona is 'developer'");
  const roles = ['developer', 'engineer', 'cto', 'cio'];
  const isTechnical = await cql<boolean>`user's persona is in ${roles}`; // interpolation handled

  return isDeveloper || isTechnical ? <a href="/docs">View docs</a> : <a href="/share">Share</a>;
}
```

- `cql` is a tagged template: it interpolates values for you but accepts no options and works only
  in the App Router. Use `evaluate` when you need options or the Pages Router
  (`evaluate(query, {route: context})` inside `getServerSideProps`).
- For client components, use the React hooks imported from `@croct/plug-next`.

For other SDKs (PHP, Laravel, Symfony, Drupal, Hydrogen, Vue) and setup details, see the
`croct-integrate-sdk` skill.

## Evaluation API (HTTP)

Prefer the SDK; call the API directly only for custom integrations or new clients. For API keys,
authentication, and other endpoints, see the `croct-use-api` skill.

| Variant | Endpoint | Auth |
|---|---|---|
| Client (browser/device) | `POST https://api.croct.io/client/web/evaluate` | `X-App-Id` + `X-Client-Id` (UUID) and/or `X-Token` (JWT); CORS against trusted origins |
| Server | `POST https://api.croct.io/external/web/evaluate` | `X-Api-Key` |

```js
const response = await fetch('https://api.croct.io/client/web/evaluate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Id': '<APP ID>',
    'X-Client-Id': '<CLIENT ID>',
  },
  body: JSON.stringify({
    query: 'user is returning',
    context: {
      timeZone: 'America/New_York',
      page: {url: 'https://example.com/pricing', title: 'Pricing', referrer: 'https://google.com'},
      campaign: {name: 'summer-sale', source: 'google', medium: 'cpc'},
      attributes: {plan: 'pro'},
    },
  }),
});

const result = await response.json(); // e.g. true
```

- `query`: 1 to 500 UTF-8 characters.
- `context` (optional) feeds `context's timeZone`, `page`, `campaign`, and `context's <attribute>`.
  `page.url` is required when `page` is present.
- Either `X-Client-Id` or `X-Token` must be present on the client variant. With signed tokens
  enforced, the JWT must be signed by an API key with the "Issue user tokens" permission.
- Full parameter list: https://docs.croct.com/reference/api/service/evaluation/endpoint/client/evaluate.md

## Dynamic values in content

Content definitions can compute attribute values with CQL (a Scale plan feature):

```json
{
  "type": "dynamic",
  "expression": "user's name",
  "nullable": true,
  "default": "guest"
}
```

`default` is used when evaluation fails, returns `null`, or produces a type incompatible with the
attribute (a `number` attribute such as `"expression": "cart's total"` needs a numeric result).
`nullable` must match the attribute's `optional` flag. Limit: 10 dynamic values per content. Schema rules, placeholders,
and `nullable`/`optional` pairing are covered by the `croct-model-content` skill.

## Audience estimation

Shown while creating or editing an audience (Growth and Scale plans). It samples recent profiles
(last 30 days, or the data retention period if shorter) and reports estimated users, estimated
audience size (%), a margin of error in **percentage points** (12% ± 3 means 9% to 15%), and
matching sample profiles.

| Symptom | Cause | Fix |
|---|---|---|
| "Unavailable estimate" | Criteria use real-time context (`page`, current-situation variables) or `now`/`today`/`yesterday` | Expected; the audience still works for experiences and experiments. Estimate a variant without those conditions if sizing matters. |
| "Not enough data yet" | Recently started collecting data, or too few matching users | Keep collecting data and retry. |

Only criteria based on stored profile data or session behavioral history can be estimated.

## Sources

- https://docs.croct.com/explanation/audience/introduction.md
- https://docs.croct.com/explanation/audience/estimation.md
- https://docs.croct.com/explanation/audience/examples/all-users.md
- https://docs.croct.com/reference/sdk/javascript/query-evaluation.md
- https://docs.croct.com/reference/sdk/javascript/api/plug/evaluate.md
- https://docs.croct.com/reference/sdk/react/query-evaluation.md
- https://docs.croct.com/reference/sdk/nextjs/query-evaluation.md
- https://docs.croct.com/reference/sdk/nextjs/api/functions/cql.md
- https://docs.croct.com/reference/api/service/evaluation/quick-start.md
- https://docs.croct.com/reference/api/service/evaluation/endpoint/client/evaluate.md
- https://docs.croct.com/reference/content/definition/introduction.md
- https://docs.croct.com/reference/content/definition/placeholders.md
- https://docs.croct.com/reference/content/definition/types/number.md
- https://docs.croct.com/reference/cql/expressions/operations/logical/overview.md
