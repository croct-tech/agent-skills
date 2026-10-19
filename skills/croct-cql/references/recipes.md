# Audience and query recipes

Ready-to-use expressions collected from the Croct audience examples and popular-audiences pages,
grouped by use case. Replace literal values with your own. Expressions marked **[Scale]** use event
expressions (Scale plan). Expressions marked **[track: X]** need event X or profile data from your
app, otherwise they never match.

## Everyone

```cql
true
```

Give the experience the lowest priority.

## Combining criteria

```cql
location's state's code is "NY" and cart's total is greater than 100
campaign's name matches "remarketing" or user is returning
user is not returning
device's category is not "bot"
location's cityName is "New York" and today's weekday is "monday"
(no item in cart's items satisfies item's name matches "t-shirt") and user is returning
```

## Marketing campaign

`campaign` is the last campaign the user interacted with (UTM-compatible).

```cql
campaign's name is "Winter Sale"
campaign's name matches "sale"
campaign's source is "google"
campaign's medium is "cpc"
campaign's medium is "email"
campaign's term is "sweater"
campaign's term matches "personalization"
campaign's content is "main-banner"
campaign's content matches "discount"
```

```cql
user has viewed a campaign in the last 30 days                     // [Scale]
user has viewed campaign with name "Optimize" at least 2 times     // [Scale]
```

## Location

Country codes are ISO 3166-1 alpha-2 and region codes ISO 3166-2, both **upper case**; string
comparison is case-sensitive.

```cql
location's continentCode is "NA"
location's countryCode is "US"
location's countryName is "United States"
location's stateCode is "CA"                       // `regionCode` is equivalent
location's stateName is "California"
location's state's code is in ["NY", "CA"]
location's cityName is "San Francisco"
location's city's name is in ["New York", "Los Angeles"]
location's tags contains "beach"
location's currencyCode is "EUR"
```

## Technology

```cql
device's category is "mobile"                      // desktop, tablet, mobile, bot, other, unknown
device's category is not "bot"
device's vendor is "Apple"
device's name matches "iPhone"
property name of device's os is "Windows"
browser's name is "Chrome"
browser's type is not "crawler"
```

## Date and time

`now`, `today`, `yesterday` make the audience unestimable but work at runtime.

```cql
today's weekday is "monday"
today as string is "2023-04-08"
today is between yesterday and tomorrow
```

Derived examples (valid CQL built from the documented date properties and tests, not copied from
the docs):

```cql
today is between "2026-11-27" as date and "2026-11-30" as date
now's hour >= 9 and now's hour < 17
today's month is 12
```

`between` is inclusive by default, so `now's hour is between 9 and 17` matches until 17:59. Use
`>=`/`<` or add `exclusive` for business-hours windows.

