# Analytics and CRM: Google Tag Manager, Microsoft Clarity, HubSpot forms

All three need the Croct SDK on the page. The snippets use the global `croct` instance of the
JavaScript SDK.

## Google Tag Manager (data layer → Croct)

Hooks into `window.dataLayer` and forwards the GA4 recommended events your site already pushes.

- Every supported event records a `goalCompleted` with goal ID `data-layer-` + event name, underscores
  replaced with hyphens: `purchase` → `data-layer-purchase`, `view_item` → `data-layer-view-item`.
- Events with a dedicated Croct event are also tracked with their details.

| Data layer event   | Croct event                                                    |
|--------------------|----------------------------------------------------------------|
| `view_item`        | `productViewed`                                                |
| `view_cart`        | `cartViewed`                                                   |
| `begin_checkout`   | `checkoutStarted`                                              |
| `purchase`         | `orderPlaced`                                                  |
| `search`           | `eventOccurred`, details `searchTerm`                          |
| `add_to_wishlist`  | `eventOccurred`, details `id`, `name`, `category`, `brand`, `variant` |
| `login`, `sign_up`, `add_payment_info`, `add_shipping_info`, `close_convert_lead`, `generate_lead`, `qualify_lead`, `working_lead` | Conversion only |

Cart and order events require a currency; when the data layer event has none, the integration uses
GA4's default, `USD`. Make sure the site pushes `currency` if the store is not in USD.

Prerequisites: SDK installed, a GTM container on the site, events pushed to the data layer.

```html
<script src="https://cdn.croct.io/plug-integration/google-tag-manager.js"></script>
```

Load order does not matter: the script replays events already in the data layer. Loading early only
makes the earliest events arrive in real time. Or inject it as a GTM Custom HTML tag named
`Send data layer events to Croct` (recipe in SKILL.md).

Verify: trigger a product view, search, or checkout; confirm conversions on the conversion dashboard.

## Microsoft Clarity (Croct → Clarity)

Sets Clarity custom tags with Croct segmentation so recordings and heatmaps can be filtered by it.
Tags refresh on every pageview, including in single-page apps.

| Tag                 | Value                                                              |
|---------------------|--------------------------------------------------------------------|
| `croct_experiences` | Names of experiences that impacted the session.                    |
| `croct_audiences`   | Names of audiences from experiences the user fits.                 |
| `croct_experiments` | Each running experiment's name and the variant assigned.           |

Each tag holds the full list of values. After setting tags, the script tracks an `eventOccurred`
named `ClarityTagsSet`.

Prerequisites: SDK installed and the Clarity tracking code on the site. Load order does not matter;
the script waits for Clarity.

```html
<script src="https://cdn.croct.io/plug-integration/clarity.js"></script>
```

Or inject via GTM, tag name `Send Croct data to Clarity`.

Verify: browse pages with an active experience; in Clarity > Recordings filter by the `croct_*` tags
(recordings can take minutes to appear); look for `ClarityTagsSet` in the profile Timeline.

## HubSpot forms

Covers both legacy forms (`hbspt.forms.create`) and new forms (`hs-form-frame` embed). Three
independent features; implement the ones the user needs.

### Track submissions as goals

Global event (both form types). Register **before** the HubSpot form script loads:

```js
window.addEventListener(
  'hs-form-event:on-submission:success',
  function() {
    croct.track('goalCompleted', {
      goalId: 'form-submission',
    });
  },
);
```

Legacy forms can use the callback instead:

```js
hbspt.forms.create({
  portalId: 'YOUR_HUBSPOT_ACCOUNT_ID',
  formId: 'YOUR_HUBSPOT_FORM_ID',
  onFormSubmitted: function() {
    croct.track('goalCompleted', {
      goalId: 'form-submission',
    });
  },
});
```

`goalCompleted` also accepts `value` and `currency`.

To record submissions **as leads** (populating lead widgets), also track `leadGenerated` in the same
handler; see the `croct-track-events` skill for its payload. The HubSpot page itself only shows
`goalCompleted`; the Mutiny migration guide recommends tracking `leadGenerated` alongside goals.

### Enrich the profile with field values

New forms (field names are prefixed, for example `0-1/email`):

```js
window.addEventListener(
  'hs-form-event:on-submission:success',
  async function(event) {
    var fieldValues = await HubSpotFormsV4
      .getFormFromEvent(event)
      .getFormFieldValues();

    var values = Object.fromEntries(
      fieldValues.map(item => [item.name, item.value])
    );

    croct.user.edit()
      .set('firstName', values['0-1/firstname'])
      .set('lastName', values['0-1/lastname'])
      .set('email', values['0-1/email'])
      .set('company', values['0-1/company'])
      .save();
  },
);
```

Legacy forms:

```js
hbspt.forms.create({
  portalId: 'YOUR_HUBSPOT_ACCOUNT_ID',
  formId: 'YOUR_HUBSPOT_FORM_ID',
  onFormSubmitted: function($form, data) {
    var values = data.submissionValues;

    croct.user.edit()
      .set('firstName', values.firstname)
      .set('lastName', values.lastname)
      .set('email', values.email)
      .set('company', values.company)
      .save();
  },
});
```

Adapt the field names to the user's form and map them to standard attributes where one exists,
otherwise to `custom.*` attributes.

### Test or personalize which form renders

Store the form ID in a slot so an AB test or experience can swap forms without code changes.

1. Create a component `hubspot-form` with one attribute: `formId`, plain text, required.
2. Create a slot `hubspot-form` using that component; set its default content to the form ID in use.
3. Add it to the project: `croct add slot hubspot-form`.
4. Render the form from the slot content.

The docs' render snippets use `await` at the top level of a script. That only works in a module
script, so use `type="module"` (or wrap the code in an async function).

New forms:

```html
<div id="hubspot-form" data-portal-id="YOUR_HUBSPOT_ACCOUNT_ID" class="hs-form-frame"></div>
<script type="module">
  var {content} = await croct.fetch('hubspot-form');

  document.getElementById('hubspot-form')
    .setAttribute('data-form-id', content.formId);

  var script = document.createElement('script');
  script.src = 'https://js.hsforms.net/forms/embed/YOUR_HUBSPOT_ACCOUNT_ID.js';
  document.body.appendChild(script);
</script>
```

Legacy forms:

```html
<script charset="utf-8" type="text/javascript" src="//js.hsforms.net/forms/embed/v2.js"></script>
<script type="module">
  var {content} = await croct.fetch('hubspot-form');

  hbspt.forms.create({
    portalId: 'YOUR_HUBSPOT_ACCOUNT_ID',
    formId: content.formId,
  });
</script>
```

To combine all three features: register the submission listener first (goal plus profile edit in one
handler), then render the form from the slot. With legacy forms, put the goal and profile edit inside
`onFormSubmitted` of the `hbspt.forms.create` call that uses `content.formId`.

## Sources

- https://docs.croct.com/immersion/integrations/analytics/google-tag-manager.md
- https://docs.croct.com/immersion/integrations/analytics/clarity.md
- https://docs.croct.com/immersion/integrations/crm/hubspot-forms.md
- https://docs.croct.com/immersion/tutorials/migrations/mutiny.md
