# E-commerce: Shopify and VTEX

## Pick the integration

| Store                                         | Content rendering                  | Storefront events                                      | Checkout and order events |
|-----------------------------------------------|------------------------------------|--------------------------------------------------------|---------------------------|
| Shopify Hydrogen (React Router 7 or Remix)    | Hydrogen SDK, in route loaders     | Hydrogen SDK, automatic via `<Analytics.Provider>`     | Shopify pixel             |
| Shopify Liquid theme (Online Store)           | JavaScript SDK                     | Google Tag Manager integration, if theme uses GTM/GA4  | Shopify pixel             |
| VTEX Store Framework (VTEX IO)                | Croct SDK                          | VTEX integration script                                | VTEX integration script   |
| VTEX FastStore                                | Croct SDK                          | Google Tag Manager integration, if events reach the data layer | Same                |

## Shopify Hydrogen

For the SDK itself (setup, loaders, fetching slots, API), load the `croct-integrate-sdk` skill.
This section covers only what the integration adds on top: storefront events, identity, and the
link to the pixel.

The Hydrogen SDK plugs into server-side rendering and Shopify's analytics pipeline:

- **Content:** fetch a slot in a route loader and render from loader data. Content ships in the
  initial server response, with no flicker.
- **Events:** once the Croct provider sits inside Shopify's `<Analytics.Provider>`, standard
  storefront events are forwarded automatically.
- **Identity:** with Shopify customer accounts, the logged-in customer is identified on every request.

Prerequisites: a Hydrogen storefront on React Router 7 or Remix, with Shopify's standard analytics
components in place.

```sh
npx croct@latest init                             # installs the SDK, wires provider and request context
npx croct@latest add slot home-hero@1 --example   # types plus a working example for a slot
```

Then fetch the slot in a loader. For manual setup and the SDK API, see the `croct-integrate-sdk`
skill or `https://docs.croct.com/reference/sdk/hydrogen/manual-installation.md`.

Automatic event mapping:

| Shopify analytics event    | Croct event     |
|----------------------------|-----------------|
| Product view               | `productViewed` |
| Cart view                  | `cartViewed`    |
| Cart update                | `cartModified`  |
| Collection and search view | `interestShown` |

With the default `auto` consent mode, the SDK tracks nothing until Shopify's Customer Privacy API
reports tracking is allowed. Track other events manually with the SDK instance. Checkouts and orders
happen on Shopify's checkout and need the **Shopify pixel**.

Verify: browse, add to cart, start a checkout, and sign in; then check the conversion dashboard and
that a profile reflects the identified customer. Demo: `https://github.com/croct-tech/croct-hydrogen-project`.

## Shopify pixel (checkouts, orders, any customer event)

Shopify's checkout runs no storefront scripts, so the SDK cannot see it. The pixel integration has two
parts:

- **Storefront plugin**: runs with the SDK and stores the application, client ID, user token, and tab
  in a first-party cookie the sandboxed pixel can read.
- **Custom pixel** in Shopify admin: reads that cookie and tracks events on the visitor's behalf, on
  the same profile and session.

The pixel only tracks visitors the plugin has seen on the storefront. A visitor opening checkout
directly (for example, from an abandoned-cart email) is skipped.

Automatic events: `checkout_started` → `checkoutStarted`; `checkout_completed` → `orderPlaced`.
Both carry items, totals, discounts, and shipping.

### 1. Add the plugin

Prerequisite: the Croct SDK on the storefront. On a Liquid theme that is the JavaScript SDK, for
example via the CDN in `layout/theme.liquid` (from the JavaScript SDK docs; replace the app ID):

```html
<script src="https://cdn.croct.io/js/v1/lib/plug.js"></script>
<script>croct.plug({appId: 'APPLICATION_ID'});</script>
```

On Hydrogen, use the Hydrogen SDK (see the `croct-integrate-sdk` skill).

**Liquid theme:** in `layout/theme.liquid`, right before `</head>` (Online Store > Themes > ⋯ > Edit code):

```html
<script src="https://cdn.croct.io/plug-integration/shopify-pixel.js" defer></script>
```

Load order does not matter; the plugin registers with the SDK whenever it loads.

**Hydrogen:** the SDK includes the plugin. Enable it and deploy:

```bash
# .env
PUBLIC_CROCT_SHOPIFY_PIXEL=true
```

The cookie is set on the domain shared by storefront and checkout, derived from Hydrogen's
`PUBLIC_CHECKOUT_DOMAIN` (for example, `checkout.example.com`). If that variable is absent, or to use
another domain, set `PUBLIC_CROCT_SHOPIFY_PIXEL_COOKIE_DOMAIN`.

