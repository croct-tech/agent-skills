# CQL syntax, literals, and accessors

Lexical rules, query structure, literals, property access, precedence, conditionals, durations,
and user-defined functions.

## Styles

CQL mixes natural language with JavaScript-like notation. All three forms below are equivalent;
mix freely.

| Style | Expression |
|---|---|
| Natural | `user's score is greater than 90` |
| Technical | `user.score > 90` |
| Mixed | `user's score > 90` |

## Lexical rules

- **Case-insensitive** keywords and identifiers: `user` == `USER`. **String literals are
  case-sensitive**: `"Croct"` != `"croct"`.
- Whitespace (spaces, tabs, line breaks) is insignificant outside strings.
- Comments: `// line`, `# line` (Python style), `/* block */`. Block comments can disable part of
  a query: `/* user's status is "active" */ user's interests include "🎮"`.
- Identifiers: start with a letter or `_`, then letters, digits, `_` (A-Z, 0-9). Valid: `name`,
  `primaryButton`, `_score`. Invalid: `1section`, `primary-button`, `full name`, `.rating`.
  Prefer camelCase (`displayPrice`).
- Reserved words cannot be identifiers; using one fails to parse with an error. The docs do not
  publish the list; avoid generic words such as `unless` or `when` (may be reserved later).
- For property names that are not valid identifiers (hyphens, spaces), use bracket access:
  `page.query['coupon-code']`.

## Query structure

```cql
// Optional declaration blocks: each starts with `let` and ends with `;`
let rocket = "🚀", speed = 28000; # km/h
let distance = speed * 24;
// Main expression: no trailing semicolon
rocket & " travels " & distance & " km in one day"
```

- Multiple `let` blocks allowed; comma-separate definitions inside a block.
- A value can be any expression, including other variables or a function.
- Variables cannot be redefined: redeclaring a name (including a built-in such as `user`)
  is an error.

## Functions

Arrow-function syntax; the body is a single expression (no blocks).

```cql
let price = (value, discount) => value - (value * discount);
price(100, 0.1) // 90
```

```cql
let welcome = subject => "Hello, " & subject & "!";   // single param: parentheses optional
let hello = () => "Hello, " & location's cityName & "!"; // body sees outer variables
```

- Call positionally `calculate(1, 2, 3)`, by name `calculate(c: 3, b: 2, a: 1)`, or mixed with
  positional first `calculate(1, c: 3, b: 2)`.
- Extra arguments to a parameterless function are ignored; missing required arguments error.
- Parameters cannot reuse an existing variable name (error).
- Spread a list or map into arguments: `power(...[2, 3])`, `power(...["b": 3, "a": 2])`. Keyless
  elements must come before keyed ones (`["b": 3, 2]` is invalid).

## Literals

| Type | Syntax | Notes |
|---|---|---|
| Null | `null` | Initial value of optional attributes (name, age, email). |
| Boolean | `true`, `false` | Case-insensitive. |
| Integer | `42`, `-42` | 64-bit signed; out-of-range literal errors. |
| Decimal | `3.14`, `42.0`, `.5`, `3.0e2`, `1.5e-3` | Default for fractional numbers; exact, max 28 significant digits. `0.1 + 0.2` is `0.3`. |
| Float | `3.14f`, `.5f`, `3.0e2f` | 64-bit approximate; use for coordinates, ratios, probabilities. |
| Ordinal | `1st`, `2nd`, `3rd`, `4th` | Only where documented (ordinal selector, `replacing ... occurrence`). Some places accept words `first`..`twelfth`. |
| String | `'raw'`, `"escaped"` | See escapes below. |
| Regex | `~/[a-z]/i` | PCRE; `~/` pattern `/` then optional flags. |
| List | `[1, 2, 3]` | Zero-based keys. |
| Map | `["yes": "👍", "no": "👎"]` | Ordered; keys are strings or integers; duplicate key keeps the last. |
| Percent | `51%` | `51% == 0.51`. |

Strings:

