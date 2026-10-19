# Feature-flag and redirect experiments

Both are regular experiments whose slot carries a decision (a boolean or a URL) instead of
visible content. The code reads the slot; launching, changing, or ending the test is
configuration only.

## Choose the approach

| Approach | Where the split happens | Visitor experience | Use when |
|---|---|---|---|
| Content experiment | On the server while the page renders | One page load | Only what the page says or shows differs (headline, CTA, image, section, layout) |
| CTA experiment | On click; the slot holds the link destination | One page load | Versions live on different URLs but the entry page is not under test |
| Feature-flag experiment | On the server; the slot holds a boolean | One page load | Testing functional behavior, flows, or new capabilities |
| Redirect experiment | On arrival | Two page loads | The entry page itself is under test and the variant is a genuinely separate page |

Most redirect experiments do not need a redirect: if the versions differ only in content, model
the difference as content and keep one URL.

## Server-side feature-flag experiment

Server-side means the server decides the variant and renders it into the first HTML response: no
flicker, ad blockers cannot strip results, and functional behavior can be tested.

Request path:

1. The SDK sends the visitor ID with the content request.
2. Croct evaluates the audience, allocates the visitor (deterministic hash of visitor ID and
   experiment key), and selects the variant's content.
3. The app renders from the structured content.
4. Exposure is tracked automatically.
5. The app tracks the goal on conversion.

The app owns only steps 3 and 5.

### Setup

1. Create a component with a single boolean attribute (labels such as on/off or enable/disable).
   The examples below name it `switcher`.
2. Create a slot for it (example ID `feature-xyz`) with a default value: the behavior users get
   before the experiment starts or when no experience applies.
3. Add it to the project: `npx croct@latest add slot feature-xyz@1 --example` (generates types,
   downloads the default content as fallback, adds a working example). The docs omit the ID, which
   makes the CLI prompt for a slot; always pass it. Create the boolean component and the slot in
   the dashboard first.
4. Branch on the flag on the server.
5. In the dashboard: create the experience and experiment (primary goal, allocation, 2 to 5
   variants) and give each variant a different flag value.
6. Track the goal in the browser.

### Branch on the flag

```tsx
// Next.js App Router (server component)
import {fetchContent} from '@croct/plug-next/server';

export async function HomeHero() {
  const {content: {switcher}} = await fetchContent('feature-xyz@1');

  return switcher ? <NewHero /> : <CurrentHero />;
}
```

```vue
<!-- Nuxt -->
<script setup>
  const {data} = await useContent('feature-xyz@1');
</script>

<template>
  <NewHero v-if="data.content.switcher" />
  <CurrentHero v-else />
</template>
```

```jsx
// Hydrogen
import {useLoaderData} from 'react-router';
import {fetchContent} from '@croct/plug-hydrogen/server';

export async function loader({context}) {
  const {content: {switcher}} = await fetchContent('feature-xyz@1', {scope: context});

  return {switcher};
}

export default function Index() {
  const {switcher} = useLoaderData();

  return switcher ? <NewHero /> : <CurrentHero />;
}
```

```php
<?php
// Laravel route
use Croct\Plug\Plug;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Plug $croct) {
    ['switcher' => $switcher] = $croct->fetchContent('feature-xyz@1')->getContent();

    return view($switcher ? 'home.new-hero' : 'home.current-hero');
});
```

Symfony is the same pattern with `Plug $croct` injected into the controller action. Outside the
render flow, pass the request scope: `fetchContent('feature-xyz@1', {route: context})` in the
Next.js Pages Router (`getServerSideProps`), `{scope: context}` in Hydrogen loaders, and the
auto-imported `fetchContent` in Nuxt server routes and middleware.

### Prerendering and caching

A fully prerendered or cached page is identical for everyone and collapses the experiment. Opt
into dynamic rendering at the slot level, in this order of preference:

1. Render the experimental component on the server (default and recommended: no flicker, visible
   to crawlers).
2. Stream the dynamic component into a static shell.
3. Render on the client with an initial value, only when there is no server (static site on a
   CDN). This reintroduces a content update after load.

Laravel, Symfony, and Hydrogen render per request. Laravel and Symfony mark personalized
responses private automatically. Framework details: the `croct-integrate-sdk` skill.

### Maintain flags

If a variant causes friction, disable it immediately from the dashboard. After the test, remove
unused flags from the code to avoid technical debt.

## Redirect experiment

### Setup

1. Component `redirect` with one **optional** plain-text attribute `redirectUrl`. An absent value
   means "stay".
2. Slot `redirect` bound to that component, with **empty** default content, so nothing changes
   until the experiment is published and everything reverts when it stops.
3. `croct add slot redirect` (types plus fallback, so a failed request leaves the visitor on the
   current page).
