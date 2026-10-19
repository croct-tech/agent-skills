# Data Export API

Export events, sessions, and users in bulk or by ID, for data lakes, warehouses, and analytics
tools. This is an **add-on**; the workspace needs it (Croct sales enables it). Every request needs an API key with the **Export data** permission in `X-Api-Key`.

Prefer the official client; fall back to raw HTTP for other languages.

## Client library

| Language | Package |
| --- | --- |
| JavaScript / TypeScript | `@croct/export` (`npm install @croct/export`, or pnpm/Yarn/Bun equivalents) |
| Java | `com.croct.client:croct-export-client:0.3.0` (Maven Central) |

```ts
import {Configuration, ExportApi} from '@croct/export';

const api = new ExportApi(
  new Configuration({
    apiKey: process.env.CROCT_API_KEY!,
  }),
);
```

```java
import com.croct.client.export.ApiClient;
import com.croct.client.export.api.ExportApi;

final ApiClient client = new ApiClient();
client.setApiKey(System.getenv("CROCT_API_KEY"));

final ExportApi api = new ExportApi(client);
```

### Methods

| JS/TS | Java | Returns |
| --- | --- | --- |
| `exportEvents({start?, end?, pageSize?, cursor?, events?})` | `exportEvents(Long start, Long end, Integer pageSize, String cursor, List<EventType> events)` | `{data: {items, nextCursor, metadata}}` / `EventResponse` |
| `exportSessions({start?, end?, pageSize?, cursor?})` | `exportSessions(Long start, Long end, Integer pageSize, String cursor)` | `{data: {items, nextCursor}}` / `SessionResponse` |
| `exportUsers({start?, end?, pageSize?, cursor?})` | `exportUsers(Long start, Long end, Integer pageSize, String cursor)` | `{data: {items, nextCursor}}` / `UserResponse` |
| `exportEventById({eventId})` | `exportEventById(UUID eventId)` | `{data: {metadata, event}}` / `SingleEventResponse` |
| `exportSessionById({sessionId})` | `exportSessionById(UUID sessionId)` | `{data: Session}` / `Session` |
| `exportUserById({userId})` | `exportUserById(UUID userId)` | `{data: User}` / `User` |

In JS/TS the payload is under `data`; Java returns the model directly (`getItems()`,
`getNextCursor()`, `getEvent()`). Pass `null` in Java for any argument you want to omit.

Filter event types with the `EventType` enum, for example
`events: [EventType.PRODUCT_VIEWED, EventType.CHECKOUT_STARTED, EventType.ORDER_PLACED]`.

## Raw HTTP endpoints

All `GET`, header `X-Api-Key` only, base `https://api.croct.io`.

| Endpoint | Query or path params | Time filter applies to |
| --- | --- | --- |
| `/export/events` | `start`, `end`, `pageSize`, `cursor`, `events` (repeat for each type) | Event time |
| `/export/events/{eventId}` | `eventId` (UUID) | |
| `/export/session` | `start`, `end`, `pageSize`, `cursor` | Session close time |
| `/export/session/{sessionId}` | `sessionId` (UUID) | |
| `/export/user` | `start`, `end`, `pageSize`, `cursor` | User last-modified time |
| `/export/user/{userId}` | `userId` (UUID) | |

Parameters:

- `start`: integer ms since epoch, inclusive (at or after).
- `end`: integer ms since epoch, exclusive (before). No upper limit when omitted.
- `pageSize`: 1 to 1000, default 100. Use 500 to 1000 for bulk exports to reduce calls.
- `cursor`: opaque value from the previous response's `nextCursor`. Omit to start at the
  beginning of the time window. Never modify it.
- `events`: event type names, such as `productViewed`. All types by default.

