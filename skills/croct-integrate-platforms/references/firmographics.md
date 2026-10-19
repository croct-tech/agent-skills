# Firmographics: 6sense, Demandbase, Clearbit, ZoomInfo

Each integration copies the company a provider resolved for an anonymous visitor into the Croct user
profile, where audiences (CQL) can target it.

| Provider   | Install                                         | Prerequisite on site                                         | Attribute layout                     | Event                       |
|------------|-------------------------------------------------|--------------------------------------------------------------|--------------------------------------|-----------------------------|
| 6sense     | Croct script (`6sense.js`) via tag or GTM       | 6sense Website Tag                                           | `custom.firmographics.*` (rich)      | `6senseDataRetrieved`       |
| Demandbase | Croct script (`demandbase.js`) via tag or GTM   | Demandbase Tag                                               | `custom.firmographics.*` (rich)      | `DemandbaseDataRetrieved`   |
| Clearbit   | Callback code you add to the Reveal GTM tag     | Clearbit Reveal                                              | Flat `custom.*` you choose           | `ClearbitDataRetrieved`     |
| ZoomInfo   | Custom HTML GTM tag reading local storage       | ZoomInfo WebSights with **Website Personalization** on       | Flat `custom.*` you choose           | Custom (see below)          |

Rules for all four:

- **Data is usually not available on the first pageview.** Providers take a moment to resolve the
  visitor. Plan account-based experiences to activate on later pageviews; target first impressions on
  campaign, referrer, or location.
- Company name and domain go to standard attributes `company` and `companyUrl`; everything else is a
  custom attribute.
- In CQL, custom attributes are read **without** the `custom` prefix: `custom.firmographics.profile.industry`
  becomes `user's firmographics's profile's industry`; `custom.industry` becomes `user's industry`.
- Custom attribute limits: at most 10 custom attributes per profile; names up to 20 characters
  (letter or underscore first, then letters, digits, underscores; case-insensitive); strings up to 100
  characters; lists and maps up to 10 elements. Keep this in mind when adding fields to the
  Clearbit or ZoomInfo payloads.
- Verify in the admin app: Profiles, filter by **Custom attributes** or **Work info**, open a profile,
  check the Attributes tab (and the Timeline for the event).

## 6sense

```html
<script src="https://cdn.croct.io/plug-integration/6sense.js"></script>
```

Add to `<head>` or `<body>`, or as a GTM Custom HTML tag named `Send 6sense data to Croct` with
trigger `Initialization - All Pages`. The script waits for 6sense to identify the visitor.

| Attribute                                  | Description                                                                 |
|--------------------------------------------|-----------------------------------------------------------------------------|
| `company`                                  | Company name.                                                               |
| `companyUrl`                               | Company website domain.                                                     |
| `custom.firmographics.source`              | Always `6sense`.                                                            |
| `custom.firmographics.status.match`        | `Match`, `Non-actionable Match`, or `No Match`.                             |
| `custom.firmographics.status.confidence`   | `Very High`, `High`, `Moderate`, or `Low`.                                  |
| `custom.firmographics.status.blacklisted`  | Whether the company is excluded in 6sense settings.                         |
| `custom.firmographics.status.hot`          | Whether the account is a 6sense qualified account.                          |
| `custom.firmographics.profile.industry`    | Industry, e.g. `Financial Services`.                                        |
| `custom.firmographics.profile.employees`   | Employee range, e.g. `1000+`.                                               |
| `custom.firmographics.profile.revenue`     | Revenue range, e.g. `$1B+`.                                                 |
| `custom.firmographics.location.city`       | City, e.g. `New York`.                                                      |
| `custom.firmographics.location.state`      | State code, e.g. `NY`.                                                      |
| `custom.firmographics.location.country`    | Two-letter ISO country code, e.g. `US`.                                     |
| `custom.firmographics.identifiers.company` | 6sense company ID.                                                          |
| `custom.firmographics.identifiers.sic`     | SIC code.                                                                   |
| `custom.firmographics.identifiers.naics`   | NAICS code.                                                                 |
| `custom.firmographics.intentScores`        | Intent score 0-100, keyed by 6sense product.                                |
| `custom.firmographics.profileScores`       | Profile fit score 0-100, keyed by product.                                  |
| `custom.firmographics.buyingStages`        | `Purchase`, `Decision`, `Consideration`, `Awareness`, or `Target`, keyed by product. |
| `custom.firmographics.profileFit`          | `Strong`, `Moderate`, or `Weak`, keyed by product.                          |
| `custom.firmographics.segments`            | Numeric IDs of 6sense segments the account belongs to.                      |

