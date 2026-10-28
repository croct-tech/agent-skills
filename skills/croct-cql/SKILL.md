---
name: croct-cql
description: >-
  Use when writing, reading, reviewing, or debugging Croct's Contextual Query Language (CQL):
  audience criteria, `croct.evaluate()` / `useEvaluation` / the `Personalization` component / Next.js
  `cql` tag queries, Evaluation API `query` bodies (`/client/web/evaluate`,
  `/external/web/evaluate`), and dynamic content values (`"type": "dynamic"`, `"expression"`).
  Covers context variables (user, session, page, location, campaign, cart, device, browser,
  context, now/today), data types and conversions, accessors and selectors (`'s`, `property X of`,
  `[1st]`, `[*]`, `[...]`), tests (`is`, `matches`, `is like`, `contains either`, `is between`,
  `is defined`, `is returning`), quantifiers (`some ... satisfies`), macros, modifiers, event
  expressions (`user has viewed a page`, `user has abandoned a cart`, `user has completed goal`),
  audience estimation, and recipes. Triggers: "write an audience", "target mobile users in
  New York", "CQL syntax error", "audience never matches", "unavailable estimate".
---

# Write and debug CQL

CQL is Croct's English-like query language. The same expression syntax powers audiences,
real-time evaluation from SDKs and the HTTP API, and dynamic content values. Everything here is
from docs.croct.com; when something is not covered, check the live docs (bottom of this file)
instead of guessing.

## Workflow

1. Identify where the query runs: audience (must be boolean), `evaluate`/API (any JSON value,
   max 500 characters), or dynamic value (result must fit the attribute type, else `default`).
2. Pick the data source: current context (`page`, `cart`, `location`, `campaign`, `device`),
   stored profile (`user's ...`, `user's stats`), session (`session's ...`), or history
   (`user has ...` event expressions, Scale plan).
3. Check the data is collected: anything flagged *integration required* (profile attributes,
   cart, interests, goals, sign-in state) never matches unless the app sends it.
4. Write it with the cheat sheet below; look up exact properties in
   [context-and-data-types.md](references/context-and-data-types.md).
5. Run the pitfalls checklist, then test with `croct.evaluate()` or the dashboard estimator.

## Cheat sheet

```cql
// Natural, technical, and mixed styles are interchangeable
user's score is greater than 90
user.score > 90
user's score > 90
```

| Need | Syntax |
|---|---|
| Property | `user's address's city`, `user's stats' orders`, `property city of user's address`, `user.address.city` |
| Odd key / index | `page.query['coupon-code']`, `list[0]`, `(user's interests)[0]` |
| Selectors | `cart.items[1st]`, `[:first]`, `[:last(2)]`, `items[*].price`, `data[...].price` |
| Literals | `null`, `true`, `42`, `3.14` (decimal), `3.14f`, `51%`, `"str"`, `'raw'`, `~/re/i`, `[1, 2]`, `["k": "v"]` |
| Dates | No literal: `"2026-01-01" as date`, `"2026-01-01T12:00" as datetime`; `today + 1 day` |
| Logic | `and` `or` `not` (`&&` `\|\|` `!`); `and` binds tighter than `or` |
| Compare | `==` `!=` `>` `>=` `<` `<=`; `1 < x < 3`; `is equal to X ignoring case` |
| Literal shorthand | `X is "value"`, `X is not 0` (right side must be a literal) |
| Strings | `starts with`, `ends with`, `matches "sub"` / `matches ~/re/i` (case-sensitive), `is like "sub"` (case-insensitive) |
| Collections | `contains X`, `X is in [..]`, `contains all of [..]`, `contains either [..]`, `contains neither [..]` |
| Presence | `is defined` / `is known`, `is empty` |
| User/session | `user is returning`, `user is anonymous`, `user is identified`, `session is starting` |
| Dates | `is before`, `is after`, `is at "12:00"`, `is between A and B [exclusive]`, `today's weekday is "monday"` |
| Quantifiers | `some x in C satisfies P`, `every`, `no`, `not every`, `at least 2 of any [distinct] x in C satisfies P` |
| Macros | `count of`, `sum of`, `average of`, `min of`, `max of`, `first of`, `last of`, `keys of`, `length of`, `number of days between A and B`, `this month` |
| Modifiers | `as number`, `rounded [down]`, `in title case`, `sorted descending`, `without duplicates`, `replacing "a" with "b"`, `today at "12:00"` |
| Fallback | `user's name or else "Anonymous"` (`??`) |
| Conditional | `"A" if cond otherwise "B"`, `cond ? "A" : "B"` |
| Variables | `let orders = user's stats' orders; orders >= 5` |
| Events (Scale) | `user has <event> [with prop value] [at least N times] [in last 7 days]` |
| Comments | `// line`, `# line`, `/* block */` |

