# Context variables, data types, and conversions

What queries can read, the shape of each value, and how values convert between types.

## Availability flags

- **[I] Integration required**: not collected automatically by the SDKs; the app must send it
  (events, profile/session attributes, or evaluation attributes).
- **[W] Web only**: available for web sessions only.
- **[ID] Identified only**: personally identifiable data, readable only for identified users.

Unflagged values are collected automatically.

## Variables

| Variable | Type | Description |
|---|---|---|
| `now` | Date-time | Current date and time. |
| `today`, `yesterday`, `tomorrow` | Date | Calendar dates. |
| `user` | User | The current user's profile. |
| `session` | Web session | Current session or visit. |
| `page` | Page [W] | The page being viewed. |
| `browser` | Browser [W] | The user's browser. |
| `device` | Device | The user's device. |
| `location` | Location | The user's geographic location. |
| `campaign` | Campaign | The last campaign the user interacted with. |
| `cart` | Cart [I] | The shopping cart. |
| `context` | Web context | Evaluation context: `timeZone` plus custom attributes passed at evaluation. |

Date/time variables (`now`, `today`, ...) and current-context values (`page`, etc.) prevent
audience estimation (see the audience estimation section of `references/evaluation.md`, linked from
SKILL.md).

## User

| Expression | Flags | Example |
|---|---|---|
| `user's id` | I, ID | `"user-123"` |
| `user's name` (virtual: first + last) | I, ID | `"John Doe"` |
| `user's firstName`, `user's lastName` | I, ID | `"John"` |
| `user's age` (virtual: from birthDate) | I | `30` |
| `user's birthDate` | | `2000-08-31` (Date) |
| `user's gender` | I, ID | `"male"`, `"female"`, `"neutral"`, `"unknown"` (may grow) |
| `user's email`, `user's alternateEmail` | I, ID | `"john.doe@email.com"` |
| `user's phone`, `user's alternatePhone` | I, ID | `"+1 987 654 321"` |
| `user's address` | I, ID | Address map (see below) |
| `user's avatar`, `user's companyUrl` | I, ID | URL strings |
| `user's company`, `user's jobTitle` | I, ID | `"Croct Inc."` |
| `user's interests` | I | `set<string>`, e.g. `["react", ...]` |
| `user's activities` | I | `set<string>`, e.g. `["signed-up", ...]` |
| `user's stats' sessions` | | Total sessions across all applications (`integer\|null`). |
| `user's stats' orders` | | Total orders across sessions (`integer\|null`). |
| `user's <custom>` | I | `primitive\|collection<primitive>\|null` |

A custom attribute with the same name as a predefined one hides it (without overwriting it).

Address (`user's address`): `street`, `city`, `district`, `region`, `state` (alias of `region`),
`country` (ISO 3166-1 alpha-2 recommended, format up to the implementation), `postalCode`. All
`string|null`.

## Session (web session)

| Expression | Flags | Type / example |
|---|---|---|
| `session's start` | | Date-time of first interaction |
| `session's end` | | Date-time of last interaction |
| `session's duration` | | Duration, e.g. `PT1M40S` |
| `session's landingPage` | W | `URI\|null` (null if unknown) |
| `session's referrer` | W | `URI\|null` (null on direct access); constant for the whole visit |
| `session's stats' pageviews` | W | Starts at 1; +1 per navigation to a different page |
| `session's stats' tabviews` | W | Starts at 1; +1 each time the user switches back to the tab |
| `session's stats' clicks` | | Starts at 0 (listed in the type, not in the context table) |
| `session's stats' orders` | | Orders placed this session |
| `session's audiences` | | `list<Audience>`: `id`, `name`, `customId` of audiences from experiences that impacted the user |
| `session's experiences` | | `list<Experience>`: `id`, `name` |
| `session's experiments` | | `list<Experiment>`: `id`, `name`, `variantId`, `variantName` |
| `session's <custom>` | I | Custom session attribute (hides a predefined one with the same name) |

```cql
some entry in session's experiments satisfies entry's variantName is "Variant A"
```

## Navigation: `page` [W]

| Property | Type | Notes |
|---|---|---|
| `title` | `string\|null` | |
| `url` | `URI\|null` | Has `base`, `path`, `query`, `anchor` |
| `path` | `string\|null` | Normalized: leading `/`, trailing slashes removed (`/path/` -> `"/path"`, root -> `"/"`) |
| `query` | `map<string, string>` | `?color[]=red&color[]=blue` -> `["color": ["red", "blue"]]` |
| `anchor` | `string\|null` | Fragment without `#` |
| `referrer` | `string\|null` | URL that linked to the page |

URI `base` is scheme + host + port, e.g. `"https://example.com:8080"`.

## Technology

