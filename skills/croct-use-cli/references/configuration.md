# Configuration, type generation, and fallback content

## Configuration file (`croct.json`)

Created by `croct init`. Stores organization/workspace identifiers, application mapping, locales,
the slots and components the project uses, and directory paths. Use `--config <path>` to point
the CLI at a different file.

```json
{
  "$schema": "https://schema.croct.com/json/v1/project.json",
  "organization": "acme",
  "workspace": "default",
  "applications": {
    "development": "my-app-dev",
    "production": "my-app"
  },
  "defaultLocale": "en",
  "locales": ["en", "pt-br"],
  "slots": {},
  "components": {},
  "paths": {
    "source": "src",
    "components": "src/components"
  }
}
```

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `$schema` | string | no | `https://schema.croct.com/json/v1/project.json` for editor validation and autocomplete. |
| `organization` | string | yes | ID of the owning organization. |
| `workspace` | string | yes | ID of the workspace. |
| `applications.development` | string | yes | Development application ID. |
| `applications.production` | string | no | Production application ID. |
| `defaultLocale` | string | yes | Default locale, e.g. `en`, `pt-br`. |
| `locales` | string[] | yes | Supported locales. |
| `slots` | Record<string, string> | yes | Slot ID -> version specifier. Managed by `add`/`remove`/`upgrade`. Controls which versions get types and fallback content. |
| `components` | Record<string, string> | yes | Component ID -> version specifier. Managed by the CLI. Controls which versions get types. |
| `paths` | object | no | Custom directories; auto-detected from the project type when omitted. Templates use them to place generated code. |

`paths` keys (all optional, auto-detected):

| Key | Example | Purpose |
| --- | --- | --- |
| `source` | `src` | Application source root. |
| `utilities` | `src/lib` | Helpers and shared code. |
| `components` | `src/components` | UI components; templates download components here. |
| `examples` | `src/examples` | Where `add slot --example` writes usage examples; templates can use it too. |
| `content` | (project root) | Where the CLI writes content files such as fallback data and type definitions. |

### Version specifiers

`slots` and `components` values select **major versions** to generate types and content for.

| Format | Example | Meaning |
| --- | --- | --- |
| Exact | `"3"` | One major version. |
| Range | `"1 - 3"` | Versions 1 through 3, inclusive. |
| Set | `"1, 3, 5"` | Exactly those versions. |

```json
{
  "slots": {
    "home-hero": "1 - 3",
    "banner": "2",
    "footer": "1, 4"
  }
}
```

This yields types and default content for `home-hero` 1, 2, 3; `banner` 2; `footer` 1 and 4.

Rule: when code references `slot@N`, version `N` must be covered by that slot's specifier, or
the type (and fallback content) for it will not exist. After editing specifiers by hand, run
`croct update`.

## Type generation

On every `add`, `remove`, `install`, `update`, or `upgrade`, the CLI fetches the slot and
component schemas from the workspace and generates type definitions for the SDK in use, per
version allowed by the specifiers.

- TypeScript: writes `slots.d.ts` and registers it in `tsconfig.json` automatically.
- PHP: writes `slots.stub`, loaded automatically by the SDK's PHPStan and Psalm plugins.
- Result: `fetchContent('home-hero@2')`, `useContent(...)` and similar return the correct content
  type with no manual annotations.

**Slot types** describe the content you fetch for a slot. **Component types** describe reusable
structures inside slots, so shared rendering code can be typed once.

| SDK | Import types from |
| --- | --- |
| React | `@croct/plug-react` |
| Next.js | `@croct/plug-next` |
| Vue | `@croct/plug-vue` |
| Nuxt | `@croct/plug-nuxt/types` |
| JavaScript | `@croct/plug` |

```tsx
import type {SlotContent, ComponentContent} from '@croct/plug-react';

type HeroContent = SlotContent<'home-hero@1'>;
type CardProps = ComponentContent<'card@1'>;

function Card(props: CardProps) {
  return <div>{props.title}</div>;
}
```

Versioned ID types: append `@<version>` to pin, or omit it (or use `@latest`) to follow the
latest.

```ts
import type {SlotContent, VersionedSlotId, ComponentContent, VersionedComponentId} from '@croct/plug-next';

const slotId: VersionedSlotId = 'home-banner@1';
const componentId: VersionedComponentId = 'card@latest';
type Banner = SlotContent<'home-banner@1'>;
type Card = ComponentContent<'card@1'>;
```

PHP (PHPStan/Psalm): import `HomeHero`/`HomeBannerV1` from `\Croct\Content\Slots`, `Card`/`CardV1`
from `\Croct\Content\Components`, `SlotId` from `\Croct\Content\MappedSlots`, and `ComponentId`
from `\Croct\Content\MappedComponents`:

```php
<?php
/**
 * @phpstan-import-type HomeHero from \Croct\Content\Slots
 * @psalm-import-type HomeHero from \Croct\Content\Slots
 */
final class HomePage
{
    /** @param HomeHero $hero */
    public function render(array $hero): string
    {
        return "<h1>{$hero['title']}</h1>";
    }
}
```

Version control: the generated file does not need to be committed (it is regenerated on
install), but committing it is recommended to avoid fetching definitions from the API at build
time.

## Fallback content

The CLI downloads each slot's **default content** for every slot, version, and locale in the
configuration and stores it locally. The SDK loads it automatically when dynamic content is
unavailable.

Resolution order the SDK follows:

1. Dynamic content (personalized or targeted, from the API).
2. Explicit fallback passed in code.
3. Default content downloaded by the CLI.
4. Error, if none is available.

Read it directly, optionally for a locale:

```ts
import {getSlotContent} from '@croct/content';

const content = getSlotContent('home-hero', 'en-us');
```

```php
<?php
use Croct\Plug\Content\DefaultContentProvider;

$provider = DefaultContentProvider::fromProject();
$content = $provider?->getSlotContent('home-hero', 'en-us');
```

## Synchronization rules

| Command | Effect on types and fallback content | Changes specifiers? |
| --- | --- | --- |
| `install` | Regenerates all types, re-downloads all content | No |
| `update` | Re-fetches schemas and content | No |
| `upgrade` | Bumps to newer majors, then regenerates | Yes |
| `add slot` | Adds slot, its types and content | Adds entry |
| `add component` | Adds component and its types | Adds entry |
| `remove slot` / `remove component` | Removes and regenerates | Removes entry |

- Depending on the SDK, `install` registers a postinstall hook so installing dependencies runs
  `croct install` automatically. Without the hook, run `croct install` after cloning.
- The admin prompts the user with the right sync command after changes that need one.
- After `upgrade`, update version references in code (`home-hero@1` -> `home-hero@2`).

## Sources

- https://docs.croct.com/reference/cli/configuration.md
- https://docs.croct.com/reference/cli/type-generation.md
- https://docs.croct.com/reference/cli/fallback-content.md
- https://docs.croct.com/immersion/guides/keeping-project-in-sync.md
- https://docs.croct.com/introduction/getting-started.md