Time zones: `now` and `today` are evaluated in the **application's** time zone, not the visitor's.
For visitor-local conditions, `context's timeZone` (the browser's) and `location's timeZone` are
readable, but the docs show no function to convert `now` into another time zone. For campaigns
that start, pause, or resume at a set time in the audience's time zone, use scheduling (see the
`croct-personalize-and-test` skill).

## Session activity

```cql
session is starting                                 // first page of the visit
user's stats' sessions is greater than 3
session's referrer is "https://www.google.com/"
session's referrer matches "google"
session's landingPage matches "first-purchase"
session's landingPage starts with "https://example.com/promo"
session's landingPage ends with "/promo"
session's duration > 5 minutes and session's stats' orders is 0
session's stats' pageviews > 3
some entry in session's audiences satisfies entry's customId is "returning-users"
```

## Visited pages (current page)

```cql
page's path is "/pricing"
page's path is in ["/home", "/about", "/contact"]
page's path matches "/products"
page's path starts with "/blog/"
page's url matches "/pricing"
page's referrer starts with "https://example.com"
page's query's newsletter is "daily-news"           // ?newsletter=daily-news
page.query['coupon-code'] is "10off"                 // non-identifier parameter names
page's query's utm_term is defined                   // parameter present, any value
```

Past page views (history) **[Scale]**:

```cql
user has viewed a page with url "https://example.com/pricing"
user has viewed a page with url like "pricing" at least 2 times this week
```

## User profile and attributes

**[track: profile attributes]** for everything except `user's stats`.

```cql
user is returning
user is not returning
user's age is between 17 and 30
user's age is greater than 21
user's email is not known
user's company is defined
user's jobTitle matches "Engineer"
user's plan is "premium"                             // custom attribute
user's score > 10                                    // custom attribute
user's address's country is "US"
```

Identification **[track: User signed in, User signed up, User signed out]**:

```cql
user is anonymous
user is identified
user has signed up                                   // [Scale]
user has signed in at least 3 times this month       // [Scale]
```

## Interests and activities

Profile sets **[track: interests via Interest shown; activities via profile changes]**:

```cql
user's interests contains "marketing"
user's interests contains either ["marketing", "sales"]
user's interests contains all of ["marketing", "sales"]
user's interests contains neither ["marketing", "sales"]
user's activities includes "login"
some activity in user's activities satisfies activity matches "login"
```

Interest history **[Scale]** **[track: Interest shown]**:

```cql
user has shown interest in ["shoes", "clothes"]
user has not shown interest in "clothes"
user has shown interest in "shoes" yesterday
```

## Goals and custom events

**[Scale]** **[track: Goal completed / Event occurred]**:

```cql
user has completed goal "checkout-started"
user has completed goal "cta-clicked" exactly 3 times
user has completed goal "demo-requested" last session
user has experienced a custom event "newsletter-joined"
user has experienced a custom event "product-rated" with details.rating 5
user has become a lead
```

## Shopping cart (current state)

**[track: Cart viewed, Cart modified, Checkout started]**:

```cql
cart is empty
cart's stage is "checkout"
cart's total is greater than 100
cart's total is between 100 and 150
cart's subtotal is less than 100                     // e.g. "add $X for free shipping"
cart's coupon is "new-year"
count of cart's items is greater than 3
some item in cart's items satisfies item's name matches "t-shirt"
no item in cart's items satisfies item's name matches "t-shirt"
some item in cart's items satisfies item's brand is "Apple"
at least 2 of any distinct item in cart's items satisfies item's category is "Electronics"
sum of cart.items[*].quantity is greater than 5
```

Abandonment history **[Scale]**:

```cql
user has abandoned a cart at least 2 times
user has abandoned a cart with subtotal greater than 50 last week
user has abandoned a product yesterday
user has abandoned a product with coupon "10OFF"
```

## Orders and purchases

**[track: Order placed]**:

```cql
user's stats' orders is 0                            // never purchased
user's stats' orders is not 0                        // has purchased
user's stats' orders >= 5
user has placed an order in last 30 days             // [Scale]
user has ordered a product with category "Beauty" at least 2 times last month   // [Scale]
user has ordered a product exactly 3 times           // [Scale]
```

## Experiences and experiments already seen

```cql
some entry in session's experiments satisfies entry's variantName is "Variant A"
some entry in session's experiences satisfies entry's name is "Personalized welcome"
user has matched audience "new-user" yesterday       // [Scale]
```

Mixing `'s` with brackets needs parentheses (`(cart's items)[1st]`); dot notation avoids it
(`cart.items[*].quantity`).

## Value queries (SDK `evaluate`, dynamic values)

Queries do not have to return booleans.

```cql
user's firstName or else "there"                     // greeting with fallback
user's name in title case
"Hello, " & (location's cityName or else "friend") & "!"
location's cityName
count of cart's items
max of cart.items[*].displayPrice or else 0
number of days between session's start and now
```

Tiered discount from order history:

```cql
let orders = user's stats' orders or else 0;
20% if orders >= 10 else (10% if orders >= 5 else 5%)
```

Membership check against values passed from the app as evaluation attributes:

```cql
context's countries include location's countryName
```

## Sources

- https://docs.croct.com/explanation/audience/introduction.md
- https://docs.croct.com/explanation/audience/popular-audiences.md
- https://docs.croct.com/explanation/audience/examples/all-users.md
- https://docs.croct.com/explanation/audience/examples/date-time.md
- https://docs.croct.com/explanation/audience/examples/geolocation.md
- https://docs.croct.com/explanation/audience/examples/marketing-campaign.md
- https://docs.croct.com/explanation/audience/examples/multiple-conditions.md
- https://docs.croct.com/explanation/audience/examples/session-activity.md
- https://docs.croct.com/explanation/audience/examples/shopping-cart.md
- https://docs.croct.com/explanation/audience/examples/technology.md
- https://docs.croct.com/explanation/audience/examples/user-attributes.md
- https://docs.croct.com/explanation/audience/examples/visited-pages.md
- https://docs.croct.com/reference/cql/context.md
- https://docs.croct.com/reference/cql/expressions/conditionals.md
- https://docs.croct.com/reference/sdk/javascript/query-evaluation.md
- https://docs.croct.com/reference/cql/expressions/tests/comparison/between.md
- https://docs.croct.com/reference/cql/data-types/date-time/date-time.md