Event: `eventOccurred` `{"name": "6senseDataRetrieved", "details": {"confidence": "Very High"}}`.

Console messages:

- `[Croct] 6sense data is not available.` 6sense has not identified the visitor yet. Informational;
  nothing ingested this pageview.
- `[Croct] 6sense data is malformed.` 6sense data could not be parsed; nothing ingested.

```cql
user's firmographics's profile's industry is "Financial Services"
and user's firmographics's profile's employees is "10,000+"
```

The docs use different employee range strings on different pages (`1000+` in the attribute table,
`"10,000+"` in this example). The provider defines these strings, so check a real profile's
**Attributes** tab before writing an exact-match condition.

## Demandbase

```html
<script src="https://cdn.croct.io/plug-integration/demandbase.js"></script>
```

Same install options as 6sense; GTM tag name `Send Demandbase data to Croct`.

| Attribute                                  | Description                                                        |
|--------------------------------------------|--------------------------------------------------------------------|
| `company`, `companyUrl`                    | Company name and domain.                                           |
| `custom.firmographics.source`              | Always `Demandbase`.                                               |
| `custom.firmographics.match`               | `Detailed` or `Basic`.                                             |
| `custom.firmographics.audience`            | Demandbase audience classification.                                |
| `custom.firmographics.profile.type`        | `Public`, `Private`, `Government`, or `Organization`.              |
| `custom.firmographics.profile.industry`    | Industry.                                                          |
| `custom.firmographics.profile.employees`   | Employee range, e.g. `1000+`.                                      |
| `custom.firmographics.profile.revenue`     | Revenue range, e.g. `$1B+`.                                        |
| `custom.firmographics.location.city` / `.state` / `.country` | City, state code, two-letter ISO country code.   |
| `custom.firmographics.stock.fortune1000`   | Whether in the Fortune 1000.                                       |
| `custom.firmographics.stock.forbes2000`    | Whether in the Forbes 2000.                                        |
| `custom.firmographics.identifiers.company` / `.sic` / `.naics` | Demandbase ID, SIC, NAICS.                     |

When `match` is `Basic`, only `source`, `match`, and `audience` are set. Company identity and the rest
require a `Detailed` match, so guard audiences that depend on them.

Event: `eventOccurred` `{"name": "DemandbaseDataRetrieved", "details": {"confidence": "Detailed"}}`.
Console: `[Croct] Demandbase data is malformed.` means the visitor did not resolve to a usable
profile; informational.

```cql
user's firmographics's profile's industry is "Financial Services"
and user's firmographics's profile's employees is "1000+"
```

## Clearbit

No Croct script. Edit the existing Clearbit Reveal GTM tag: add a callback before the Reveal script
and append `&callback=revealCallback` to the Reveal URL. Trigger: `Initialization - All Pages`.

```html
<script>
  window.revealCallback = function(data) {
    // Check status from session storage
    var status = sessionStorage.getItem('croctUpdated');

    if (status === 'true') {
      return;
    }

    // Retrieve Clearbit data from response
    if (data === null || data.company === null || data.metrics === null) {
      console.log('Clearbit data not found.');
      return;
    }

    // Push data to Croct
    croct.user.edit()
      .set('company', data.company.name)
      .set('companyUrl', data.company.domain || data.domain)
      .set('custom.industry', data.category.industry)
      .set('custom.employees', data.metrics.employeesRange)
      .set('custom.revenue', data.metrics.estimatedAnnualRevenue)
      .set('custom.firmographic.match', data.confidenceScore)
      .set('custom.firmographic.source', 'Clearbit')
      .save();

    // Track event
    croct.track('eventOccurred', {
      name: 'ClearbitDataRetrieved',
      details: {
        match: data.confidenceScore,
        source: 'Clearbit',
      }
    });

    // Update status to prevent updates on every pageview
    sessionStorage.setItem('croctUpdated', 'true');
  }
</script>
<script src="https://reveal.clearbit.com/v1/companies/reveal?authorization=XXXXXXXX&callback=revealCallback"></script>
```

