# Event expressions

Conditions over the user's event history: "has the user done X, with these properties, this many
times, in this period?"

> **Plan**: event expressions and event criteria are available only on the **Scale plan**.

## Grammar

```cql
user has <event> [criteria] [quantifier] [window]
user has not <event> ...
```

Write the clauses in the documented order: criteria, then quantifier, then window.

```cql
user has viewed a product with name "Product One" at least 2 times this week
user has placed an order with currency "USD" exactly 2 times today
user has experienced a custom event "product-rated" with details.rating 5 at least 2 times last month
```

There is no "added to cart" expression. `user has abandoned a product` covers products the user
viewed or added to the cart without purchasing before the session ended; to exclude buyers, combine
with `user has placed an order` / `user has ordered a product`.

Articles (`a`, `an`) are optional where shown (`user has viewed a page` == `user has viewed page`).

Matching a specific page:

- Page views only have `url` and `referrer` criteria; there is no `path`. Match on `url`.
- `like` is a case-insensitive "equal to or contains" test, so `url like "/pricing"` also matches
  `/pricing-faq`. Prefer a more specific value, or `ending with` (case-sensitive). The docs do not
  say whether `url` includes the query string, so `ending with` may miss URLs with parameters.
- Counting views of one page requires event expressions, a Scale plan feature. Without it,
  `session's stats' pageviews` only counts page views across all pages.

## Event types

| Expression | Based on event | Criteria properties | Event your app must send |
|---|---|---|---|
| `user has viewed a page` | Page opened | `url`, `referrer` (no `path`) | None: page views are tracked automatically |
| `user has viewed a campaign` | Campaign params in page views | `name`, `source`, `medium`, `content`, `term` | None: read from campaign parameters in page views |
| `user has viewed a product` | Product viewed | `id`, `sku`, `name`, `category`, `brand`, `variant`, `displayPrice`, `originalPrice`, `url`, `imageUrl` | Product viewed |
| `user has viewed a post` | Post viewed | `id`, `title`, `publishTime`, `url`, `tags`, `categories`, `authors` | Post viewed |
| `user has opened a link "<url>"` | Link opened | `path`, `query`, `anchor` | Link opened |
| `user has abandoned a cart` | Cart abandoned | `currency`, `subtotal`, `shippingPrice`, `taxes`, `costs`, `discount`, `coupon`, `total` | Cart modified or Cart viewed |
| `user has abandoned a product` | Product abandoned | `index`, `quantity`, `discount`, `coupon`, `total`, plus product fields (`id`, `sku`, `name`, `category`, `brand`, `variant`, `displayPrice`, `originalPrice`, `url`, `imageUrl`) | Cart modified or Cart viewed |
| `user has placed an order` | Order placed | `id`, `currency`, `subtotal`, `shippingPrice`, `paymentMethod`, `installments`, `status` (`placed`, `paid`, `completed`), `taxes`, `costs`, `discount`, `coupon`, `total` | Order placed |
| `user has ordered a product` | Product ordered (one per order item) | Same as product abandoned | Order placed |
| `user has completed goal "<id>"` | Goal completed | none | Goal completed |
| `user has shown interest in <topic or list>` | Interest shown | none | Interest shown |
| `user has experienced a custom event "<name>"` | Event occurred | `details` (object, e.g. `details.rating`) | Event occurred |
| `user has matched audience <id or list>` | Audience matched | none | Not stated in the docs |
| `user has become a lead` | Lead generated | `id` | Lead generated |
| `user has signed in` | User signed in | none | User signed in |
| `user has signed up` | User signed up | none | User signed up |

Notes:

- Pages marked "Tracking required" say the expression always evaluates to false without the
  event: cart abandoned, product abandoned, order placed, product ordered, goal completed,
  interest shown, custom event, lead generated, signed in, signed up.
- A cart (and its items) is marked abandoned when the session ends with items added but no
  purchase. A product counts as abandoned when viewed or added to the cart without purchase
  before the session ends.
- Interest and audience expressions accept a single string or a list (matches if any):
  `user has shown interest in ["personalization", "analytics"]`,
  `user has matched audiences ["new-user", "returning-user"]`.
- Audience-matched negation is documented as `user has not matched audience in "new-user"`.
- Event types without criteria properties (goal, interest, audience, signed in, signed up) only
  take quantifier and window.

## Criteria

```cql
with <property> <operator> <value>
with <property> <value>            // operator omitted = equal to
```

Combine conditions:

