# Sanity and Strapi

Neither integration has a Croct package of its own. The CMS keeps managing static content; your app
fetches a Croct slot and passes the CMS content as the `fallback`. Croct reads nothing from the CMS
and writes nothing back, so you can adopt it one component at a time and roll back by removing a
single `fetchContent` call. Pages behave exactly as today until the first experience launches.

Examples below use the Next.js SDK (`@croct/plug-next/server`), as the docs do. For other stacks,
use the equivalent fetch function of that SDK (see the `croct-integrate-sdk` skill).

## Shared setup

1. Prerequisites: a Croct workspace and application, and a CMS project with content.
2. Run the CLI in the frontend project. It detects the setup, installs the SDK, and wires the
   provider and middleware:

   ```sh
   croct init
   ```

3. For each module or component to make dynamic, create a Croct **component** and a **slot**.
4. **The Croct component must mirror the CMS schema, using the same attribute names**, so dynamic
   content and CMS content are interchangeable in the same rendering component.
5. Fetch the slot with the CMS content as `fallback` (below).
6. Decide where default content lives (below).
7. Verify: load the page (default shows), publish an experience or AB test on the slot, reload as a
   matching visitor (dynamic content shows).

## Sanity

```jsx
// components/HomeHero.jsx
import {fetchContent} from '@croct/plug-next/server';

export async function HomeHero() {
  const sanityHero = await getSanityHero();
  const {content} = await fetchContent('home-hero@1', {
    fallback: sanityHero,
  });

  return <Hero {...content} />;
}
```

Demo: `https://github.com/croct-tech/croct-sanity-project` (see `frontend/app/page.tsx`).

## Strapi

The integration builds on Strapi **dynamic zones**: each dynamic zone component is a natural unit of
dynamic content. One Croct slot holds a map from Strapi pages and dynamic zone components to Croct
slots. When rendering, each mapped component gets its content from its Croct slot, with the original
Strapi content as fallback.

### Mapping component

Create a Croct component with these attributes:

| Attribute                      | Description                                  | Type              | Required |
|--------------------------------|----------------------------------------------|-------------------|----------|
| `map`                          | Pages and their dynamic-zone-to-slot maps.   | List of structure | Yes      |
| `map[*].slug`                  | Page slug as defined in Strapi.              | Plain text        | Yes      |
| `map[*].sections`              | Sections to connect.                         | List of structure | Yes      |
| `map[*].sections[*].component` | Component ID as defined in Strapi.           | Plain text        | Yes      |
| `map[*].sections[*].slot`      | Slot ID as defined in Croct.                 | Plain text        | Yes      |

For `component` and `slot`, select **Not empty** and use the pattern `^[a-z0-9_-]+$`. Then create the
slot `home-page-dynamic-zones` holding the map of pages and sections to connect.

Implement the lookup following the demo:
`https://github.com/croct-tech/croct-strapi-project/blob/main/next/app/%5Blocale%5D/(marketing)/page.tsx`.
For each mapped zone, fetch the mapped slot and merge the result over the Strapi component:

```jsx
import {fetchContent} from '@croct/plug-next/server';

const {content} = await fetchContent(mapping.slot, {
  preferredLocale: params.locale,
  fallback: zone,
});

return {...zone, ...content};
```

The docs do not publish the full lookup code inline; read the demo file for how `mapping` is found
from the page slug and the zone's component ID.

## Where default content lives

Both the CMS and Croct can serve the default content (what visitors see when no experience or AB
test targets them). Ask the user which side should own it; it is a structural decision.

| Approach                         | Croct serves         | CMS serves              | Editors manage defaults in |
|----------------------------------|----------------------|-------------------------|----------------------------|
| Default in Croct (recommended)   | Default and dynamic  | Fallback only           | Croct                      |
| Default in CMS                   | Dynamic only         | Default and fallback    | The CMS                    |

Croct recommends the first: experiences and AB tests are faster to configure because editors copy
the slot content as a base and change only what differs. Teams choose the second to keep the
editorial workflow mostly unchanged. The plain `fetchContent` examples above implement the first.

To implement default-in-CMS, check `metadata.contentSource`. When it is `slot`, no experience or AB
test matched, so render the CMS content:

```jsx
// Sanity
import {fetchContent} from '@croct/plug-next/server';

export async function HomeHero() {
  const sanityHero = await getSanityHero();
  const {content, metadata} = await fetchContent('home-hero@1', {
    fallback: sanityHero,
  });

  // Render the Sanity content unless Croct returned dynamic content
  const hero = metadata?.contentSource === 'slot' ? sanityHero : content;

  return <Hero {...hero} />;
}
```

```jsx
// Strapi
import {fetchContent} from '@croct/plug-next/server';

const {content, metadata} = await fetchContent(mapping.slot, {
  preferredLocale: params.locale,
  fallback: zone,
});

// Use the Strapi content unless Croct returned dynamic content
return metadata?.contentSource === 'slot' ? zone : {...zone, ...content};
```

## Sources

- https://docs.croct.com/immersion/integrations/cms/sanity.md
- https://docs.croct.com/immersion/integrations/cms/strapi.md
