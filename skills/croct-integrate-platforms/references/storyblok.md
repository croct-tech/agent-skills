# Storyblok

Two pieces work together:

- **Optimize by Croct**, a Storyblok app. Marketers link any block to a Croct slot from inside the
  Storyblok editor and manage experiences and AB tests there. Requires the Croct **Scale plan**.
- **The Storyblok SDK** (`@croct/plug-storyblok` for JavaScript, `croct/plug-storyblok` for PHP). It
  intercepts story fetches, finds blocks linked to a slot through a `croct` field, fetches the slot
  content from Croct, and converts it back to the Storyblok shape before your code receives it.

Your rendering code does not change. Blocks with no matching experience, or whose fetch fails, keep
their original Storyblok content.

## Setup checklist

1. Confirm the prerequisites: a Croct workspace and application, and a Storyblok space with at least
   one story.
2. Storyblok requires manual vendor approval for external apps. Tell the user to contact Croct
   support and confirm their email is approved before installing:
   `https://croct.com/contact/support?subject=feature-request`.
3. The user installs the app from `https://app.storyblok.com/#/install/croct` and follows its
   onboarding, which installs the field plugin and connects the space to Croct.
4. Wire the SDK in the codebase. Prefer the CLI:

   ```sh
   croct init
   ```

   - JavaScript projects: the CLI wraps the `storyblokInit` call with `withCroct`.
   - PHP framework projects: the CLI installs `croct/plug-storyblok` and enables the integration,
     which decorates the Stories API automatically.
   - PHP without a supported framework: the CLI does **not** wire the decorator. Use the manual PHP
     setup below.
5. The user makes blocks dynamic and links them to slots in the app (see "Editor workflow").
6. Verify (see "Verify").

## Manual installation: JavaScript

Install and configure the Croct SDK for the framework first (see the `croct-integrate-sdk` skill).
The Storyblok integration is a bridge between that SDK and Storyblok.

```sh
npm install @croct/plug-storyblok
```

Then wrap the Storyblok options with `withCroct`, importing from the subpath for the stack:

| Stack      | Import path                   | Storyblok package        | Signature                                                 |
|------------|-------------------------------|--------------------------|-----------------------------------------------------------|
| JavaScript | `@croct/plug-storyblok/js`    | `@storyblok/js`          | `withCroct(options: SbSDKOptions): SbSDKOptions`          |
| React      | `@croct/plug-storyblok/react` | `@storyblok/react`       | `withCroct(options: SbSDKOptions): SbSDKOptions`          |
| Next.js    | `@croct/plug-storyblok/next`  | `@storyblok/react/rsc`   | `withCroct(options: SbSDKOptions): SbSDKOptions`          |
| Vue        | `@croct/plug-storyblok/vue`   | `@storyblok/vue`         | `withCroct(options: SbVueSDKOptions): Plugin`             |
| Nuxt       | `@croct/plug-storyblok/nuxt`  | `@storyblok/nuxt`        | `withCroct(nuxtApp: NuxtApp, api: StoryblokClient): void` |

### JavaScript, React, Next.js

```js
// Next.js: import from '@storyblok/react/rsc' and '@croct/plug-storyblok/next'
// React:   import from '@storyblok/react'     and '@croct/plug-storyblok/react'
import {storyblokInit, apiPlugin} from '@storyblok/js';
import {withCroct} from '@croct/plug-storyblok/js';

storyblokInit(withCroct({
  accessToken: 'YOUR_ACCESS_TOKEN',
  use: [apiPlugin],
  components: {},
}));
```

### Vue

```js
import {createApp} from 'vue';
import {createCroct} from '@croct/plug-vue';
import {apiPlugin} from '@storyblok/vue';
import {withCroct} from '@croct/plug-storyblok/vue';
import App from './App.vue';

const app = createApp(App);

app.use(createCroct({appId: 'YOUR_APP_ID'}));

app.use(withCroct({
  accessToken: 'YOUR_ACCESS_TOKEN',
  use: [apiPlugin],
  components: {},
}));

app.mount('#app');
```

### Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    ['@storyblok/nuxt', {
      accessToken: 'YOUR_ACCESS_TOKEN',
    }],
    '@croct/plug-nuxt',
  ],
})
```

```ts
// plugins/croct-storyblok.ts
import {withCroct} from '@croct/plug-storyblok/nuxt';
import {useStoryblokApi} from '@storyblok/vue';
import {defineNuxtPlugin} from '#app';

export default defineNuxtPlugin(nuxtApp => {
  withCroct(nuxtApp, useStoryblokApi());
})
```

`withCroct` bypasses dynamic content inside the Storyblok visual editor, so editors always see the
original content.

## Manual installation: PHP

Install and configure the Croct PHP SDK first, then:

```sh
composer require croct/plug-storyblok
```

**Supported framework (automatic):** after installing the package, the integration wraps the Stories
API exposed by the framework's official Storyblok package, with personalization on by default. No
decorator or configuration to add. Personalization stays inactive until that official Storyblok
package is installed. The docs show Symfony and Laravel usage; they do not publish an explicit list of
supported frameworks.

**Anything else (manual):** wrap the Stories API with `CroctStoriesApi`:

```php
<?php
use Croct\Plug\Croct;
use Croct\Plug\Storyblok\CroctStoriesApi;
use Storyblok\Api\StoriesApi;
use Storyblok\Api\StoryblokClient;