```cql
user has viewed a product with name "Product One", sku "1234", displayPrice 100   // commas = and
user has viewed a product with name "Product One" or with sku "1234"
user has viewed a product (with name "Product One" or with name "Product Two"), with brand "Brand"
```

Nested properties: `with cart.costs.packaging greater than 2`, `with packaging of cart's costs
greater than 2`, or possessive `with packaging of property costs of cart greater than 2`.
Custom event details: `with details.rating 5`.

### Criteria operators

| Operator | Negation | Notes | Example |
|---|---|---|---|
| `equal to` / `==` / omitted | `not equal to` / `!=` | | `user has viewed campaign with term equal to "running shoes"` |
| `greater than` / `>` | `not greater than` | Numbers, strings, dates | `user has abandoned a cart with subtotal greater than 50` |
| `greater than or equal to` / `>=` | `not greater than or equal to` | | `user has abandoned a product with displayPrice >= 100` |
| `less than` / `<` | `not less than` | | `user has abandoned a product with displayPrice less than 100` |
| `less than or equal to` / `<=` | `not less than or equal to` | | |
| `starting with` | `not starting with` | Case-sensitive | `user has viewed campaign with name starting with "Optimize"` |
| `ending with` | `not ending with` | Case-sensitive | `user has viewed campaign with name ending with "Pro"` |
| `like` | `not like` | Case-insensitive substring | `user has abandoned a product with name like "smart"` |
| `in` (value first) | `not in` | | `user has viewed post with "news" in tags` |
| `containing` / `including` | `not containing` | Collection has element | `user has viewed post with tags containing "news"` |
| `containing all of` / `including all of` | `not containing all of` | True if list empty | `user has viewed post with tags containing all of ["sport", "summer"]` |
| `containing either` / `including either` | `not containing either` | False if list empty | `user has viewed post with tags containing either ["news", "cases"]` |
| `containing neither` / `including neither` | `not containing neither` | True if list empty | `user has viewed post with tags containing neither ["news", "cases"]` |
| `containing none of` / `including none of` | `not containing none of` | Docs say true if list empty (the `contains none` test says false) | `user has viewed post with tags containing none of ["summer", "sport"]` |

## Quantifier (event count)

| Quantifier | Meaning |
|---|---|
| `exactly N times` | Exactly N occurrences |
| `at least N times` | N or more |
| `at most N times` | N or fewer |

`time` and `times` are interchangeable: `user has viewed a page with url like "support" at most 1 time`.

## Time window

| Window | Matches events |
|---|---|
| `today`, `yesterday` | On that calendar day |
| `this week`, `this month`, `this year` | In the current calendar period |
| `last week`, `last month`, `last year` | In the previous calendar period |
| `this session` | In the current SDK session |
| `last session` | In the last closed session |
| `in last <duration>` / `in the last <duration>` | Within a custom duration, e.g. `in last 5 days` |

```cql
user has completed goal "checkout-started" last session
user has placed an order in last 5 days
user has viewed a product this session
```

## Event expressions vs. profile and session data

| Need | Use |
|---|---|
| Ever ordered / order count, no filters | `user's stats' orders is not 0` (no event expression needed) |
| Ordered in the last 5 days, or with a coupon | `user has placed an order in last 5 days` |
| Current cart state | `cart's ...` variables |
| Past abandoned carts | `user has abandoned a cart ...` |
| Current interests set | `user's interests contains "x"` |
| When or how often interest was shown | `user has shown interest in "x" yesterday` |

## Sources

- https://docs.croct.com/reference/cql/expressions/events/overview.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/overview.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/equal-to.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/greater-than.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/greater-than-or-equal.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/less-than.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/less-than-or-equal.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/starting-with.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/ending-with.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/like.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/in.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/containing.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/containing-all.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/containing-either.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/containing-neither.md
- https://docs.croct.com/reference/cql/expressions/events/criteria/operators/containing-none.md
- https://docs.croct.com/reference/cql/expressions/events/quantifier.md
- https://docs.croct.com/reference/cql/expressions/events/time-window.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/audience-matched.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/campaign-viewed.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/cart-abandoned.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/event-experienced.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/goal-completed.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/interest-shown.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/lead-generated.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/link-opened.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/order-placed.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/page-viewed.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/post-viewed.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/product-abandoned.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/product-ordered.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/product-viewed.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/signed-in.md
- https://docs.croct.com/reference/cql/expressions/events/event-types/signed-up.md
