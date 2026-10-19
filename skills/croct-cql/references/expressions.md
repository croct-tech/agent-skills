# Operations, tests, quantifiers, macros, and modifiers

Compact catalog of every non-event expression. Each row has a working example.

## Tests (natural-language predicates)

Every test has a negated form. Prefer the dedicated opposite test over negation where one exists.

### Comparison

| Test | Negation | Example |
|---|---|---|
| `X is equal to Y [mode]` | `is not equal to` | `"foo" is equal to "FOO" ignoring case // true` |
| `X is <literal>` (shorthand) | `X is not <literal>` | `cart's stage is "checkout"` |
| `X is greater than Y` | `is not greater than` | `user's score is greater than 10` |
| `X is greater than or equal to Y` | `is not ...` | `1 + 2 is greater than or equal to 3 // true` |
| `X is less than Y` | `is not less than` | `cart's subtotal is less than 100` |
| `X is less than or equal to Y` | `is not ...` | `1 + 2 is less than or equal to 3 // true` |
| `X is between A and B [inclusive\|exclusive]` | `is not between` | `user's age is between 17 and 30` (inclusive by default) |

- **The `is` shorthand only accepts a literal on the right.** `1 + 2 is result` is a syntax
  error; write `1 + 2 is equal to result` or `==`.
- Equal-test modes: `ignoring case`, `ignoring time` (date-times), `ignoring fraction`
  (`1.5` equals `1.9`), `considering numbers` (`1` equals `"1.0"`). Modes need the full
  `is equal to` form.

### String

| Test | Negation | Case | Example |
|---|---|---|---|
| `X starts with P` | `does not start with` | sensitive | `session's landingPage starts with "https://example.com/promo"` |
| `X ends with S` | `does not end with` | sensitive | `session's landingPage ends with "/promo"` |
| `X is like T` | `is not like` | **insensitive** substring/equality | `"Hello world" is like "hello" // true` |
| `X matches P` | `does not match` | sensitive substring, or regex | `page's path matches "/products"`; `"CQL is powerful" matches ~/^[a-z]{3}/i` |

An empty string is a prefix and suffix of every string.

### Collection

Collections in these tests are treated as sets (order and duplicates ignored). Map keys are
ignored by `contains` / `in`.

| Test | Negation | Meaning | Example |
|---|---|---|---|
| `C contains E` / `C includes E` | `does not contain` / `does not include` | E is an element | `user's interests contains "marketing"` |
| `E is in C` | `is not in` | Same, operands reversed | `page's path is in ["/home", "/about"]` |
| `C contains all of D` / `includes all of` | `does not contain all of` | D ⊆ C; true if D empty | `user's interests contains all of ["marketing", "sales"]` |
| `C contains either D` / `includes either` | `does not contain either` | Intersection non-empty; false if D empty | `user's interests contains either ["marketing", "sales"]` |
| `C contains neither D` / `includes neither` | `does not contain neither` | No intersection; true if D empty | `user's interests contains neither ["marketing", "sales"]` |
| `C contains none of D` / `includes none of` | `does not contain none of` | Documented as no common elements; **false if D empty** | `user's interests contains none of ["marketing", "sales"]` |

### Date and time

| Test | Negation | Notes | Example |
|---|---|---|---|
| `X is before Y` | `is not before` | Converts both to instants in the app time zone; accepts ISO strings | `yesterday is before "2026-10-19"` |
| `X is after Y` | `is not after` | Same | `tomorrow is after "2026-10-19"` |
| `X is at T` | `is not at` | Time of day; `"12:00"` or `12` | `now is at "12:00"` |

Use `before`/`after` (not `<`/`>`) when one side is a string: relational operators do not convert
and fail on incompatible operands. The docs list the syntax as `X before Y`, but every example
uses `X is before Y`.

### User and session

| Test | Negation | Meaning |
|---|---|---|
| `user is returning` | `user is not returning` | `user's stats' sessions > 1`. No extra tracking. |
| `user is anonymous` | `user is not anonymous` | Not logged in / signed up. Needs signed-in/up/out events, else always anonymous. |
| `user is identified` | `user is not identified` | Logged in or signed up until logout. Same tracking requirement. |
| `session is starting` | `session is not starting` | First page/screen view of the session (`pageviews <= 1`). |

### Other

| Test | Negation | Meaning | Example |
|---|---|---|---|
| `X is defined` / `X is known` | `is not defined` | Not null and resolvable (errors count as undefined) | `page's query's code is defined` |
| `X is empty` | `is not empty` | null, `""`, or empty collection | `cart's items is empty` |

`is defined` does not imply non-empty; combine with `is not empty` if needed.

## Operations

### Comparison