`browser` [W]: `name` (`"Chrome"`), `version` (string), `type` (`web`, `in-app`, `crawler`,
`other`, `unknown`).

`device`: `name` (`"iPhone 11 Pro"`), `vendor` (`"Apple"`), `os` (map with `name`, `version`),
`category` (`desktop`, `tablet`, `mobile`, `bot`, `other`, `unknown`).

```cql
property name of device's os is "iOS"
```

## Location

All properties optional; availability depends on source (IP, GPS) and privacy settings.

| Property | Alias(es) | Example |
|---|---|---|
| `continent` (`name`, `code`) | `continentName`, `continentCode` | `"North America"`, `"NA"` |
| `country` (`name`, `code`) | `countryName`, `countryCode` | `"United States"`, `"US"` (ISO 3166-1 alpha-2, upper case) |
| `region` (`name`, `code`) | `regionName`, `regionCode`; `state`, `stateName`, `stateCode` | `"California"`, `"CA"` (ISO 3166-2, upper case) |
| `city` (`name`) | `cityName` | `"Mountain View"` |
| `coordinates` (`latitude`, `longitude`) | `latitude`, `longitude` | `36.7783` |
| `currency` (`name`, `code`) | `currencyName`, `currencyCode` | `"US Dollar"`, `"USD"` (ISO 4217) |
| `timeZone` | | `"America/Los_Angeles"` (IANA) |
| `languages` | | `["en", "en-CA", "fr-CA"]` (set) |
| `phoneCode` | | `"+1"` |
| `postalCode` | | `"90210"` (may be approximate) |
| `population` | | `100000` |
| `tags` | | set, e.g. `["warm", "lake", "tourism"]` |

Continent codes: `AF`, `AN`, `AS`, `EU`, `NA`, `OC`, `SA`.

Location tags by category:

- Place: `urban`, `residential`, `rural`, `remote`, `park`, `island`
- Society: `government`, `politics`, `military`, `religion`, `education`
- Economy: `business`, `industry`, `agriculture`
- Infrastructure: `transport`, `facility`, `waterway`, `airport`, `road`, `railway`, `seaport`
- Sport: `fishing`, `surfing`, `swimming`, `hiking`, `skiing`
- Attraction: `entertainment`, `scenery`, `landmark`, `recreation`, `tourism`
- Nature: `mountain`, `lake`, `river`, `canyon`, `desert`, `ocean`, `coast`, `beach`, `forest`
- Weather: `warm`, `cold`, `snowy`

## Marketing: `campaign`

UTM-compatible, all `string|null`: `name` (utm_campaign), `source`, `medium`, `content`, `term`.

## Shopping: `cart` [I]

| Property | Type | Notes |
|---|---|---|
| `stage` | `browsing` (empty), `shopping` (has items), `checkout` | |
| `items` | `list<CartItem>` | In the order added |
| `currency` | `string` | ISO 4217 recommended |
| `shippingPrice` | `number\|null` | null = not yet calculated |
| `coupon` | `string\|null` | |
| `discount` | `number\|null` | Absolute value |
| `costs`, `taxes` | `map<string, number>\|null` | |
| `subtotal` | `number\|null` | Before charges/discounts |
| `total` | `number` | 0 when empty |
| `lastUpdate` | Date-time | Current time when empty |

CartItem: `index` (0-based), `id`, `name`, `sku`, `category`, `brand`, `variant`, `displayPrice`,
`originalPrice`, `url`, `image`, `quantity`, `price` (unit), `coupon`, `discount`, `total`.

## Evaluation: `context`

- `context's timeZone`: browser time zone (IANA), `string|null`.
- `context's <attribute>` [I]: values passed as evaluation attributes (SDK `attributes` option,
  API `context.attributes`). See `references/evaluation.md`, linked from SKILL.md.

## Core types

| Type | Notes |
|---|---|
| Null | Single value `null`. |
| Boolean | `true` / `false`. |
| Number | Supertype of ordinal (1..2^63-1), integer (64-bit signed), decimal (28 significant digits), float (64-bit). |
| String | UTF-8 text. |
| Regex | PCRE. |
| Collection | List (ordered, duplicates allowed), set (any duplicate-free collection), map (ordered key-value). |
| Comparable | Abstract: anything with an order (numbers, strings, dates, times). |
| Primitive | Abstract: null, boolean, number, string. |

## Date and time types

| Type | Range | Properties |
|---|---|---|
| Date (local) | -999999999-01-01 .. 999999999-12-31 | `day`, `weekday` (lowercase English, e.g. `"monday"`), `month`, `year` |
| Time (local) | 00:00:00 .. 23:59:59.999999999 | `hour`, `minute`, `second`, `milli`, `micro`, `nano` |
| Date-time | -999999999-01-01T00:00:00 .. 999999999-12-31T23:59:59.999999999 | All of the above |
| Duration | | ISO 8601 period when stringified (`1 day` -> `"P1D"`) |