Caution (Hydrogen): the checkout **must** be on a subdomain of the storefront domain. Because cookies are not
shared across unrelated domains, the integration does **not** work in local development or Oxygen
preview environments.

### 2. Create the custom pixel (same for Liquid and Hydrogen)

The user does this in Shopify admin: Settings > Customer events > Add custom pixel, name it `Croct`.
Under Customer privacy, either set Permission to **Required** with **Analytics** (runs only for
visitors who allow analytics) or **Not required** (runs for all). The user must decide based on the
privacy laws where they sell. Replace the editor code with:

```js
import('https://cdn.croct.io/plug-integration/shopify-pixel-tracker.js')
    .then(({croctPixel}) => croctPixel()({analytics, browser, init}));
```

Save, then **Connect**. The pixel takes the application ID from the plugin; nothing else to configure.

### Custom events and options

`croctPixel(options)` returns a factory; calling it returns an object whose `track` accepts the same
events and payloads as the SDK `track`, plus the Shopify event as an optional third argument (records
the event's page and time):

```js
import('https://cdn.croct.io/plug-integration/shopify-pixel-tracker.js')
    .then(({croctPixel}) => {
        const croct = croctPixel()({analytics, browser, init});

        analytics.subscribe('product_added_to_cart', event => {
            croct.track('goalCompleted', {goalId: 'add-to-cart'}, event);
        });
    });
```

| Option                        | Type    | Default | Description                                                         |
|-------------------------------|---------|---------|---------------------------------------------------------------------|
| `autoTracking.checkoutStarted` | boolean | `true`  | Track `checkoutStarted` automatically.                             |
| `autoTracking.orderPlaced`     | boolean | `true`  | Track `orderPlaced` automatically.                                 |
| `logger`                       | object  | console for warnings and errors | Custom logger with `debug`, `info`, `warn`, `error`. |

Verify: place a test order (Bogus Gateway or a provider test mode), then look for **Checkout started**
and **Order placed** in the profile's Timeline.

## VTEX (Store Framework / VTEX IO)

The script listens to the events the store already broadcasts. For each supported event it:

1. Records a `goalCompleted` conversion. Goal ID: drop the `vtex:` prefix, convert camelCase to
   kebab-case, prefix `vtex-`. Example: `vtex:productView` → `vtex-product-view`.
2. Tracks the matching Croct event when the payload has the details.
3. Enriches the profile when the payload has customer data.

| VTEX event                                   | Croct event       |
|----------------------------------------------|-------------------|
| `vtex:productView`                           | `productViewed`   |
| `vtex:cart`, `vtex:cartLoaded`, `vtex:cartChanged`, `vtex:addToCart`, `vtex:removeFromCart` | `cartModified` |
| `vtex:viewCart`                              | `cartViewed`      |
| `vtex:beginCheckout`                         | `checkoutStarted` |
| `vtex:orderPlaced`, `vtex:orderPlacedTracked` | `orderPlaced` (tracked once, even though VTEX reports it more than once) |
| `vtex:search`                                | `eventOccurred` named `vtex-search`, details `searchTerm` |
| `vtex:addToWishlist`                         | `eventOccurred` named `vtex-add-to-wishlist`, details `id`, `name`, `category`, `brand`, `variant` |
| `vtex:userData`, `vtex:login`, `vtex:signUp`, `vtex:addPaymentInfo`, `vtex:addShippingInfo`, `vtex:promoView`, `vtex:promotionClick` | Conversion only |

Profile enrichment (standard attributes):

| VTEX event                                    | Attributes                                |
|-----------------------------------------------|-------------------------------------------|
| `vtex:userData`                               | `firstName`, `lastName`, `email`, `phone` |
| `vtex:cart`, `vtex:cartLoaded`                | `firstName`, `lastName`, `email`, `address` |
| `vtex:orderPlaced`, `vtex:orderPlacedTracked` | `phone`, `address`                        |

Prerequisites: the Croct SDK running on the storefront. Install the script in `<head>` or `<body>`,
**as early as possible**; events broadcast before it loads are lost:

```html
<script src="https://cdn.croct.io/plug-integration/vtex.js"></script>
```

Or inject it through GTM (see the GTM tag recipe in SKILL.md), tag name `Send VTEX events to Croct`.

FastStore storefronts emit GA4-style events that this script ignores; use the Google Tag Manager
integration instead if those events reach the data layer.

Verify: view a product, add to cart, start checkout, sign in; check the conversion dashboard and the
profile's Attributes tab.

## Sources

- https://docs.croct.com/immersion/integrations/ecommerce/shopify.md
- https://docs.croct.com/immersion/integrations/ecommerce/shopify-pixel.md
- https://docs.croct.com/immersion/integrations/ecommerce/vtex.md