- Double-quoted strings support `\\ \" \/ \n \r \t \b \f` and `\uXXXX` (exactly four hex digits;
  above U+FFFF use a surrogate pair, e.g. `"😀"` for 😀).
- Single-quoted strings are verbatim except `\'` and `\\`.
- Alternate delimiters to avoid escaping: `'say "hi"'`.

Maps:

```cql
let three = 3;
[1: "a", "2": "b", three: "c", (3 + 1): "d"]
```

String keys that represent integers become integers; non-string expression keys are converted to
strings. Sets have no syntax: any duplicate-free collection is a set; `list without duplicates`
makes one.

There are **no date, time, date-time, or duration literals for absolute values**. Build them with
the cast modifier (`"2026-01-01" as date`, `"2026-01-01T12:00" as datetime`, `"12:00" as time`)
or with duration expressions (`1 day`).

## Property access

| Notation | Example | Use when |
|---|---|---|
| Ownership (`'s`) | `user's address's city` | Natural style, shallow nesting. Drop the `s` after a trailing `s`: `user's stats' orders`. |
| Possessive (`property X of`) | `property city of user's address` | Reads like a sentence; optional leading `the`. |
| Dot | `user.address.city` | Deep nesting, developer audience. |
| Bracket | `user['interests']`, `page.query['referral code']`, `user.interests[0]` | Non-identifier names, numeric indexes, selectors, dynamic keys. |

To mix ownership or possessive with brackets, wrap in parentheses:
`(user's interests)[0]`, `(property interests of user)[0]`.

### Bracket selectors

| Selector | Example | Result |
|---|---|---|
| Expression (key/index) | `transport[0]`, `page.query[param]` | Zero-based index or any computed key. |
| First | `cart.items[:first]`, `list[:first(2)]` | First item, or first N as a list. Works on maps (by order). |
| Last | `cart.items[:last]`, `list[:last(2)]` | Last item, or last N. |
| Ordinal | `cart.items[2nd]` | 1-based position. Errors if missing; guard with `or else null`. |
| Wildcard | `wishlist[*].price` | Applies the rest of the path to every item, returns a list. |
| Scan | `inventory[...].price`, `inventory[...4].price` | Recursively collects matching values from nested structures; optional max depth. |

```cql
sum of wishlist[*].price
min of inventory[...].price
some brand in cart[...].brand satisfies brand is "Apple"
cart.items[2nd] or else null
```

## Grouping and evaluation order

Precedence, highest to lowest:

| # | Category | Examples |
|---|---|---|
| 1 | Parentheses | `(1 + 2) * 3` |
| 2 | Unary | `not` `-` `%` |
| 3 | Property access | `user.score` `user['score']` |
| 4 | Function calls | `calculate_score(user)` |
| 5 | Possessive | `property score of user` |
| 6 | Ownership | `user's score` |
| 7 | Durations | `1 day` `2 weeks` |
| 8 | Macros | `sum of` `average of` |
| 9 | Modifiers | `in upper case` `rounded` |
| 10 | Exponentiation | `**` `to power of` |
| 11 | Multiplicative | `*` `times` `/` `mod` |
| 12 | Additive | `+` `plus` `-` `minus` |
| 13 | Range | `..` |
| 14 | Concatenation | `&` |
| 15 | Fallback | `??` `or else` `otherwise` |
| 16 | Order comparison | `<` `>` `<=` `>=` |
| 17 | Equality | `==` `!=` |
| 18 | Tests | `is` `matches` `contains` |
| 19 | Functions | `(x y) => x + y` |
| 20 | Quantifiers | `no` `every` `some` `at least` `at most` |
| 21 | Conditionals | `if` `?:` |
| 22 | And | `&&` `and` |
| 23 | Or | `\|\|` `or` |

Associativity: right for conditionals, unary operators, and exponentiation
(`2 ** 3 ** 2` is `512`); left for fallback, concatenation, equality, multiplicative, additive,
`and`, `or`.

Consequences:

- `and` binds tighter than `or`: `a or b and c` is `a or (b and c)`.
- Tests bind tighter than `and`/`or`, so `user's score > 90 and user's plan is "premium"` needs no
  parentheses.