| Operator | Example | Natural equivalent |
|---|---|---|
| `==` | `1 == 1.0 // true` | `is equal to` |
| `!=` | `"hello" != "Hello" // true` | `is not equal to` |
| `>` `>=` `<` `<=` | `tomorrow > today // true` | `is greater than`, etc. |

- Interval chaining (max two): `1 < x < 3`, `1 <= x < 3`. `1 < 2 < 3 < 4` is invalid.
- **Relational operators do not convert types**: `"1" > 0` errors; write `"1" as number > 0`;
  `session's start > "2026-01-01T12:00" as datetime`.
- Ordering: strings lexicographic, numbers numeric, date-times chronological.
- Equivalence: string == null when the string is empty; number == boolean (`1`/`true`,
  `0`/`false`); collections equal when same keys, values, and order. Local date-time is never
  equal to an instant; local date is never equal to local time (cast first).

### Logical

| Operator | Example |
|---|---|
| `and` / `&&` | `today's weekday is "monday" and user is returning` |
| `or` / `\|\|` | `campaign's name matches "remarketing" or user is returning` |
| `not` / `!` | `not user is returning` |

- Operands convert to boolean (`1 and true` is `true`).
- **Error tolerance**: undefined values, failed boolean conversions, and invalid comparisons inside
  boolean expressions count as `false` instead of erroring. Consequence: when `user's age` is
  unknown, both `user's age is greater than 30` and `user's age is not greater than 30` are false,
  but `not (user's age is greater than 30)` is true.
- Short-circuiting: `and` stops on the first false; `or` stops on the first true. Put cheap
  conditions first.

### Arithmetic

| Operator | Natural form | Example |
|---|---|---|
| `+` | `plus` | `5 + 3 // 8`; `today + 1 day` |
| `-` | `minus` | `today - 1 month - 1 week` |
| `*` | `times` | `2 * 3 // 6` |
| `/` | `divided by` | `2 + 6 / 2 // 5` |
| `mod` | `modulo` | `7 mod 3 // 1`; `-7 mod 3 // 2` (modulus, not remainder) |
| `**` | `to power of` | `2 ** 3 ** 2 // 512` (right-associative) |
| unary `-` / `+` | | `-42`, `+"42"` (prefer `as number`) |
| postfix `%` | | `51% // 0.51` |

- Numeric operations convert operands (`1 + "2"`); unconvertible values fail (no NaN).
- Type generalization: any float -> float; else any decimal -> decimal; else integer. Integer
  overflow becomes a float.
- Temporal values are not auto-converted: `"2021-01-01" as date + 1 day`.
- `1 day - today` is invalid (subtraction is not commutative).

### Other

| Operator | Example | Notes |
|---|---|---|
| `&` concatenation | `"1 + 1 = " & 2 // "1 + 1 = 2"` | Non-strings converted to string. |
| `??` / `or else` fallback | `user's name or else "Anonymous"` | Chainable: `a or else b or else "x"`. Returns first non-absent value. |
| `..` range | `1 .. 3`, `3 .. 1`, `'A' .. 'C'`, `'2026-10-19' .. '2026-10-21'` | Inclusive, integers/characters/local dates only, **max length 30**. |
| `...` spread | `["a", ...list, "z"]`; `["a": 1, ...["a": 2]]` | Later keys win; also spreads function arguments. |

## Quantifiers (collections)

Use `satisfies` or `satisfy`. Item and index names must be valid identifiers.

| Quantifier | Empty collection | Example |
|---|---|---|
| `some x in C satisfies P` | false | `some item in cart's items satisfies item's name matches "t-shirt"` |
| `every x in C satisfies P` | true (vacuous) | `every number in [2, 4, 6] satisfies number mod 2 is 0` |
| `no x in C satisfies P` | true (vacuous) | `no item in cart's items satisfies item's name matches "t-shirt"` |
| `not every x in C satisfies P` | false | `not every number in [2, 4, 6] satisfies number mod 2 is 0 // false` |
| `at least N of any x in C satisfies P` | | `at least 2 of any item in cart's items satisfies item's brand is "Apple"` |
| `at most N of any x in C satisfies P` | | `at most 2 of any item in cart's items satisfies item's price > 50` |
| `exactly N of any x in C satisfies P` | | `exactly 2 of any number in [2, 4, 6] satisfies number mod 2 is 0 // false` |

Options:

- `indexed by i` exposes the zero-based index:
  `some item in cart's items indexed by i satisfies item's brand is "Apple" and i < 3`.
- Numerical quantifiers accept `distinct`:
  `at least 2 of any distinct item in cart's items satisfies item's category is "Electronics"`.
- The predicate extends to the end of the expression; wrap the whole quantifier in parentheses
  before adding `and`/`or` conditions.