Keywords and identifiers are case-insensitive; **string literals are case-sensitive**.

## Context at a glance

| Variable | Common properties |
|---|---|
| `user` | `id`, `firstName`, `email`, `age`, `company`, `jobTitle`, `interests`, `activities`, `stats' sessions`, `stats' orders`, any custom attribute |
| `session` | `start`, `duration`, `landingPage`, `referrer`, `stats' pageviews`, `stats' orders`, `audiences`, `experiences`, `experiments`, custom attributes |
| `page` (web) | `title`, `url`, `path`, `query`, `anchor`, `referrer` |
| `location` | `continentCode`, `countryCode`, `countryName`, `stateCode`/`regionCode` (alias of `state's code`), `stateName`, `cityName`, `timeZone`, `tags` |
| `device` / `browser` | `category` (`desktop`, `tablet`, `mobile`, `bot`, ...), `vendor`, `name`, `os`; `browser's name`, `type` |
| `campaign` | `name`, `source`, `medium`, `content`, `term` (UTM) |
| `cart` | `stage` (`browsing`, `shopping`, `checkout`), `items`, `total`, `subtotal`, `coupon`, `discount` |
| `context` | `timeZone`, attributes passed at evaluation |
| `now`, `today`, `yesterday`, `tomorrow` | `weekday`, `day`, `month`, `year`, `hour`... |

## Most useful patterns

```cql
user is returning
user is not returning
session is starting
device's category is "mobile"
device's category is not "bot"
location's countryCode is "US"
location's state's code is in ["NY", "CA"]
location's cityName is "New York" and today's weekday is "monday"
campaign's source is "google" and campaign's medium is "cpc"
campaign's name matches "sale"
page's path is in ["/pricing", "/plans"]
page's query's newsletter is "daily-news"
page.query['coupon-code'] is defined
session's referrer matches "google"
session's landingPage starts with "https://example.com/promo"
session's duration > 5 minutes and session's stats' orders is 0
user's interests contains either ["marketing", "sales"]
user's age is between 18 and 30
user's stats' orders is 0
user's plan is "premium"
cart's stage is "checkout" and cart's total is greater than 100
some item in cart's items satisfies item's brand is "Apple"
(no item in cart's items satisfies item's name is like "smartphone") and user is returning
user has abandoned a cart at least 2 times
user has viewed a product with category "Shoes" in last 7 days
user has completed goal "demo-requested" last session
user's firstName or else "there"
```

More by use case (campaign, location, technology, session, profile, cart, orders, value queries):
[references/recipes.md](references/recipes.md).

## Evaluate from code

```ts
import croct from '@croct/plug';

const isReturning = await croct.evaluate<boolean>('user is returning').catch(() => false);
const inList = await croct.evaluate<boolean>(
  "context's countries include location's countryName",
  {attributes: {countries: ['United States', 'Canada']}}, // read as `context's countries`
);
```

Next.js server: `await evaluate(query)` or ``await cql`user's persona is in ${roles}` `` from
`@croct/plug-next/server`. React: `useEvaluation(query)`. HTTP:
`POST https://api.croct.io/client/web/evaluate` with `{"query": "..."}`. Details, attribute limits,
dynamic values, and estimation: [references/evaluation.md](references/evaluation.md).

## Pitfalls and debugging

