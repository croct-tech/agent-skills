# Event types

Every built-in Croct event, with the input properties you pass to `croct.track(name, payload)`
and the processed properties the platform stores. All examples use `@croct/plug`; in React or
Next.js client components, get the same instance with `const croct = useCroct()`.

Types use the docs' notation. "Required" = not marked optional in the docs.

## Contents

- [Event envelope](#event-envelope)
- [Shared shapes: product, cart, order](#shared-shapes)
- [Manually tracked events](#manually-tracked-events): goalCompleted, eventOccurred,
  interestShown, leadGenerated, userSignedUp, productViewed, postViewed, linkOpened, cartViewed,
  cartModified, checkoutStarted, orderPlaced
- [Automatically tracked events](#automatically-tracked-events)
- [Data types](#data-types): campaign, client, location, session

## Event envelope

Every stored event has:

| Property | Type | Notes |
|---|---|---|
| `sessionId` | `string` (UUID) | Assigned per the application's session expiration policy. |
| `userId` | `string` (UUID) | Croct's internal user ID, stable per the anonymity scope. **Not** the ID you pass to `identify`. |
| `timestamp` | `number` | Milliseconds since the Unix epoch. |
| `context` | `EventContext` | `type: 'web'` or `'server'`. |
| `payload` | `EventPayload` | `type` is the event name plus the processed properties. |

Web context: `url` (string), `tabId` (UUID, stable across reloads), `timeZone` (IANA, optional),
`metadata` (`Record<string,string>`, optional). Server context: `metadata` only.

`metadata` comes from the `eventMetadata` option of `croct.plug`: up to 5 entries, keys up to 20
chars (letter or underscore first, then letters, digits, underscores), string values up to 300
chars. Typical use: `{appVersion: '1.2.3'}`.

## Shared shapes

### Product

| Property | Type | Required | Constraint |
|---|---|---|---|
| `productId` | `string` | yes | 1-50 chars |
| `sku` | `string` | no | 1-50 chars |
| `name` | `string` | yes | 1-200 chars |
| `category` | `string` | no | 1-100 chars |
| `brand` | `string` | no | 1-100 chars |
| `variant` | `string` | no | 1-50 chars (size, color, style) |
| `currency` | `string` | no | ISO 4217 recommended |
| `displayPrice` | `number` | yes | >= 0 |
| `originalPrice` | `number` | no | >= 0, price before discounts |
| `url` | `string` | no | product page URL |
| `imageUrl` | `string` | no | product image URL |

### Item (inside `cart.items` / `order.items`)

| Property | Type | Required | Constraint |
|---|---|---|---|
| `index` | `number` | yes | >= 0, unique in the cart; position, usually insertion order |
| `product` | Product | yes | |
| `quantity` | `number` | yes | >= 1 |
| `discount` | `number` | no | >= 0 |
| `coupon` | `string` | no | 1-50 chars |
| `total` | `number` | yes | >= 0, item total after discounts and adjustments |

### Cart (`cartViewed`, `cartModified`, `checkoutStarted`)

| Property | Type | Required | Constraint |
|---|---|---|---|
| `currency` | `string` | yes | ISO 4217 recommended (e.g. `USD`, ISO-like `XBT` for others) |
| `items` | `Array<Item>` | yes | |
| `subtotal` | `number` | no | >= 0, items incl. item promotions |
| `shippingPrice` | `number` | no | >= 0 |
| `taxes` | `object` | no | `{taxName: amount}`, name up to 50 chars, amount >= 0 |
| `costs` | `object` | no | `{costName: amount}`, name up to 50 chars, amount >= 0 |
| `discount` | `number` | no | >= 0, absolute cart discount |
| `coupon` | `string` | no | 1-50 chars |
| `total` | `number` | yes | >= 0, grand total incl. shipping and tax |
| `lastUpdateTime` | `number` | no | ms since epoch; defaults to the time you tracked the event |

Doc inconsistency: the property list places `lastUpdateTime` inside `cart`, but the "Full input"
examples on the cart event pages put it at the top level of the payload. Prefer the property
list (inside `cart`) and verify against the live page if it matters.

### Order (`orderPlaced`)

Same as Cart, minus `lastUpdateTime`, plus:

| Property | Type | Required | Constraint |
|---|---|---|---|
| `orderId` | `string` | yes | 1-50 chars |
| `paymentMethod` | `string` | no | 1-50 chars, e.g. `credit-card`, `paypal` |
| `installments` | `number` | no | >= 1 |
| `status` | `string` | no | `placed` (pending actions), `paid` (paid, pending actions), `completed` |

## Manually tracked events

### goalCompleted

Track when a user reaches a goal you measure (form submitted, signup, purchase). The only event
that feeds conversion widgets and experiment results.

| Property | Type | Required | Constraint |
|---|---|---|---|
| `goalId` | `string` | yes | 3-100 chars; letters, digits, `-`, `_`, `:`; starts and ends with a letter or digit |
| `currency` | `string` | no | ISO 4217 recommended |
| `value` | `number` | no | >= 0; monetary value, can be estimated (10% of $500 leads = 50) |

```js
croct.track('goalCompleted', {goalId: 'newsletter-subscription', value: 50, currency: 'USD'});
```

CQL: `user has completed goal "purchase" exactly 2 times today`.

### eventOccurred

A domain-specific event that has no built-in type.

| Property | Type | Required | Constraint |
|---|---|---|---|
| `name` | `string` | yes | 1-50 chars |
| `details` | `object` | no | up to 10 properties; keys up to 300 chars, letter or underscore first, then letters, digits, underscores; values: strings up to 300 chars, numbers, booleans, null |

```js
croct.track('eventOccurred', {name: 'product-rated', details: {rating: 5}});
```

CQL: `user has experienced a custom event "product-rated" with details.rating 5`.

### interestShown

Topics the user seems interested in (time on a page, category clicks, searches).

| Property | Type | Required | Constraint |
|---|---|---|---|
| `interests` | `Array<string>` | yes | up to 10 strings, 1-50 chars each |

```js
croct.track('interestShown', {interests: ['ab testing', 'analytics']});
```

CQL: `user has shown interest in "personalization"`.

### leadGenerated

Track when a user submits a form or otherwise becomes a lead.

| Property | Type | Required | Constraint |
|---|---|---|---|
| `leadId` | `string` | no | 1-100 chars, your ID for the lead |
| `currency` | `string` | no | ISO 4217 recommended |
| `value` | `number` | no | >= 0 |
| `lead` | `object` | no | user profile attributes (see `user-and-session.md`), including `custom` |

Processed: `leadId`, `currency`, `value`, `patch` (derived from `lead`, applied to the profile).

```js
croct.track('leadGenerated', {
  leadId: '1ed2fd65-a027-4f3a-a35f-c6dd97537392',
  lead: {firstName: 'Carol', lastName: 'Doe', email: 'carol@croct.com', custom: {source: 'homepage'}},
});
```

CQL: `user has become a lead`.

### userSignedUp

Track when a user creates an account. Creates the profile from `profile` if it does not exist;
existing profiles are not affected. If you log the user in right after signup, also identify
them (which emits `userSignedIn`).

| Property | Type | Required | Constraint |
|---|---|---|---|
| `userId` | `string` | yes | 1-100 chars, your user ID |
| `profile` | `object` | no | user profile attributes, including `custom` |

Processed: `externalUserId` (from `userId`), `patch` (from `profile`).

```js
croct.track('userSignedUp', {
  userId: '1ed2fd65-a027-4f3a-a35f-c6dd97537392',
  profile: {firstName: 'Carol', lastName: 'Doe', email: 'carol@croct.com', custom: {plan: 'pro'}},
});
croct.identify('1ed2fd65-a027-4f3a-a35f-c6dd97537392');
```

CQL: `user has signed up`.

### productViewed

Auto-tracked only when the page has schema.org Product structured data; otherwise track it.

| Property | Type | Required |
|---|---|---|
| `product` | Product | yes |

```js
croct.track('productViewed', {
  product: {productId: '12345', name: 'Black iPhone 12', displayPrice: 899.99, category: 'Smartphones'},
});
```

### postViewed

Auto-tracked only when the page has schema.org Article structured data; otherwise track it.

| Property | Type | Required | Constraint |
|---|---|---|---|
| `post.postId` | `string` | yes | 1-100 chars, usually the slug |
| `post.title` | `string` | yes | 1-100 chars |
| `post.publishTime` | `number` | yes | ms since epoch, >= 0 |
| `post.url` | `string` | no | |
| `post.tags` | `Array<string>` | no | up to 10, 1-50 chars each |
| `post.categories` | `Array<string>` | no | up to 10, 1-50 chars each |
| `post.authors` | `Array<string>` | no | up to 10, 1-50 chars each |
| `post.updateTime` | `number` | no | ms since epoch, >= 0 |

```js
croct.track('postViewed', {
  post: {postId: 'croct-launches-new-sdk', title: 'Croct launches new SDK', publishTime: 1499839200000, tags: ['dev-tools']},
});
```

### linkOpened

Auto-tracked when a user opens a link; track manually only for links the SDK cannot see.

| Property | Type | Required |
|---|---|---|
| `link` | `string` | yes |

```js
croct.track('linkOpened', {link: 'https://example.com/download/whitepaper.pdf'});
```

### cartViewed, cartModified, checkoutStarted

All three take `{cart: Cart}` and fuel the CQL `cart` variable. `checkoutStarted` additionally
accepts top-level `orderId` (`string`, optional, 1-50 chars). `cartViewed` and `cartModified`
also cause `cartAbandoned` and `productAbandoned` to be recorded when the session closes with an
active cart.

| Event | When |
|---|---|
| `cartViewed` | The user views the cart page or summary. |
| `cartModified` | Any add, remove, or update. Send the full current cart; you do not describe the change. |
| `checkoutStarted` | The user proceeds to checkout. |

```js
croct.track('cartModified', {
  cart: {
    currency: 'USD',
    total: 776.49,
    coupon: 'FREE-SHIPPING',
    items: [
      {index: 0, quantity: 1, total: 699.00, product: {productId: 'U42P8', name: 'Smartphone 9', displayPrice: 699.00}},
      {index: 1, quantity: 1, total: 77.49, product: {productId: 'A2B4C', name: 'Smartphone 9 case', displayPrice: 77.49}},
    ],
  },
});
```

CQL: `cart's coupon is "FREE-SHIPPING"`, `user has abandoned a cart with currency "USD"`.

### orderPlaced

Track once on successful order placement (typically the confirmation page). Records one
`productOrdered` per item, increments the profile's `stats.orders`, and feeds the Orders and
Revenue widgets. Pair with `goalCompleted` if purchases are an experiment KPI.

| Property | Type | Required |
|---|---|---|
| `order` | Order | yes |

```js
croct.track('orderPlaced', {
  order: {
    orderId: 'AXJH-1234',
    currency: 'USD',
    total: 899.99,
    status: 'paid',
    items: [
      {index: 0, quantity: 1, total: 899.99, product: {productId: '12345', name: 'Black iPhone 12', displayPrice: 899.99}},
    ],
  },
});
```

CQL: `user has placed an order`.

## Automatically tracked events

No input properties unless noted; the listed fields are processed properties.

| Event | Trigger | Processed properties |
|---|---|---|
| `userSignedIn` | `identify` / `setToken` | `externalUserId` |
| `userSignedOut` | `anonymize` / `unsetToken` / identity change | `externalUserId` |
| `userProfileChanged` | `user.edit().save()` | `externalUserId`, `patch` |
| `sessionAttributesChanged` | `session.edit().save()` | `patch` |

`patch` shape (from the `userProfileChanged` processed payload example):

```json
{
  "operations": [
    {"type": "set", "path": "custom.plan", "value": "free"},
    {"type": "combine", "path": "activities", "value": "sign-up"}
  ]
}
```

(The docs' own example has trailing commas, which are invalid JSON; the shape above removes them.)
| `sessionStarted` / `sessionClosed` | session lifecycle | `session` (Session) |
| `sessionMerged` | sessions merged | `session`, `mergedSessions` (oldest first) |
| `campaignDetected` | UTM parameters | `campaign` (Campaign) |
| `clientDetected` | automatic (device, OS, browser) | `client` (Client) |
| `locationDetected` | automatic (geolocation) | `location` (Location) |
| `audienceMatched` | user matches workspace audiences | `audiences` (IDs) |
| `tabOpened` | new tab | `tabId` |
| `tabUrlChanged` | URL change without reload (SPA) | `tabId`, `url` |
| `tabVisibilityChanged` | tab hidden/visible | `tabId`, `visibility` (`visible`/`hidden`) |
| `pageOpened` | every page access, even in the same tab | `url`, `userAgent`, `preferredLanguages`, `referrer` |
| `pageLoaded` | window `load` | `tabId`, `url`, `title`, `lastModifiedTime` |
| `linkOpened` | link opened | `link` |
| `userClicked` | click/tap, max one per 500ms | `point {x,y}`, `surfaceSize {width,height}` |
| `userScrolled` | 250ms after scrolling stops; direction reversal splits gestures | `start {x,y}`, `end {x,y}`, `surfaceSize`, `viewportSize` |
| `nothingChanged` | 30s inactivity, decreasing frequency, max 4/hour | `sinceTime` |
| `slotPersonalized` | content fetched for a slot | `personalization {slotId, slotVersion, contentId, experienceId?, audienceId?, assignedVariant?}` |
| `productOrdered` | per item of `orderPlaced` | `order` |
| `cartAbandoned` / `productAbandoned` | session closes with an active cart from `cartViewed`/`cartModified` | `cart` |

## Data types

**Campaign** (from UTM): `name`, `source`, `medium`, `content`, `term`, all optional strings.

**Client**: `device {name?, vendor?, category, operatingSystem {name?, version?}}` with
`category` in `desktop`, `tablet`, `mobile`, `bot`, `other`, `unknown`; `browser {name?,
version?, type}` with `type` in `web`, `in-app`, `crawler`, `other`, `unknown`.

**Location**: `continent` (`AF`, `AN`, `AS`, `EU`, `NA`, `OC`, `SA`), `country` (ISO 3166-1
alpha-2), `region {name, code?}`, `city`, `district`, `timeZone`, `coordinates {latitude,
longitude}`, `source` (`IP`, `GPS`, `BROWSER`, `INPUT`, `UNKNOWN`), `currency {name?, code?}`,
`phoneCode`, `population`, `postalCode` (may be approximate), `languages`, `tags` (e.g. `urban`,
`rural`, `business`, `tourism`, `mountain`; see the live page for the full list).

**Session**: `sessionId`, `userId`, `parentId` (session that superseded this one, usually on
identify), `externalUserId` (null when anonymous), `window {start, end}`, `closeTime`,
`referrer`, `landingPageUrl`, `campaign`, `location`, `client`, `attributes` (custom session
attributes), `statistics {pageViews, tabViews, orders}`.

## Sources

- https://docs.croct.com/reference/event/overview.md
- https://docs.croct.com/reference/event/types/ecommerce/cart-viewed.md
- https://docs.croct.com/reference/event/types/ecommerce/cart-modified.md
- https://docs.croct.com/reference/event/types/ecommerce/cart-abandoned.md
- https://docs.croct.com/reference/event/types/ecommerce/checkout-started.md
- https://docs.croct.com/reference/event/types/ecommerce/order-placed.md
- https://docs.croct.com/reference/event/types/ecommerce/product-viewed.md
- https://docs.croct.com/reference/event/types/ecommerce/product-ordered.md
- https://docs.croct.com/reference/event/types/ecommerce/product-abandoned.md
- https://docs.croct.com/reference/event/types/engagement/goal-completed.md
- https://docs.croct.com/reference/event/types/engagement/event-occurred.md
- https://docs.croct.com/reference/event/types/engagement/interest-shown.md
- https://docs.croct.com/reference/event/types/engagement/lead-generated.md
- https://docs.croct.com/reference/event/types/engagement/link-opened.md
- https://docs.croct.com/reference/event/types/engagement/post-viewed.md
- https://docs.croct.com/reference/event/types/engagement/nothing-changed.md
- https://docs.croct.com/reference/event/types/engagement/slot-personalized.md
- https://docs.croct.com/reference/event/types/engagement/user-clicked.md
- https://docs.croct.com/reference/event/types/engagement/user-scrolled.md
- https://docs.croct.com/reference/event/types/user-account/user-signed-up.md
- https://docs.croct.com/reference/event/types/user-account/user-signed-in.md
- https://docs.croct.com/reference/event/types/user-account/user-signed-out.md
- https://docs.croct.com/reference/event/types/user-account/user-profile-changed.md
- https://docs.croct.com/reference/event/types/session/session-started.md
- https://docs.croct.com/reference/event/types/session/session-merged.md
- https://docs.croct.com/reference/event/types/session/session-attributes-changed.md
- https://docs.croct.com/reference/event/types/web-browsing/page-opened.md
- https://docs.croct.com/reference/event/types/web-browsing/tab-visibility-changed.md
- https://docs.croct.com/reference/event/data-types/context.md
- https://docs.croct.com/reference/event/data-types/campaign.md
- https://docs.croct.com/reference/event/data-types/client.md
- https://docs.croct.com/reference/event/data-types/location.md
- https://docs.croct.com/reference/event/data-types/session.md
- https://docs.croct.com/reference/cql/expressions/events/event-types.md
- https://docs.croct.com/immersion/guides/tracking-events.md