## Macros

Optional leading `the` (`the sum of ...`) except where noted.

| Macro | Example | Empty input |
|---|---|---|
| `count of C` | `count of cart's items is greater than 3` | `0` |
| `sum of C` | `sum of [1, 2, "3"] // 6` | `0` |
| `average of C` | `average of [1.5, "2.5", 3.5] // 2.5` | **error** (use `or else 0`) |
| `minimum of C` / `min of C` | `min of inventory[...].price` | **error** |
| `maximum of C` / `max of C` | `maximum of [1.5, 2.5, "3"] // 3` | **error** |
| `first of C` | `first of keys of ["a": 1] // "a"` | **error** (use `or else null`) |
| `last of C` | `last of [1, 2, 3] // 3` | **error** |
| `keys of C` | `keys of [1, 2, 3] // [0, 1, 2]` | |
| `sublist of C from S [to E]` | `sublist of [1, 2, 3, 4, 5] from 1 to 3 // [2, 3]` | start inclusive, end exclusive |
| `length of S` | `length of "Hello, world! 👋" // 15` | Counts Unicode characters; converts non-strings (`length of 123 // 3`). No `the` form documented. |
| `this week` / `this month` / `this year` | `this year // 2026` | Uses app time zone and locale. |
| `number of <unit> between A and B` | `number of days between "2026-08-01" and "2026-08-15" // 14` | Whole units; negative if A > B; start inclusive, end exclusive. |

Collection macros convert elements to numbers where needed. Elapsed-time units: `days`, `weeks`,
`weekdays`, `weekend days`, `months`, `years`, `hours`, `minutes`, `seconds`,
`milliseconds`/`millis`, `microseconds`/`micros`, `nanoseconds`/`nanos` (literal words only).

## Modifiers

Order/mode/style/type words are literal keywords, never expressions.

| Modifier | Example | Options |
|---|---|---|
| `C without duplicates` | `["a", "b", "a"] without duplicates // ["a", "b"]` | Maps: values deduplicated, first key kept. |
| `C sorted [order] [mode]` | `[1, 3, 2] sorted descending`; `["a", "10", "2"] sorted numerical` | Order: `ascending` (default), `descending`. Mode: `alphabetical`, `alphanumerical`, `numerical`. Non-comparable elements error. |
| `X at T` (set time) | `today at "12:00"`, `today at 12` | Converts local values to an instant in the app time zone. |
| `N rounded [mode]` | `10.5 rounded // 11`; `10.5 rounded down // 10` | Modes: `up` (default, away from zero), `down`, `half up`, `half down`, `half even`, `half odd`. |
| `N rounded with scale of K` | `10.136 rounded with scale of 2 // 10.14` | K = decimal places. Output type equals input type. |
| `X as <type>` (cast) | `"2019-01-01" as date` | `boolean`, `string`, `number`, `integer`, `decimal`, `float`, `collection`, `time`, `date`, `datetime`. |
| `S in <style> case` | `user's name in title case` | `lower`, `upper`, `title`, `sentence`. |
| `S replacing P with R` | `"Hello World" replacing "World" with "CQL"` | P may be a regex: `" a " replacing ~/^\s+\|\s+$/ with ""`. |
| `S replacing [the] <ordinal> occurrence of P with R` | `"Hello World" replacing the first occurrence of "l" with "1"` | Ordinal or word (`first`, `second`, ...), counted from the start. |
| `S replacing occurrence <int> of P with R` | `"Hello World" replacing occurrence -2 of "l" with "1"` | Zero-based; negative counts from the end; out of range leaves S unchanged. |
| `S replacing P from <offset> with R` | | Zero-based start offset. |

CQL infers grouping for macros followed by modifiers: `sum of [1.1, 2.2, 3.3] rounded up` rounds
the sum (result `7`).

## Sources