```bash
curl -sS -G 'https://api.croct.io/export/events' \
  -H "X-Api-Key: $CROCT_API_KEY" \
  --data-urlencode 'start=1440990000000' \
  --data-urlencode 'end=1441076400000' \
  --data-urlencode 'pageSize=100' \
  --data-urlencode 'events=productViewed' \
  --data-urlencode 'events=orderPlaced'

curl -sS 'https://api.croct.io/export/events/924f6c8f-3b5b-47ea-b483-25a0506dc436' \
  -H "X-Api-Key: $CROCT_API_KEY"

curl -sS -G 'https://api.croct.io/export/session' \
  -H "X-Api-Key: $CROCT_API_KEY" \
  --data-urlencode 'pageSize=500'

curl -sS 'https://api.croct.io/export/user/6d5f1fe8-3f21-4bce-9afb-e1d11b610674' \
  -H "X-Api-Key: $CROCT_API_KEY"
```

```js
const url = new URL('https://api.croct.io/export/events');
url.searchParams.append('pageSize', '100');
url.searchParams.append('events', 'productViewed');
url.searchParams.append('events', 'orderPlaced');

const response = await fetch(url, {headers: {'X-Api-Key': process.env.CROCT_API_KEY}});
const {metadata, items, nextCursor} = await response.json();
```

### Raw response bodies

- `/export/events`: `{metadata, items, nextCursor}`.
- `/export/session`, `/export/user`: `{items, nextCursor}`.
- `/export/events/{id}`: `{metadata, event}`.
- `/export/session/{id}`, `/export/user/{id}`: the session or user object itself.
- Unknown ID: `404` `https://croct.help/api/general/resource-not-found` with `resourceType`
  (`Event`, `Session`, `User`) and `resourceId`.

`metadata`: `organizationName`, `organizationSlug`, `workspaceName`, `workspaceSlug`,
`applicationName`, `applicationSlug`.

## Pagination

Cursor-based. Each response carries `nextCursor`; send it back as `cursor` to get the next page.

- **Stateful (preferred for ongoing syncs, e.g. hourly or daily):** persist the last cursor in a
  database, file, or cache and resume from it next run. This avoids data loss.
- **Stateless (one-time exports):** loop over a `start`/`end` window without storing cursors.
  Simpler, but may miss late-arriving or unprocessed events.

Stateful export, capped at roughly 1000 records per run:

```ts
import {Configuration, ExportApi} from '@croct/export';

declare function loadCursor(): Promise<string | undefined>; // read from DB, file, or cache
declare function saveCursor(cursor: string): Promise<void>;  // write to DB, file, or cache

async function exportEvents(): Promise<void> {
  const api = new ExportApi(new Configuration({apiKey: process.env.CROCT_API_KEY!}));

  let cursor: string | undefined = await loadCursor();

  const pageSize = 100;
  let limit = 1000;

  while (limit >= pageSize) {
    const {data: {items: events, nextCursor}} = await api.exportEvents({
      pageSize: pageSize,
      cursor: cursor,
    });

    console.log(events);

    cursor = nextCursor;
    limit = events.length > 0 ? limit - events.length : 0;
  }

  await saveCursor(cursor!);
}
```

Stateless export of yesterday's events:

```ts
const today = new Date();
today.setHours(0, 0, 0, 0);

const yesterday = new Date(today.getTime());
yesterday.setDate(today.getDate() - 1);

let cursor: string | undefined = undefined;
let running = true;

while (running) {
  const {data: {items: events, nextCursor}} = await api.exportEvents({
    pageSize: 100,
    cursor: cursor,
    start: yesterday.getTime(),
    end: today.getTime(),
  });

  console.log(events);

  cursor = nextCursor;
  running = events.length > 0;
}
```

The official loops stop when a page comes back empty. The reference also says `nextCursor` is an
empty string at the end of results; stopping on either condition is safe.

## Entity shapes

**Event** (items of `/export/events`, `event` of the single-event response): `id`, `sessionId`,
`userId`, `timestamp` (ms), `context` (for example `{"type": "web", "tabId": ..., "url": ...}`,
may be `null`), `payload` (`type` plus event-specific fields). See the `croct-track-events` skill
for payload schemas.

**Session:**

