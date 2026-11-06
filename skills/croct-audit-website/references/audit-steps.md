# Audit steps

How to run each collection step, what to record, and what to do when it fails. Collection steps
write findings; only the synthesis writes report prose.

## Finding ledger

Keep the ledger in your working notes (or a scratch file the user doesn't need). Every finding:

| Field        | Content                                                                                                                     |
|--------------|-----------------------------------------------------------------------------------------------------------------------------|
| `id`         | `F1`, `F2`, ...                                                                                                             |
| `type`       | `tool`, `traffic`, `ad`, `page`, `signal`, `component`                                                                      |
| `summary`    | One line                                                                                                                    |
| `evidence`   | Page URL plus at least one of: a short exact quote, a screenshot path, a script host, a window global, a cookie, a meta tag |
| `confidence` | `signal` findings only: `high`, `medium`, `low`                                                                             |

Type-specific fields:

- `tool`: name, category, `competitor` (true for A/B, personalization, and feature-flag tools).
- `traffic`: monthly visits, channel percentages, countries.
- `ad`: platform, library URL, text, CTA, destination URL, its `utm_*` values, linked landing
  page finding.
- `page`: URL, role (home, pricing, product, industry, persona, use case, customers, blog, post,
  locale variant), what it sells, to whom, in which regions.
- `signal`: playbook it supports (see the playbook table in `report-template.md`).
- `component`: name, kind, page URL, present (yes/no), generic (yes/no), crop path.

## 1. Load the homepage

- Viewport 1440 x 900 at device scale factor 2, a regular desktop user agent, locale `en-US`
  (otherwise some libraries, such as Google's, render in the machine's language).
- Playwright through the shell: if launch fails with "Executable doesn't exist", an installed
  Chromium build may still work through `executablePath`. Don't run `npx playwright install` or
  add packages without the user's consent.
- Accept the cookie banner if one appears (OneTrust, Cookiebot, Didomi, Usercentrics,
  CookieYes, HubSpot, or others). Click its accept button; don't change other settings.
- Record: final URL after redirects, HTML, script and request hosts, `window` globals, cookie
  names, `<meta name="generator">`, response headers when the tool exposes them, and a
  full-page screenshot.
- Before any screenshot, scroll the whole page in steps (about 600 px every 250 ms) and wait
  for the network to settle. Lazy-loaded images otherwise show as blurred placeholders, and
  sticky or full-height heroes can be cut off in full-page captures. Use the viewport
  screenshot for the hero.
- A bot challenge (Cloudflare "Just a moment", Akamai, PerimeterX, DataDome) or a login wall:
  stop. This fails the quality gate.
- Unreachable: retry once, then stop with "site unreachable".
- Without a browser: fetch the HTML and read `<script src>`, `<link>`, inline scripts, and meta
  tags. Note that network requests and globals were not checked.

## 2. Crawl

- Collect same-origin links from the nav, the footer, and `/sitemap.xml` (and sitemap indexes).
- Rank and load up to 15 pages: pricing; products and solutions; industries; personas or roles;
  use cases; customers or case studies; blog index plus its 3 newest posts; `hreflang` locale
  variants.
- Capture each like the homepage (a screenshot only for pages you may cite).
- Skip login, cart, checkout, account, and search-result pages.

## 3. Detect the stack

Match signals in HTML, request hosts, globals, cookies, and headers. Prefer two signals per tool.
Match hosts, paths, and globals, never bare words: "segment" appears in every Next.js page as
`segmentPath`, and "hubspot" can be an image host rather than a form.
When the source code is available, confirm with `package.json` dependencies, `composer.json`,
and framework config files; the repo wins over the live site.

The table lists common signals as starting points; other tools exist. When unsure, leave the
tool out.

| Category                             | Tool                     | Signals                                                                                                        |
|--------------------------------------|--------------------------|----------------------------------------------------------------------------------------------------------------|
| Framework                            | Next.js                  | `/_next/static/` assets, `__NEXT_DATA__` script, `self.__next_f`                                               |
| Framework                            | Nuxt                     | `/_nuxt/` assets, `window.__NUXT__`                                                                            |
| Framework                            | Gatsby                   | `___gatsby` root element                                                                                       |
| Framework                            | Remix                    | `window.__remixContext`                                                                                        |
| Framework                            | Vue                      | `data-v-` attributes, `window.__VUE__`                                                                         |
| Framework                            | Angular                  | `ng-version` attribute                                                                                         |
| Framework                            | React (generic)          | No better framework match plus `__REACT_DEVTOOLS_GLOBAL_HOOK__` use or React root markers; confirm in the repo |
| Framework                            | PHP / Laravel / Symfony  | `X-Powered-By: PHP`, `PHPSESSID`; `laravel_session` cookie (Laravel); `/bundles/` assets (Symfony)             |
| CMS                                  | WordPress                | `/wp-content/`, `/wp-json/`, generator meta                                                                    |
| CMS                                  | Drupal                   | `drupalSettings`, `/sites/default/files/`, generator meta                                                      |
| CMS                                  | Storyblok                | `a.storyblok.com` asset host                                                                                   |
| CMS                                  | Sanity                   | `cdn.sanity.io` asset host                                                                                     |
| CMS                                  | Contentful               | `images.ctfassets.net`, `ctfassets.net` hosts                                                                  |
| CMS                                  | Strapi                   | Media URLs on a Strapi host or `/uploads/` with Strapi naming; confirm in the repo                             |
| CMS                                  | Prismic                  | `images.prismic.io`                                                                                            |
| CMS                                  | Webflow                  | `data-wf-site` attribute, `website-files.com` assets                                                           |
| CMS                                  | HubSpot CMS              | `hubspotusercontent` hosts, `hs-sites`                                                                         |
| Ecommerce                            | Shopify                  | `cdn.shopify.com`, `window.Shopify`                                                                            |
| Ecommerce                            | Shopify Hydrogen         | Shopify signals plus a React app; confirm `@shopify/hydrogen` in the repo                                      |
| Ecommerce                            | VTEX                     | `vtexassets.com`, `vteximg.com.br`                                                                             |
| Ecommerce                            | Magento / Adobe Commerce | `Magento_` assets, `mage/` scripts                                                                             |
| Ecommerce                            | BigCommerce              | `cdn11.bigcommerce.com`                                                                                        |
| Ecommerce                            | WooCommerce              | `woocommerce` classes or assets                                                                                |
| CDP                                  | Segment                  | `cdn.segment.com`, `window.analytics`                                                                          |
| CDP                                  | RudderStack              | `cdn.rudderlabs.com`                                                                                           |
| Analytics                            | Google Analytics 4       | `googletagmanager.com/gtag/js?id=G-`                                                                           |
| Analytics                            | Adobe Analytics          | `AppMeasurement`, `omtrdc.net`                                                                                 |
| Analytics                            | Mixpanel                 | `cdn.mxpnl.com`                                                                                                |
| Analytics                            | Amplitude                | `cdn.amplitude.com`                                                                                            |
| Analytics                            | Heap                     | `cdn.heapanalytics.com`                                                                                        |
| Analytics                            | PostHog                  | `posthog` script hosts (`i.posthog.com`)                                                                       |
| Analytics                            | Hotjar                   | `static.hotjar.com`                                                                                            |
| Analytics                            | Microsoft Clarity        | `clarity.ms`                                                                                                   |
| Analytics                            | Fullstory                | `fullstory.com` script hosts                                                                                   |
| CRM / marketing automation           | HubSpot                  | `js.hs-scripts.com`, `js.hsforms.net`, `hubspotutk` cookie                                                     |
| CRM / marketing automation           | Marketo                  | `munchkin.marketo.net`                                                                                         |
| CRM / marketing automation           | Salesforce / Pardot      | `pi.pardot.com`, `webto.salesforce.com` forms                                                                  |
| CRM / marketing automation           | Intercom                 | `widget.intercom.io`                                                                                           |
| Firmographics                        | Clearbit                 | `clearbit` script hosts                                                                                        |
| Firmographics                        | 6sense                   | `j.6sc.co`                                                                                                     |
| Firmographics                        | Demandbase               | `tag.demandbase.com`                                                                                           |
| Firmographics                        | ZoomInfo                 | `ws.zoominfo.com`                                                                                              |
| Firmographics                        | Apollo                   | `assets.apollo.io`                                                                                             |
| Firmographics                        | UserGems                 | `api.usergems.com`                                                                                             |
| Ad pixels                            | LinkedIn Insight Tag     | `snap.licdn.com`, `px.ads.linkedin.com`                                                                        |
| Ad pixels                            | Microsoft Advertising    | `bat.bing.com`, `c.bing.com`                                                                                   |
| Ad pixels                            | Meta Pixel               | `connect.facebook.net`, `window.fbq`                                                                           |
| Tag manager                          | Google Tag Manager       | `googletagmanager.com/gtm.js`, `dataLayer`                                                                     |
| Tag manager                          | Adobe Launch             | `assets.adobedtm.com`                                                                                          |
| Consent                              | OneTrust                 | `cdn.cookielaw.org`                                                                                            |
| Consent                              | Cookiebot                | `consent.cookiebot.com`                                                                                        |
| Consent                              | Didomi                   | `sdk.privacy-center.org`                                                                                       |
| Consent                              | Usercentrics             | `usercentrics.eu` hosts                                                                                        |
| Consent                              | CookieYes                | `cdn-cookieyes.com`                                                                                            |
| Consent                              | Termly                   | `app.termly.io`                                                                                                |
| A/B and personalization (competitor) | Optimizely Web           | `cdn.optimizely.com`                                                                                           |
| A/B and personalization (competitor) | VWO                      | `visualwebsiteoptimizer.com`, `_vwo_code`                                                                      |
| A/B and personalization (competitor) | Adobe Target             | `at.js`, `mbox` requests                                                                                       |
| A/B and personalization (competitor) | AB Tasty                 | `abtasty.com` hosts                                                                                            |
| A/B and personalization (competitor) | Kameleoon                | `kameleoon` hosts                                                                                              |
| A/B and personalization (competitor) | Dynamic Yield            | `cdn.dynamicyield.com`                                                                                         |
| A/B and personalization (competitor) | Convert                  | `convertexperiments.com`                                                                                       |
| A/B and personalization (competitor) | Mutiny                   | `mutinycdn.com`                                                                                                |
| A/B and personalization (competitor) | Ninetailed               | `ninetailed` hosts or globals                                                                                  |
| A/B and personalization (competitor) | Google Optimize          | `googleoptimize.com/optimize.js`                                                                               |
| Feature flags (competitor)           | LaunchDarkly             | `launchdarkly.com` hosts                                                                                       |
| Feature flags (competitor)           | Statsig                  | `statsig` API hosts                                                                                            |
| Feature flags (competitor)           | GrowthBook               | `growthbook` hosts                                                                                             |
| Croct                                | Croct                    | `cdn.croct.io`, `api.croct.io`, `ct.user_token` and `ct.client_id` cookies, `window.croct`                     |

- An ad pixel (LinkedIn Insight Tag, Meta Pixel, Microsoft Advertising) suggests paid campaigns on
  that network even when its ad library shows nothing.
- If Croct is already on the site, say so in the chat, end the stack line with
  `Croct is already installed.`, and look for Croct fields in the CMS payload. 
- Adapt Phase 3 to the existing setup.
- Record an anti-flicker style (a hidden `body` or `opacity: 0` added by the snippet) next to its
  tool; the comparison block can mention it.

## 4. Map the SDK and integrations

| Detected                  | Recommend              |
|---------------------------|------------------------|
| Next.js                   | `@croct/plug-next`     |
| Nuxt                      | `@croct/plug-nuxt`     |
| Shopify Hydrogen          | `@croct/plug-hydrogen` |
| React (no meta-framework) | `@croct/plug-react`    |
| Vue (no meta-framework)   | `@croct/plug-vue`      |
| PHP                       | `croct/plug-php`       |
| Symfony                   | `croct/plug-symfony`   |
| Laravel                   | `croct/plug-laravel`   |
| Drupal                    | `croct/plug-drupal`    |
| Anything else             | `@croct/plug`          |

Integrations to mention: Storyblok, Sanity, Strapi, Shopify, VTEX, HubSpot forms, Google Tag
Manager, Clarity, and firmographics providers (see the `croct-integrate-platforms` skill).

## 5. Find ads

Open each library and read the first 1–2 pages, up to 12 ads per platform. Crop each ad card
(about 840 px wide) and keep its text, CTA, and destination URL when shown.

| Platform  | URL                                                                                                                                                                       | How to find the account                                                                                                 |
|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| Google    | `https://adstransparency.google.com/?region=anywhere&domain=<domain>`                                                                                                     | By domain                                                                                                               |
| Meta      | `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&view_all_page_id=<page-id>` | The page ID from the site's Facebook link (the library page shows it). Without a Facebook link, search the domain as an exact phrase: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=%22<domain>%22&search_type=keyword_exact_phrase&media_type=all` |
| LinkedIn  | `https://www.linkedin.com/ad-library/search?companyIds=<company-id>`                                                                                                      | The numeric company ID behind the site's LinkedIn link. Without it, use `https://www.linkedin.com/ad-library/search?accountOwner=<name>` and keep only cards whose advertiser name matches exactly: the name search also returns similar names |

- Libraries change markup and may show login walls or captchas. Don't log in or solve them;
  keep the library link and note that the platform couldn't be checked.
- LinkedIn usually blocks automated access to ad detail pages (`/ad-library/detail/<id>`) with
  a Cloudflare "you have been blocked" page. Don't retry or work around it. The search results
  page still shows each ad's text, headline, image, and the campaign or audience label under the
  headline ("Tier 1 & 2 Grocers"): read them there and crop the cards from its screenshot. The
  destination URL and its UTM values then stay unknown.
- Without a browser, these pages render client-side: give the links only and say ads weren't
  checked.

## 6. Visit landing pages

- Collect unique ad destinations. Record their `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content`, and `utm_term` values first: Phase 3 uses them for campaign audiences.
- Strip tracking parameters, load each like step 1, and take a 1440 x 900 screenshot.
- Compare the ad's promise (persona, industry, metric, offer, testimonial) with the landing
  page's hero. A mismatch is a candidate main blocker.
- Without a destination, pair the ad with the homepage, and say in the report that the landing
  page couldn't be confirmed.
- When Croct or another personalization tool is installed, loading the homepage with UTM values
  shows whether campaign traffic already gets different content. Only the UTM values recorded
  from real destinations prove anything; guessed values only show there's no catch-all
  variant for that network.

## 7. Traffic

1. Use the user's numbers when given.
2. Else omit the figure (see `report-template.md`).

## 8. Read content

Per page: what it sells, to whom, in which regions, with a short quote.

Sitewide signals, each a `signal` finding with confidence:

| Playbook                                                 | Look for                                                                                |
|----------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `location`                                               | `hreflang` tags, language or currency switcher, regional pages, country-specific offers |
| `interests`                                              | Industries, personas, products, or use cases in the nav                                 |
| `organic-intent` / `blog-readers`                        | Blog size, newest post date, publishing cadence                                         |
| `customers`                                              | Login link, free tier, upgrade offers, pricing tiers                                    |
| `leads`                                                  | Demo, contact, trial, or newsletter forms                                               |
| `marketing-campaigns` / `abm-campaigns` / `search-terms` | Ads from step 5, UTM values from step 6                                                 |
| `free-shipping`                                          | A shipping threshold in a bar, cart, or FAQ                                             |

High confidence: seen on several pages or in ads. Medium: seen once, clearly. Low: inferred.

## 9. Inventory components

Find these on the homepage and key landing pages, crop each, and judge whether it's generic
(the same for every visitor and not tied to any segment):

| Kind             | Heuristic                                                        |
|------------------|------------------------------------------------------------------|
| Hero             | First section containing the `h1`                                |
| Announcement bar | Thin bar above the nav; record "not present" when missing        |
| Nav              | Header links and the nav CTA                                     |
| CTA buttons      | Prominent buttons and their labels ("Book a demo", "Start free") |
| Card grid        | Repeated cards for features, products, use cases, or resources   |
| Testimonials     | Quotes, case-study cards, video testimonials                     |
| Logo wall        | Customer logos                                                   |
| Pricing cards    | Plan cards on the pricing page                                   |

Capture each component with an element screenshot after the page has been scrolled through
(step 1), rather than cropping offsets from the full-page screenshot: offsets drift when content
loads late. A sticky header may overlap the top of the element; that is acceptable.

Record each component's current text: Phase 3 uses it as the slot's default content.

## Sources

- https://docs.croct.com/reference/sdk.md
- https://docs.croct.com/immersion/playbooks/marketing-campaigns.md
- https://docs.croct.com/immersion/playbooks/abm-campaigns.md
- https://docs.croct.com/immersion/playbooks/location.md
- https://docs.croct.com/immersion/playbooks/interests.md