- https://docs.croct.com/reference/cql/expressions/tests/comparison/equal.md
- https://docs.croct.com/reference/cql/expressions/tests/comparison/greater-than.md
- https://docs.croct.com/reference/cql/expressions/tests/comparison/greater-than-or-equal.md
- https://docs.croct.com/reference/cql/expressions/tests/comparison/less-than.md
- https://docs.croct.com/reference/cql/expressions/tests/comparison/less-than-or-equal.md
- https://docs.croct.com/reference/cql/expressions/tests/comparison/between.md
- https://docs.croct.com/reference/cql/expressions/tests/string/starts-with.md
- https://docs.croct.com/reference/cql/expressions/tests/string/ends-with.md
- https://docs.croct.com/reference/cql/expressions/tests/string/like.md
- https://docs.croct.com/reference/cql/expressions/tests/string/matches.md
- https://docs.croct.com/reference/cql/expressions/tests/collection/contains.md
- https://docs.croct.com/reference/cql/expressions/tests/collection/in.md
- https://docs.croct.com/reference/cql/expressions/tests/collection/contains-all.md
- https://docs.croct.com/reference/cql/expressions/tests/collection/contains-either.md
- https://docs.croct.com/reference/cql/expressions/tests/collection/contains-neither.md
- https://docs.croct.com/reference/cql/expressions/tests/collection/contains-none.md
- https://docs.croct.com/reference/cql/expressions/tests/date-time/before.md
- https://docs.croct.com/reference/cql/expressions/tests/date-time/after.md
- https://docs.croct.com/reference/cql/expressions/tests/date-time/at-time.md
- https://docs.croct.com/reference/cql/expressions/tests/user-session/returning.md
- https://docs.croct.com/reference/cql/expressions/tests/user-session/anonymous.md
- https://docs.croct.com/reference/cql/expressions/tests/user-session/identified.md
- https://docs.croct.com/reference/cql/expressions/tests/user-session/session-start.md
- https://docs.croct.com/reference/cql/expressions/tests/other/defined.md
- https://docs.croct.com/reference/cql/expressions/tests/other/empty.md
- https://docs.croct.com/reference/cql/expressions/operations/comparison/overview.md
- https://docs.croct.com/reference/cql/expressions/operations/comparison/equal.md
- https://docs.croct.com/reference/cql/expressions/operations/comparison/not-equal.md
- https://docs.croct.com/reference/cql/expressions/operations/comparison/greater-than.md
- https://docs.croct.com/reference/cql/expressions/operations/comparison/less-than.md
- https://docs.croct.com/reference/cql/expressions/operations/logical/overview.md
- https://docs.croct.com/reference/cql/expressions/operations/logical/and.md
- https://docs.croct.com/reference/cql/expressions/operations/logical/or.md
- https://docs.croct.com/reference/cql/expressions/operations/logical/not.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/overview.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/addition.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/subtraction.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/multiplication.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/division.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/modulo.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/exponentiation.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/minus.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/plus.md
- https://docs.croct.com/reference/cql/expressions/operations/arithmetic/percent.md
- https://docs.croct.com/reference/cql/expressions/operations/other/concatenation.md
- https://docs.croct.com/reference/cql/expressions/operations/other/fallback.md
- https://docs.croct.com/reference/cql/expressions/operations/other/range.md
- https://docs.croct.com/reference/cql/expressions/operations/other/spread.md
- https://docs.croct.com/reference/cql/expressions/quantifiers/logical/some.md
- https://docs.croct.com/reference/cql/expressions/quantifiers/logical/every.md
- https://docs.croct.com/reference/cql/expressions/quantifiers/logical/no.md
- https://docs.croct.com/reference/cql/expressions/quantifiers/logical/not-every.md
- https://docs.croct.com/reference/cql/expressions/quantifiers/numerical/at-least.md
- https://docs.croct.com/reference/cql/expressions/quantifiers/numerical/at-most.md
- https://docs.croct.com/reference/cql/expressions/quantifiers/numerical/exactly.md
- https://docs.croct.com/reference/cql/expressions/macros/collection/count.md
- https://docs.croct.com/reference/cql/expressions/macros/collection/sum.md
- https://docs.croct.com/reference/cql/expressions/macros/collection/average.md
- https://docs.croct.com/reference/cql/expressions/macros/collection/minimum.md
- https://docs.croct.com/reference/cql/expressions/macros/collection/maximum.md
- https://docs.croct.com/reference/cql/expressions/macros/collection/first-element.md
- https://docs.croct.com/reference/cql/expressions/macros/collection/last-element.md
- https://docs.croct.com/reference/cql/expressions/macros/collection/keys.md
- https://docs.croct.com/reference/cql/expressions/macros/collection/sublist.md
- https://docs.croct.com/reference/cql/expressions/macros/string/length.md
- https://docs.croct.com/reference/cql/expressions/macros/date-time/current-period.md
- https://docs.croct.com/reference/cql/expressions/macros/date-time/elapsed-time.md
- https://docs.croct.com/reference/cql/expressions/modifiers/collection/deduplicate.md
- https://docs.croct.com/reference/cql/expressions/modifiers/collection/sort.md
- https://docs.croct.com/reference/cql/expressions/modifiers/date-time/set-time.md
- https://docs.croct.com/reference/cql/expressions/modifiers/number/round.md
- https://docs.croct.com/reference/cql/expressions/modifiers/other/cast.md
- https://docs.croct.com/reference/cql/expressions/modifiers/string/change-case.md
- https://docs.croct.com/reference/cql/expressions/modifiers/string/replace.md