| Field | Notes |
| --- | --- |
| `sessionId`, `userId` | UUIDs |
| `parentId` | Session that superseded this one, usually set when the user is identified; or null |
| `externalUserId` | App-side user ID; always null for anonymous users |
| `window.start`, `window.end` | First and last event time, ms |
| `closeTime` | When the session closes for new events; may be extended |
| `referrer`, `landingPageUrl` | string or null |
| `campaign` | `name`, `source`, `medium`, `content`, `term` |
| `location` | `continent` (`AF`, `AN`, `AS`, `EU`, `NA`, `OC`, `SA`), `country` (ISO 3166-1 alpha-2), `region.{name,code}`, `city`, `district`, `timeZone`, `coordinates.{latitude,longitude}`, `source` (`IP`, `GPS`, `BROWSER`, `INPUT`, `UNKNOWN`), `currency.{name,code}`, `phoneCode`, `population`, `postalCode`, `languages[]`, `tags[]` |
| `client.device` | `name`, `vendor`, `category` (`DESKTOP`, `TABLET`, `MOBILE`, `BOT`, `OTHER`, `UNKNOWN`), `operatingSystem.{name,version}` |
| `client.browser` | `name`, `version`, `type` (`WEB`, `IN_APP`, `CRAWLER`, `OTHER`, `UNKNOWN`) |
| `attributes` | Custom session attributes |
| `statistics` | `pageViews`, `tabViews`, `orders` |

**User:**

| Field | Notes |
| --- | --- |
| `userId` | Internal UUID, unique across the workspace |
| `externalUserId` | App-side ID; null for anonymous users |
| `firstName`, `lastName`, `email`, `alternateEmail`, `phone`, `alternatePhone`, `avatar`, `company`, `companyUrl`, `jobTitle` | string or null |
| `birthDate` | ms since epoch or null |
| `gender` | `MALE`, `FEMALE`, `NEUTRAL`, `UNKNOWN` |
| `address` | `street`, `district`, `city`, `region`, `country`, `postalCode` |
| `activities`, `interests` | string arrays |
| `customAttributes` | object |
| `lastModifiedTime` | ms; not updated on sync operations |
| `statistics` | `orders`, `sessions` across all applications |

## Gaps and contradictions in the docs

- The raw endpoint pages describe the list response as wrapped in `data`, but their own examples
  and fetch snippets read `items`/`nextCursor`/`metadata` at the top level. The `data` wrapper
  belongs to the JS client's return value. Read the raw HTTP body at the top level.
- The sessions list example uses `location.timezone`; the field reference and single-session
  example use `timeZone`. Handle both if you parse strictly.
- No rate limits are published for export.

## Sources

- https://docs.croct.com/reference/api/service/data-export/quick-start.md
- https://docs.croct.com/reference/api/service/data-export/pagination.md
- https://docs.croct.com/reference/api/service/data-export/client/installation.md
- https://docs.croct.com/reference/api/service/data-export/client/api/constructor.md
- https://docs.croct.com/reference/api/service/data-export/client/api/export-events.md
- https://docs.croct.com/reference/api/service/data-export/client/api/export-sessions.md
- https://docs.croct.com/reference/api/service/data-export/client/api/export-users.md
- https://docs.croct.com/reference/api/service/data-export/client/api/export-event-by-id.md
- https://docs.croct.com/reference/api/service/data-export/client/api/export-session-by-id.md
- https://docs.croct.com/reference/api/service/data-export/client/api/export-user-by-id.md
- https://docs.croct.com/reference/api/service/data-export/endpoint/events.md
- https://docs.croct.com/reference/api/service/data-export/endpoint/event.md
- https://docs.croct.com/reference/api/service/data-export/endpoint/sessions.md
- https://docs.croct.com/reference/api/service/data-export/endpoint/session.md
- https://docs.croct.com/reference/api/service/data-export/endpoint/users.md
- https://docs.croct.com/reference/api/service/data-export/endpoint/user.md
- https://docs.croct.com/explanation/application/api-keys.md