$plug = Croct::fromDotenv();

$client = new StoryblokClient(
    baseUri: 'https://api.storyblok.com',
    token: 'YOUR_ACCESS_TOKEN',
);

$stories = new CroctStoriesApi(new StoriesApi($client), $plug);

$response = $stories->bySlug('home');
```

## API reference

### `withCroct` (JavaScript)

Entry point for the JavaScript family. Intercepts Storyblok API calls and replaces content that
references slots with dynamic content. Signatures and import paths are in the table above.

### `resolveContent` (JavaScript, low level)

```ts
function resolveContent(content: unknown, fetcher: ContentFetcher): Promise<unknown>
```

Walks a Storyblok content tree (a story or any nested structure) and returns a copy with every
slot-linked block replaced by Croct content in the Storyblok shape. `withCroct` uses it internally;
use it directly only for custom integrations the wrappers do not cover. Blocks keep their original
content when a fetch returns nothing or fails.

```ts
import croct from '@croct/plug';
import {resolveContent} from '@croct/plug-storyblok';

const personalizedStory = await resolveContent(
    story,
    slotId => croct.fetch(slotId, {includeSchema: true}),
);
```

The fetcher **must** request the content schema (`includeSchema: true`); the conversion to the
Storyblok shape is schema-driven.

### `ContentFetcher` (JavaScript type)

```ts
type ContentFetcher = (id: string) => Promise<FetchResponse | undefined>;
```

Receives the slot ID and resolves to the slot's content response. Resolving to `undefined` keeps the
block's own content; this is how the integration skips personalization in the visual editor.

### `CroctStoriesApi` (PHP)

```php
public function __construct(
    StoriesApiInterface $api,
    Plug $plug,
    ?ContentResolver $resolver = null,
)
```

| Parameter  | Type                  | Description                                                                                       |
|------------|-----------------------|---------------------------------------------------------------------------------------------------|
| `api`      | `StoriesApiInterface` | The Storyblok Stories API to decorate.                                                            |
| `plug`     | `Plug`                | The Croct SDK instance used to fetch content.                                                     |
| `resolver` | `ContentResolver`     | Optional, default `null`. Advanced: converts Croct content to the Storyblok shape. Default handles the standard schema. |

Implements the same `StoriesApiInterface` it wraps, so it is a drop-in replacement. Every read method
(`bySlug`, `byId`, `all`) returns stories with linked blocks resolved; a failed fetch leaves the block
unchanged.

## Usage

Fetch and render stories exactly as before. The `language` passed to Storyblok is forwarded to Croct,
so visitors get content for the matching slot locale.

```js
const {data} = await storyblokApi.get('cdn/stories/home', {
  version: 'published',
  language: 'en',
});
// Render data.story.content.body with your own components.
```

```php
<?php
use Storyblok\Api\Request\StoryRequest;

$response = $stories->bySlug('home', new StoryRequest(language: 'en'));
```

In Symfony or Laravel, type-hint `Storyblok\Api\StoriesApiInterface` in the controller constructor;
the injected service is already decorated.

## Editor workflow (relay to the user)

- **Make a block dynamic:** Storyblok > Apps > Optimize app > Dynamic blocks > toggle the block on.
  This adds the Optimize field to the block.
- **Link a block to a slot:** open the story, open the block settings, use the Optimize field to
  select a slot or click **+ Create**, save, click "Connect this slot", then click **Add** on the
  slots page. Status moves from **Missing** to **Active**.
- Table and reference fields are **not supported**. Blocks containing them show **Conflicting**.

Slot statuses in the app:

| Status       | Meaning                                                              |
|--------------|----------------------------------------------------------------------|
| Active       | In use, schema up to date.                                           |
| Outdated     | Out of sync with the story's block. Use **Sync schema**.             |
| Missing      | Referenced in a story but not created yet. Use **Add slot**.         |
| Conflicting  | Referenced by multiple stories with incompatible blocks.             |
| Unreferenced | Exists but no story references it.                                   |

**Mirror content** copies the block content into the slot default content, a useful base for
experience and variant content. Storyblok content acts as the default and fallback for visitors not
targeted by any active experience.

## Verify

1. Load a page that renders the linked block; the default Storyblok content shows.
2. Publish an experience or AB test targeting the slot.
3. Reload as a visitor matching the audience; the dynamic content replaces the block.

Demo project: `https://github.com/croct-tech/croct-storyblok-project`.

## Sources

- https://docs.croct.com/immersion/integrations/cms/storyblok/integration.md
- https://docs.croct.com/immersion/integrations/cms/storyblok/guide.md
- https://docs.croct.com/reference/sdk/storyblok.md
- https://docs.croct.com/reference/sdk/storyblok/integration.md
- https://docs.croct.com/reference/sdk/storyblok/usage.md
- https://docs.croct.com/reference/sdk/storyblok/manual-installation/javascript.md
- https://docs.croct.com/reference/sdk/storyblok/manual-installation/php.md
- https://docs.croct.com/reference/sdk/storyblok/api/javascript/functions/with-croct.md
- https://docs.croct.com/reference/sdk/storyblok/api/javascript/functions/resolve-content.md
- https://docs.croct.com/reference/sdk/storyblok/api/javascript/types/content-fetcher.md
- https://docs.croct.com/reference/sdk/storyblok/api/php/croct-stories-api.md
