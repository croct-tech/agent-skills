# Drupal SDK (`croct/plug-drupal`)

Drupal module built on the PHP and Symfony SDKs. It registers a `Croct\Plug\Plug` service, syncs
identity with the Drupal user, detects the locale through Drupal language negotiation, writes
session cookies, injects the browser SDK, exposes the Symfony Twig helpers, and marks personalized
responses private while adding the `session` cache context. Every `Plug` method, option class,
response type, and exception is the PHP core API in `php.md`; the Twig helpers are documented in
`symfony.md`. This file covers only what Drupal adds.

## Install

Preferred:

```sh
npx croct@latest init
```

Manual:

```sh
composer require croct/plug-drupal
drush en croct            # or enable "Croct" at /admin/modules
```

This pulls in the PHP and Symfony SDKs and a PSR-18 HTTP client.

```php
// settings.php (or settings.local.php)
$settings['croct.app_id'] = '<APPLICATION_ID>';
$settings['croct.api_key'] = '<API_KEY>';
```

```sh
drush cr   # required after any croct.* change: settings.php is compiled into the cached container
```

## Configuration (`settings.php`)

Each setting is a top-level `$settings` key prefixed with `croct.`.

| Setting | Type | Default | Description |
|---|---|---|---|
| `croct.app_id` | string | required | Application ID. |
| `croct.api_key` | string | required | API key used to sign visitor tokens. |
| `croct.debug` | bool | `false` | Browser SDK console logging. |
| `croct.script.url` | string | Croct CDN | Loader URL; set a first-party path or a pinned version. |
| `croct.script.mode` | string | `defer` | `defer`, `async`, or `sync` (blocking). |
| `croct.storyblok.enabled` | bool | `true` | Auto-personalize Storyblok; needs `croct/plug-storyblok` and a bound Storyblok Stories API. |

The Drupal docs list no cookie, locale, token-duration, or base-endpoint settings. Check the live
configuration page before assuming any other key exists.

## Fetching content (block plugin)

Place personalized content with a block plugin that injects `Plug`. Always add the `session`
cache context so Drupal's render and page caches vary per visitor.

```php
<?php
// web/modules/custom/my_module/src/Plugin/Block/HomeHeroBlock.php
declare(strict_types=1);

namespace Drupal\my_module\Plugin\Block;

use Croct\Plug\FetchOptions;
use Croct\Plug\Plug;
use Drupal\Core\Block\Attribute\Block;
use Drupal\Core\Block\BlockBase;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Symfony\Component\DependencyInjection\ContainerInterface;

#[Block( // PHP attribute: discovered by Drupal core 10.2+; on 10.0/10.1 use the @Block annotation
    id: 'home_hero',
    admin_label: new TranslatableMarkup('Home hero'),
)]
final class HomeHeroBlock extends BlockBase implements ContainerFactoryPluginInterface
{
    private Plug $croct;

    public function __construct(array $configuration, string $pluginId, mixed $pluginDefinition, Plug $croct)
    {
        parent::__construct($configuration, $pluginId, $pluginDefinition);
        $this->croct = $croct;
    }

    public static function create(ContainerInterface $container, array $configuration, $pluginId, $pluginDefinition): self
    {
        return new self($configuration, $pluginId, $pluginDefinition, $container->get(Plug::class));
    }

    public function build(): array
    {
        $options = FetchOptions::defaults()->withFallback([
            'title' => 'Welcome to Croct!',
            'subtitle' => 'The easiest way to personalize your site.',
        ]);
        $hero = $this->croct->fetchContent('home-hero', $options)->getContent();

        return [
            '#type' => 'inline_template',
            '#template' => <<<'TWIG'
                <section class="hero">
                    <h1>{{ hero.title }}</h1>
                    <p class="subtitle">{{ hero.subtitle }}</p>
                    <a href="{{ hero.button.url }}">{{ hero.button.label }}</a>
                </section>
                TWIG,
            '#context' => ['hero' => $hero],
            '#cache' => ['contexts' => ['session']],
        ];
    }
}
```

Place the block from **Block layout** (`/admin/structure/block`).

- Add slots with `npx croct@latest add slot home-hero` (default content as fallback, typings in
  `slots.stub`).
- Versioning, `withPreferredLocale`, `withAttribute`, and metadata: see `php.md`.

## Evaluating queries

Inject `Plug` into a block, controller, or service:

```php
public function build(): array
{
    $returning = $this->croct->evaluate('user is returning') === true;

    return [
        '#markup' => $returning ? $this->t('Welcome back!') : $this->t('Welcome to Croct!'),
        '#cache' => ['contexts' => ['session']],
    ];
}
```

Use `EvaluationOptions::defaults()->withFallback(false)` for resilience (see `php.md`).

## Identity resolver

Default: reconciles the visitor with the authenticated Drupal user on every request, using the
Drupal user ID. No code required.

Custom identifier (for example email): implement `IdentityResolver` and override the module's
`Drupal\croct\AccountIdentityResolver` service.

```php
<?php
// web/modules/custom/my_module/src/EmailIdentityResolver.php
declare(strict_types=1);

namespace Drupal\my_module;

use Croct\Plug\IdentityResolver;
use Drupal\Core\Session\AccountInterface;

final class EmailIdentityResolver implements IdentityResolver
{
    private AccountInterface $account;

    public function __construct(AccountInterface $account)
    {
        $this->account = $account;
    }

    public function getUserId(): ?string
    {
        return $this->account->isAnonymous() ? null : $this->account->getEmail();
    }
}
```