None has a literal syntax: cast strings (`"2026-01-01" as date`). Date-time conversions use the
application's time zone.

```cql
today's weekday is "monday"
now's hour >= 9 and now's hour < 17
```

`now`/`today` use the application's time zone, not the visitor's; see `references/recipes.md`
(Date and time) for visitor-local options. `between` is inclusive by default.

## Conversions

Explicit with `as <type>`; implicit when an operation expects another type. Anything not listed
below is unsupported and errors.

| Target | From | Examples |
|---|---|---|
| boolean | null, numbers, strings | `null`->`false`; `0`/`0.0`->`false`; `1`/`1.0`->`true`; `""`->`false`; `"true"`/`"1"`->`true`; `"false"`/`"0"`->`false` |
| string | null, boolean, numbers, regex, date, time, date-time, duration, URI | `null`->`""`; `10.5`->`"10.5"`; `~/[a-z]+/`->`"/[a-z]+/"`; `2026-10-19T12:00:00Z`->`"2026-10-19T12:00Z"`; `1 day`->`"P1D"` |
| number | null, boolean, string | `null`->`0`; `true`->`1`; `"10"`->`10` (integer); `"1.5"`->`1.5` (decimal) |
| integer | null, boolean, string, decimal, float | `""`->`0`; `"10"`->`10`; `10.5`->`10` (truncates) |
| decimal | null, boolean, string, integer, float | `"10"`->`10.0` |
| float | null, boolean, string, integer, decimal | `10`->`10.0f` |
| date | string, date-time | `"2026-10-19"`, `"2026-W01-1"`, `"2026-001"`, `"2026-10-19T01:02:03"` (time dropped) |
| time | string, date-time | `"01:02:03"`, `"01:02:03.123456"` (up to 6 fraction digits), `"01"` -> `01:00:00` |
| datetime | string, date | `"2026-10-19"` -> midnight; `"2026-10-19T01:02:03Z"`; `"2026-10-19T01"`; date uses app time zone |
| regex | string | `"abc"`->`~/abc/`; special characters are escaped (`"[a-z]+"` matches literally) |

Cast targets: `boolean`, `string`, `number`, `integer`, `decimal`, `float`, `collection`, `time`,
`date`, `datetime`. Chain casts: `"2019-01-01" as datetime as date` (goes through the zoned
date-time; may differ from a direct `as date`).

## Sources

- https://docs.croct.com/reference/cql/context.md
- https://docs.croct.com/reference/cql/conversions.md
- https://docs.croct.com/reference/cql/data-types/core/null.md
- https://docs.croct.com/reference/cql/data-types/core/boolean.md
- https://docs.croct.com/reference/cql/data-types/core/number.md
- https://docs.croct.com/reference/cql/data-types/core/string.md
- https://docs.croct.com/reference/cql/data-types/core/regex.md
- https://docs.croct.com/reference/cql/data-types/core/collection.md
- https://docs.croct.com/reference/cql/data-types/core/comparable.md
- https://docs.croct.com/reference/cql/data-types/core/primitive.md
- https://docs.croct.com/reference/cql/data-types/date-time/date.md
- https://docs.croct.com/reference/cql/data-types/date-time/time.md
- https://docs.croct.com/reference/cql/data-types/date-time/date-time.md
- https://docs.croct.com/reference/cql/data-types/date-time/duration.md
- https://docs.croct.com/reference/cql/data-types/user/user.md
- https://docs.croct.com/reference/cql/data-types/user/user-statistics.md
- https://docs.croct.com/reference/cql/data-types/session/web-session.md
- https://docs.croct.com/reference/cql/data-types/session/web-session-statistics.md
- https://docs.croct.com/reference/cql/data-types/session/audience.md
- https://docs.croct.com/reference/cql/data-types/session/experience.md
- https://docs.croct.com/reference/cql/data-types/session/experiment.md
- https://docs.croct.com/reference/cql/data-types/location/location.md
- https://docs.croct.com/reference/cql/data-types/location/address.md
- https://docs.croct.com/reference/cql/data-types/marketing/campaign.md
- https://docs.croct.com/reference/cql/data-types/shopping/cart.md
- https://docs.croct.com/reference/cql/data-types/shopping/cart-item.md
- https://docs.croct.com/reference/cql/data-types/technology/browser.md
- https://docs.croct.com/reference/cql/data-types/technology/device.md
- https://docs.croct.com/reference/cql/data-types/technology/operating-system.md
- https://docs.croct.com/reference/cql/data-types/web/page.md
- https://docs.croct.com/reference/cql/data-types/web/uri.md
- https://docs.croct.com/reference/cql/data-types/web/web-context.md