4. Redirect when the slot has a URL (server preferred).
5. Dashboard: experience on the target audience with the `redirect` slot; experiment with a goal,
   allocation, and two variants ("Current page" with an empty URL, "New page" with the new
   address). Leave the experience content empty too, unless non-allocated users should also be
   redirected.
6. Track the goal on **both** pages.

### Server or browser

| Aspect | Server-side redirect | Client-side redirect |
|---|---|---|
| Decision point | Before any HTML is sent | After the page loads and content arrives |
| Visitor sees | Only the final page | A hidden page until the decision arrives |
| Flicker risk | None | Real, if the mask fails or a script is blocked |
| Crawlers | Follow a standard HTTP redirect | Never run the experiment |
| Requirement | A server or edge runtime per request | Only the browser SDK |

Redirect on the server whenever the stack renders per request. Use the browser only when there
is no server (fully static site) or the page cannot be changed on the server.

### Server redirect

```jsx
// Next.js App Router: app/page.jsx
import {redirect} from 'next/navigation';
import {fetchContent} from '@croct/plug-next/server';
import {HomeHero} from '@/components/HomeHero';

export default async function HomePage() {
  const {content} = await fetchContent('redirect');

  if (content.redirectUrl) {
    redirect(content.redirectUrl);
  }

  return <HomeHero />;
}
```

```jsx
// Next.js Pages Router
import {fetchContent} from '@croct/plug-next/server';

export const getServerSideProps = async context => {
  const {content} = await fetchContent('redirect', {route: context});

  if (content.redirectUrl) {
    return {redirect: {destination: content.redirectUrl, permanent: false}};
  }

  return {props: {}};
};
```

- Use a temporary status (302 or 307), never permanent: browsers and search engines cache
  permanent redirects long after the test ends.
- Avoid loops: scope the fetch to the page under test. When the code runs on every request
  (middleware, event subscriber), redirect only if the destination differs from the current URL.
  Resolving against the current URL also allows relative paths like `/new-page`:

  ```js
  const target = new URL(content.redirectUrl, request.url);

  if (target.href !== request.url) {
    // Redirect to the target.
  }
  ```

- Keep the per-visitor redirect out of shared page caches.

### Browser redirect

Hide the page until the decision arrives and reveal it in every outcome:

```js
// redirect.js
import croct from '@croct/plug';

croct.plug({appId: 'APPLICATION_ID'});

croct.fetch('redirect')
    .then(({content}) => {
        if (content.redirectUrl) {
            location.replace(new URL(content.redirectUrl, location.href));
        }
    })
    .finally(() => document.body.classList.remove('croct-pending'));
```

```html
<!-- index.html -->
<head>
    <style>
        body.croct-pending { visibility: hidden; }
    </style>
    <script type="module" src="/redirect.js"></script>
</head>
<body class="croct-pending">
    <!-- page -->
</body>
```

```jsx
// React: components/RedirectTest.jsx, wrap the page inside <CroctProvider>
import {useEffect} from 'react';
import {useContent} from '@croct/plug-react';

export function RedirectTest({children}) {
  // `null` marks the decision as pending while content loads.
  const {content} = useContent('redirect', {initial: {redirectUrl: null}});
  const decided = content.redirectUrl !== null;

  useEffect(() => {
    if (content.redirectUrl) {
      location.replace(new URL(content.redirectUrl, location.href));
    }
  }, [content.redirectUrl]);

  return decided && !content.redirectUrl ? children : null;
}
```

Why this is safe: the page is revealed even on errors; the SDK aborts after its default fetch
timeout so the page cannot stay hidden forever; `location.replace` keeps the original page out of
history so Back does not re-trigger the redirect.

### Pitfalls

- **Cross-domain destinations**: the visitor is recognized per domain, so a different domain
  starts a new anonymous visitor and the conversion is never attributed. For subdomains, share
  the session first (cross-subdomain identification tutorial).
- **Browser redirects bias results**: the redirected group waits for the decision and loads a
  second page. A new page that wins anyway is a strong result; a narrow loss deserves a second
  look. Server redirects do not skew results this way.

### Verify before running

1. Preview each variant: the one with a URL redirects; the one without renders untouched.
2. Land on the destination and reload; if you end up elsewhere, the destination also resolves the
   slot. Break the loop before publishing.
3. Sessions per variant match the split; a persistent imbalance means visitors drop out during the
   redirect.
4. Complete the conversion on both pages and confirm the goal appears.

### After a winner

Point the original URL at the winning page (or move its content into the current page), then stop
the experiment. The slot returns to its empty default, so nobody is redirected during cleanup.

## Sources

- https://docs.croct.com/immersion/tutorials/experiment-feature-flagging.md
- https://docs.croct.com/immersion/tutorials/redirect-experiment.md
- https://docs.croct.com/explanation/experiment.md