| Symptom | Likely cause | Fix |
|---|---|---|
| Syntax error on `x is y` | `is` shorthand needs a literal on the right | `x is equal to y` or `x == y` |
| Syntax error on `location city is "Berlin"` | Missing accessor: bare words between a variable and its property | `location's cityName`, `property cityName of location`, or `location.cityName` |
| Error comparing `"1" > 0` or `session's start > "2026-01-01"` | Relational operators never convert types | Cast: `"1" as number > 0`, `... > "2026-01-01" as datetime`, or use `is after` |
| Location/code never matches | Wrong case: codes are upper case (`"US"`, `"NA"`, `"CA"`) and strings are case-sensitive | Use upper case, `is like`, `is equal to ... ignoring case`, or `~/.../i` |
| `matches "Sale"` misses "sale" | `matches`, `starts with`, `ends with` are case-sensitive | `is like "sale"` or `matches ~/sale/i` |
| Quantifier swallows following condition | Quantifier predicate extends to the end | Parenthesize the whole quantifier |
| `a or b and c` behaves oddly | `and` binds tighter than `or` | Add parentheses |
| Conditional result multiplied wrongly | Conditionals are greedy | `(A if c otherwise B) * price` |
| Profile/cart/interest condition never true | Integration-required data not sent | Track the event or set the attribute (see the `croct-track-events` skill) |
| Both `X is greater than 30` and `X is not greater than 30` false | Undefined value: boolean error tolerance yields false | Use `X is defined and ...`, or `X or else 0` |
| `user is identified` always false | Sign-in/up/out events not tracked | Track them; otherwise users are always anonymous |
| `cart.items[2nd]`, `first of`, `average of`, `min of` errors | Missing element or empty collection | Append `or else null` / `or else 0` |
| `contains none of []` vs `contains neither []` | Empty right side: `none` false, `neither` true | Use `contains neither` for "no overlap" |
| Error mixing `'s` with brackets | Ownership/possessive plus brackets need parentheses | `(cart's items)[1st]` or dot notation `cart.items[*]` |
| Event expressions unavailable | They are a Scale plan feature | Use profile/session stats where possible (`user's stats' orders`) |
| "Unavailable estimate" | Uses `page`, current context, or `now`/`today`/`yesterday` | Expected; audience still works at runtime |
| Range error | `..` ranges max 30 items | Narrow the range |
| Variable/parameter name error | Variables cannot be redefined; names must be identifiers | Rename; avoid built-ins (`user`, `page`) and generic words |

Do:

- Prefer explicit `is equal to`, `is greater than` in audiences shared with non-developers;
  use technical style when it reads better.
- Guard optional data with `is defined` or `or else`.
- Put cheap conditions first in `and` chains (short-circuiting skips the rest).
- Use `contains either` / `contains neither` rather than negating `contains all` / `contains none`.

Don't:

- Don't invent tests, variables, or event phrasings. Examples such as `user is new` or
  `user has made purchase` appear in docs prose but are not documented constructs; use
  `user is not returning` and `user's stats' orders is not 0` (or `user has placed an order`).
- Don't compare `location's countryName` with a code; use `countryCode` for `"US"`.
- Don't rely on implicit date conversion in arithmetic: `"2021-01-01" as date + 1 day`.

## References

| File | Read when |
|---|---|
| [references/syntax.md](references/syntax.md) | Lexical rules, `let`, functions, literals, accessors and selectors, precedence table, conditionals, durations |
| [references/context-and-data-types.md](references/context-and-data-types.md) | Every variable and property, availability flags, enums (device category, cart stage, continent, location tags), conversions |
| [references/expressions.md](references/expressions.md) | All tests, operators, error tolerance, quantifiers, macros, modifiers |
| [references/events.md](references/events.md) | Event expressions, criteria operators, count quantifiers, time windows, tracking requirements |
| [references/evaluation.md](references/evaluation.md) | SDK `evaluate` / `cql` / hooks, Evaluation API, context attributes, dynamic values, audience estimation |
| [references/recipes.md](references/recipes.md) | Ready-to-use audiences and value queries by use case |

Related skills: `croct-integrate-sdk` (SDK setup), `croct-track-events` (sending the events and
attributes that queries read), `croct-use-api` (HTTP APIs), `croct-model-content` (dynamic values
in content definitions), `croct-personalize-and-test` (experiences and experiments that use
audiences), `croct-use-croct` (concepts and orientation).

## Live docs

- Index: https://docs.croct.com/llms.txt
- CQL reference: https://docs.croct.com/reference/cql/introduction.md (append `.md` to any page)
- Search: https://docs.croct.com/api/search.md?term=<terms>