Add more fields by chaining more `.set()` calls, e.g. `.set('custom.companyCountry', data.geo.countryCode)`.
Note the namespace is `custom.firmographic` (singular) here, unlike the 6sense and Demandbase scripts.

```cql
user's industry is "Financial Services"
and user's employees is "51-250"
```

## ZoomInfo

No Croct script. Add a GTM Custom HTML tag named `Send ZoomInfo data to Croct`, trigger
`Initialization - All Pages`. It polls `localStorage._ziVisitorInfo` up to 5 times, 1 s apart, and
writes the result once per session.

```html
<script>
  (function() {
    // Check status from session storage
    var status = sessionStorage.getItem('croctUpdated');

    if (status === 'true') {
      return;
    }

    var CROCT_MAX_ATTEMPTS = 5;
    var CROCT_RETRY_DELAY_MS = 1000;

    function tryActivate(attempt) {
      // Retrieve ZoomInfo data from local storage
      var details = localStorage.getItem('_ziVisitorInfo');

      if (details === null) {
        console.log('ZoomInfo data not found.');
        return;
      }

      var data = JSON.parse(details);

      if (data.status !== 'success' || !data.ziDetails) {
        if (attempt < CROCT_MAX_ATTEMPTS) {
          setTimeout(function() {
            tryActivate(attempt + 1);
          }, CROCT_RETRY_DELAY_MS);
        } else {
          console.log('ZoomInfo data not found after ' + CROCT_MAX_ATTEMPTS + ' attempts.');
        }

        return;
      }

      // Push data to Croct
      croct.user.edit()
        .set('company', data.companyName)
        .set('companyUrl', data.website)
        .set('custom.industry', data.primaryIndustry)
        .set('custom.employees', data.employeeCount)
        .set('custom.revenue', data.revenue)
        .set('custom.firmographic.source', 'ZoomInfo')
        .save();

      // Track event
      croct.track('eventOccurred', {name: 'ZoomInfoDataRetrieved'});

      // Update status to prevent updates on every pageview
      sessionStorage.setItem('croctUpdated', 'true');
    }

    tryActivate(1);
  })();
</script>
```

Two corrections versus the published snippet: it compares against an undefined `MAX_ATTEMPTS`
(a `ReferenceError` on retry), fixed here to `CROCT_MAX_ATTEMPTS`; and it names the event
`ZommInfoDataRetrieved`, corrected here. If the user already deployed the original, their timeline
shows the misspelled name.

The snippet checks `data.ziDetails` but reads fields such as `data.companyName` from the top level.
The docs do not show the WebSights payload shape; confirm against the ZoomInfo WebSights
implementation guide (page 11 lists the data points) before relying on these field paths.

It assumes WebSights payload encryption is **off** (the default). If the domain's **Decryption Key**
toggle is on, `ziDetails` is an encrypted string that must be decrypted with CryptoJS using the key
from the ZoomInfo Admin Portal (WebSights guide, page 15).

```cql
user's industry is "Financial Services"
and user's employees is "250-499"
```

## Build the experience (all providers)

Prerequisite: a slot already integrated in the project. Then the user, in the admin app: Experiences >
New experience; Audience tab > New audience with the CQL above; Slot tab > pick slots (hero, logo
cloud, testimonials are common); Content tab > write the content; Preview or publish.

## Sources

- https://docs.croct.com/immersion/integrations/firmographics/6sense/integration.md
- https://docs.croct.com/immersion/integrations/firmographics/6sense/playbook.md
- https://docs.croct.com/immersion/integrations/firmographics/demandbase/integration.md
- https://docs.croct.com/immersion/integrations/firmographics/demandbase/playbook.md
- https://docs.croct.com/immersion/integrations/firmographics/clearbit/integration.md
- https://docs.croct.com/immersion/integrations/firmographics/clearbit/playbook.md
- https://docs.croct.com/immersion/integrations/firmographics/zoominfo/integration.md
- https://docs.croct.com/immersion/integrations/firmographics/zoominfo/playbook.md
- https://docs.croct.com/reference/user/custom-attributes.md
- https://docs.croct.com/explanation/audience/examples/user-attributes.md