```yaml
# web/modules/custom/my_module/my_module.services.yml
services:
    Drupal\croct\AccountIdentityResolver:
        class: Drupal\my_module\EmailIdentityResolver
        arguments: ['@current_user']
```

## Locale resolver

Detected from Drupal language negotiation and forwarded as the preferred locale. To use each
user's preferred language instead, implement `LocaleResolver` and override
`Drupal\croct\LanguageManagerLocaleResolver`.

```php
<?php
// web/modules/custom/my_module/src/AccountLocaleResolver.php
declare(strict_types=1);

namespace Drupal\my_module;

use Croct\Plug\LocaleResolver;
use Drupal\Core\Session\AccountInterface;

final class AccountLocaleResolver implements LocaleResolver
{
    private AccountInterface $account;

    public function __construct(AccountInterface $account)
    {
        $this->account = $account;
    }

    public function getLocale(): ?string
    {
        return $this->account->getPreferredLangcode() ?: null;
    }
}
```

```yaml
# web/modules/custom/my_module/my_module.services.yml
services:
    Drupal\croct\LanguageManagerLocaleResolver:
        class: Drupal\my_module\AccountLocaleResolver
        arguments: ['@current_user']
```

## Twig: browser-side tracking and attributes

Drupal uses the Symfony `croct` Twig filter (see `symfony.md`) to run JS once the browser SDK has
loaded:

```twig
{% apply croct %}
    document.getElementById('place-order').addEventListener('click', () => {
        croct.track('goalCompleted', {goalId: 'paymentApproved'});
    });
{% endapply %}
```

```twig
{% apply croct %}
    const selector = document.getElementById('plan-selector');
    selector.addEventListener('change', () => {
        croct.session.edit().set('plan', selector.value).save();
    });
{% endapply %}
```

## Storage and cookies

The module writes the session cookies itself. Do not instantiate `CookieStorage` or call
`emitCookies()`. No cookie settings are documented for Drupal.

## Caching

- When a response fetches personalized content, evaluates a query, or identifies the user, the
  module marks it private and adds the `session` cache context. Static-content-only responses stay
  cacheable.
- Still add `'#cache' => ['contexts' => ['session']]` to personalized render arrays so the render
  and dynamic page caches vary per visitor.

| Approach | First load final | No flicker | Crawler-visible | Shared-cacheable |
|---|---|---|---|---|
| Server (block with `Plug`) | Yes | Yes | Yes | No |
| Client (`croct` filter + `croct.fetch`) | No | No | No | Yes |

The docs' caching page writes `croct.fetchContent(...)` in this snippet; the JavaScript SDK method is
`croct.fetch`.

```twig
<section id="hero"><h1>Welcome to Croct!</h1></section>
{% apply croct %}
    const heading = document.querySelector('#hero h1');
    croct.fetch('home-hero@1').then(({content}) => {
        heading.textContent = content.title;
    });
{% endapply %}
```

## Testing

Unit:

```php
<?php
declare(strict_types=1);

use Croct\Plug\FetchResponse;
use Croct\Plug\Plug;
use PHPUnit\Framework\TestCase;

final class HomeHeroBlockTest extends TestCase
{
    public function testBuildsHero(): void
    {
        $croct = $this->createMock(Plug::class);
        $croct->method('fetchContent')->willReturn(new FetchResponse(['title' => 'Welcome']));

        $block = new HomeHeroBlock([], 'home_hero', [], $croct);

        $this->assertSame('Welcome', $block->build()['#context']['hero']['title']);
    }
}
```

Kernel (`KernelTestBase`): swap the container service.

```php
<?php
declare(strict_types=1);

use Croct\Plug\FetchResponse;
use Croct\Plug\Plug;
use Drupal\KernelTests\KernelTestBase;

final class HomeHeroBlockKernelTest extends KernelTestBase
{
    protected static $modules = ['croct', 'my_module'];

    public function testRendersHero(): void
    {
        $croct = $this->createMock(Plug::class);
        $croct->method('fetchContent')->willReturn(new FetchResponse(['title' => 'Welcome']));
        $this->container->set(Plug::class, $croct);

        // Build your block and assert on the render array.
    }
}
```

## Troubleshooting

| Symptom | Action |
|---|---|
| Fetch/evaluation failures | `croct` logger channel: **Reports > Recent log messages** (`/admin/reports/dblog`, type `croct`) or `drush watchdog:show --type=croct`. |
| Settings change has no effect | Run `drush cr`. |
| No browser console logs | `$settings['croct.debug'] = TRUE;` then `drush cr`. |
| Same personalized block shown to everyone | Add `'#cache' => ['contexts' => ['session']]`; check CDN honors `Cache-Control: private`. |
| `Plug` service not found | Module not enabled (`drush en croct`). |

## Sources

- https://docs.croct.com/reference/sdk/drupal/integration.md
- https://docs.croct.com/reference/sdk/drupal/manual-installation.md
- https://docs.croct.com/reference/sdk/drupal/content-rendering.md
- https://docs.croct.com/reference/sdk/drupal/query-evaluation.md
- https://docs.croct.com/reference/sdk/drupal/data-collection.md
- https://docs.croct.com/reference/sdk/drupal/event-tracking.md
- https://docs.croct.com/reference/sdk/drupal/caching.md
- https://docs.croct.com/reference/sdk/drupal/testing.md
- https://docs.croct.com/reference/sdk/drupal/troubleshooting.md
- https://docs.croct.com/reference/sdk/drupal/api.md
- https://docs.croct.com/reference/sdk/drupal/api/configuration.md
- https://docs.croct.com/reference/sdk/symfony/api/twig/croct-filter.md