- Quantifier predicates are greedy. Parenthesize the quantifier before combining it:

```cql
(no item in cart's items satisfies item's name is like "smartphone") and user is returning
```

Without parentheses, `and user is returning` becomes part of the per-item predicate.

## Conditionals

```cql
"Eligible" if user is returning otherwise "Ineligible"   // natural; `else` == `otherwise`
user is returning ? "Eligible" : "Ineligible"             // shorthand
discount ?: 0                                             // condition value as consequence
```

- Omitting `else`/`otherwise` yields `null` when the condition is false.
- Chain: `20% if orders >= 10 else 10% if orders >= 5 otherwise 5%`. Prefer parentheses for
  nested cases.
- The condition must be boolean, otherwise evaluation errors.
- Conditionals are greedy: `90% if user is returning otherwise 10% * price` multiplies only the
  alternate. Write `(90% if user is returning otherwise 10%) * price`.

## Durations

A number plus a unit: `1 day`, `-1 day`, `+2 hours`. Singular and plural are interchangeable
(`1 days` is valid).

| Unit forms | Behavior |
|---|---|
| `years`, `year` | Feb 29 plus 1 year in a non-leap year gives Feb 28. |
| `months`, `month` | Clamps to the last day of the target month. |
| `weeks`, `week` | 7 days. |
| `weekdays`, `weekday` | Working days per the application locale. |
| `weekend days`, `weekend day` | Non-working days per the application locale. |
| `days`, `day` | Any day; DST-aware. |
| `hours`, `hour`; `minutes`, `minute`; `seconds`, `second` | Fixed lengths. |
| `milliseconds`, `millisecond`, `millis`, `milli` | |
| `microseconds`, `microsecond`, `micros`, `micro` | |
| `nanoseconds`, `nanosecond`, `nanos`, `nano` | Smallest unit. |

```cql
today plus 5 weekdays     // 5th business day from today
today minus 3 months
session's duration > 5 minutes
```

Temporal arithmetic chains only with the date on the left: `today + 2 days + 1 month` is valid;
`2 days + 1 month + today` is invalid. Order matters (Aug 30 + 1 month + 2 days is Oct 2; + 2 days
+ 1 month is Oct 1). Results outside the temporal range fail.

## Sources

- https://docs.croct.com/reference/cql/introduction.md
- https://docs.croct.com/reference/cql/syntax.md
- https://docs.croct.com/reference/cql/expressions/basics.md
- https://docs.croct.com/reference/cql/expressions/functions.md
- https://docs.croct.com/reference/cql/expressions/conditionals.md
- https://docs.croct.com/reference/cql/expressions/durations.md
- https://docs.croct.com/reference/cql/expressions/literals/null.md
- https://docs.croct.com/reference/cql/expressions/literals/boolean.md
- https://docs.croct.com/reference/cql/expressions/literals/number.md
- https://docs.croct.com/reference/cql/expressions/literals/string.md
- https://docs.croct.com/reference/cql/expressions/literals/regex.md
- https://docs.croct.com/reference/cql/expressions/literals/collection.md
- https://docs.croct.com/reference/cql/expressions/accessors/ownership.md
- https://docs.croct.com/reference/cql/expressions/accessors/possessive.md
- https://docs.croct.com/reference/cql/expressions/accessors/dot.md
- https://docs.croct.com/reference/cql/expressions/accessors/bracket/overview.md
- https://docs.croct.com/reference/cql/expressions/accessors/bracket/selectors/expression.md
- https://docs.croct.com/reference/cql/expressions/accessors/bracket/selectors/first.md
- https://docs.croct.com/reference/cql/expressions/accessors/bracket/selectors/last.md
- https://docs.croct.com/reference/cql/expressions/accessors/bracket/selectors/ordinal.md
- https://docs.croct.com/reference/cql/expressions/accessors/bracket/selectors/wildcard.md
- https://docs.croct.com/reference/cql/expressions/accessors/bracket/selectors/scan.md
- https://docs.croct.com/reference/cql/expressions/operations/other/spread.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/overview.md
