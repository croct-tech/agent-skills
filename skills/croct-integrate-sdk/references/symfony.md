# Symfony SDK (`croct/plug-symfony`)

Symfony bundle built on the PHP SDK. It registers a `Croct\Plug\Plug` service, syncs identity with
Symfony Security, detects the locale, writes session cookies, injects the browser SDK, provides
Twig helpers, and marks personalized responses private. Every `Plug` method, option class, response
type, and exception is the PHP core API documented in `php.md`; this file covers only what Symfony
adds.

## Install

Preferred:

```sh
npx croct@latest init
```

Manual:

```sh
composer require croct/plug-symfony symfony/twig-bundle
```

A PSR-18 HTTP client and PSR-7 factories are pulled in. Register the bundle:

```php
<?php
// config/bundles.php
return [
    // ...
    Croct\Plug\Symfony\CroctBundle::class => ['all' => true],
];
```

```bash
# .env
CROCT_APP_ID=<APPLICATION_ID>
CROCT_API_KEY=<API_KEY>
```

```yaml
# config/packages/croct.yaml
croct:
    app_id: '%env(CROCT_APP_ID)%'
    api_key: '%env(CROCT_API_KEY)%'
```

Do not call `Croct::fromDotenv()`, `Croct::emitCookies()`, or render `getPlugOptions()` manually:
the bundle builds the SDK, writes the cookies, and injects the loader.

## Configuration (`config/packages/croct.yaml`)

| Option | Type | Default | Description |
|---|---|---|---|
| `app_id` | string | required | Application ID. |
| `api_key` | string | required | API key used to sign visitor tokens; reference via env var. |
| `base_endpoint_url` | string | `null` | API base URL; override only for tests. |
| `token_duration` | int | `86400` | Visitor token lifetime, seconds. |
| `debug` | bool | `%kernel.debug%` | Browser SDK console logging (on in dev). |
| `locale.enabled` | bool | `true` | Detect locale from the request. |
| `locale.default` | string | `null` | Overrides the detected locale, or fixes it when detection is off. |
| `identity.enabled` | bool | `true` | Sync the visitor with the authenticated Symfony Security user. |
| `cookie.domain` | string | `null` (current host) | Cookie domain. |
| `cookie.secure` | bool | `true` | HTTPS-only cookies. |
| `cookie.same_site` | string | `none` | `strict`, `lax`, or `none`. |
| `script.auto_inject` | bool | `true` | Inject the browser SDK loader into HTML responses. |
| `script.placement` | string | `head` | `head` or `body` (end of body). |
| `script.path` | string\|false | `/_croct/plug.js` | First-party path serving the SDK; `false` loads from the CDN. |
| `script.mode` | string | `defer` | `defer`, `async`, or `sync` (blocking). |
| `storyblok.enabled` | bool | `true` | Auto-personalize Storyblok; needs `croct/plug-storyblok` and the Storyblok Symfony bundle. |

## Fetching content

Inject `Croct\Plug\Plug` into a controller action or constructor.

```php
<?php
// src/Controller/HomeController.php
namespace App\Controller;

use Croct\Plug\FetchOptions;
use Croct\Plug\Plug;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class HomeController extends AbstractController
{
    #[Route('/', name: 'home')]
    public function index(Plug $croct): Response
    {
        $options = FetchOptions::defaults()->withFallback([
            'title' => 'Welcome to Croct!',
            'subtitle' => 'The easiest way to personalize your application.',
            'image' => ['url' => '/images/hero.png', 'alt' => 'Hero image'],
            'button' => ['label' => 'Get started', 'url' => '/signup'],
        ]);
        $hero = $croct->fetchContent('home-hero@1', $options)->getContent();

        return $this->render('home/index.html.twig', ['hero' => $hero]);
    }
}
```

```twig
{# templates/home/index.html.twig #}
<section class="hero">
    <h1>{{ hero.title }}</h1>
    <p class="subtitle">{{ hero.subtitle }}</p>
    <img src="{{ hero.image.url }}" alt="{{ hero.image.alt }}">
    <a href="{{ hero.button.url }}">{{ hero.button.label }}</a>
</section>
```

- Add slots with `npx croct@latest add slot home-hero@1` (default content as automatic fallback, typings in
  `slots.stub`).
- Versioning, `withPreferredLocale`, `withAttribute`, and metadata: see `php.md`.
- Locale is detected automatically; use `withPreferredLocale()` only to force one.

## Evaluating queries

```php
<?php
namespace App\Controller;

use Croct\Plug\EvaluationOptions;
use Croct\Plug\Plug;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class HomeController extends AbstractController
{
    #[Route('/', name: 'home')]
    public function index(Plug $croct): Response
    {
        $returning = $croct->evaluate('user is returning', EvaluationOptions::defaults()->withFallback(false));

        return $this->render('home/index.html.twig', ['returning' => $returning]);
    }
}
```

## Identity resolver

Default: with Symfony Security configured, the bundle reconciles the visitor with the
authenticated user on every request, using the Symfony user identifier (email or username).
Controlled by `identity.enabled`.

Custom identifier (for example database ID):

```php
<?php
// src/Croct/AuthIdentityResolver.php
namespace App\Croct;

use App\Entity\User;
use Croct\Plug\IdentityResolver;
use Symfony\Bundle\SecurityBundle\Security;

final class AuthIdentityResolver implements IdentityResolver
{
    private Security $security;

    public function __construct(Security $security)
    {
        $this->security = $security;
    }

    public function getUserId(): ?string
    {
        $user = $this->security->getUser();

        return $user instanceof User ? (string) $user->getId() : null;
    }
}
```

```yaml
# config/services.yaml
services:
    Croct\Plug\IdentityResolver: '@App\Croct\AuthIdentityResolver'
```

Without Symfony Security: disable reconciliation and call `identify`/`anonymize` yourself.

```yaml
# config/packages/croct.yaml
croct:
    identity:
        enabled: false
```

```php
<?php
// src/Controller/SessionController.php
namespace App\Controller;

use Croct\Plug\Plug;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class SessionController extends AbstractController
{
    #[Route('/login', name: 'login', methods: ['POST'])]
    public function login(Request $request, Plug $croct): Response
    {
        $user = $this->authenticate($request); // your auth logic
        $croct->identify((string) $user->getId()); // the user ID must be a string

        return $this->redirectToRoute('dashboard');
    }

    #[Route('/logout', name: 'logout')]
    public function logout(Plug $croct): Response
    {
        $croct->anonymize();

        return $this->redirectToRoute('home');
    }
}
```

## Locale resolver

Detected from the request locale and forwarded as the preferred locale. Controlled by
`locale.enabled` / `locale.default`:

```yaml
# config/packages/croct.yaml
croct:
    locale:
        default: en-us
```

Full control: implement `Croct\Plug\LocaleResolver` and alias it.

```yaml
# config/services.yaml
services:
    Croct\Plug\LocaleResolver: '@App\Croct\AccountLocaleResolver'
```

## Twig helpers

Registered when Twig is installed.

| Helper | Kind | Signature | Use |
|---|---|---|---|
| `croct` | filter | `{% apply croct %} ... {% endapply %}` | Run JS once the browser SDK has loaded, with `croct` in scope, regardless of `script.mode`. |
| `croct_script` | function | `{{ croct_script(nonce = null) }}` | Render the loader `<script>` tags. Only when `script.auto_inject: false`; `nonce` adds a CSP nonce. |

The docs do not document a nonce argument for the `croct` filter.

```twig
{# templates/base.html.twig #}
<!DOCTYPE html>
<html>
    <head><title>My application</title></head>
    <body>
        {% block body %}{% endblock %}
        {% if app.user %}
            {% apply croct %}
                croct.user.edit()
                    .set('name', {{ app.user.fullName|json_encode|raw }})
                    .set('email', {{ app.user.email|json_encode|raw }})
                    .save();
            {% endapply %}
        {% endif %}
    </body>
</html>
```

```twig
{# templates/checkout/index.html.twig #}
{% extends 'base.html.twig' %}
{% block body %}
    <button id="place-order">Place order</button>
    {% apply croct %}
        document.getElementById('place-order').addEventListener('click', () => {
            croct.track('goalCompleted', {goalId: 'paymentApproved'});
        });
    {% endapply %}
{% endblock %}
```

Manual loader placement:

```yaml
# config/packages/croct.yaml
croct:
    script:
        auto_inject: false
```

```twig
<head>
    {{ croct_script() }}
</head>
```

Pass server values into snippets with `|json_encode|raw`. Session attributes:
`croct.session.edit().set('plan', value).save();`.

## Storage and cookies

The bundle writes the session cookies to the response. Configure them through `cookie.*`; do not
instantiate `CookieStorage` or call `emitCookies()`.

## Caching

- Responses that fetched personalized content, evaluated a query, or identified the user are marked
  `Cache-Control: private` automatically. Static-content-only responses stay cacheable.
- If your cache ignores `private` or forces caching, exclude personalized responses first.

| Approach | First load final | No flicker | Crawler-visible | Shared-cacheable |
|---|---|---|---|---|
| Server (`Plug` in controller) | Yes | Yes | Yes | No |
| Client (`croct` filter + `croct.fetch`) | No | No | No | Yes |
| Edge (ESI fragment) | Shell cached, fragment fresh per request | | | Shell yes, fragment no |

ESI: cache the page shell, personalize a fragment.

```yaml
# config/packages/framework.yaml
framework:
    esi: true
```

```twig
{# templates/home/index.html.twig #}
{% extends 'base.html.twig' %}
{% block body %}
    <h1>Welcome to Acme</h1>
    {{ render_esi(controller('App\\Controller\\HeroController::index')) }}
{% endblock %}
```

```php
<?php
// src/Controller/HeroController.php
namespace App\Controller;

use Croct\Plug\Plug;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;

final class HeroController extends AbstractController
{
    private Plug $croct;

    public function __construct(Plug $croct)
    {
        $this->croct = $croct;
    }

    public function index(): Response
    {
        $hero = $this->croct->fetchContent('home-hero@1')->getContent();

        return $this->render('home/_hero.html.twig', ['hero' => $hero]);
    }
}
```

Requires an ESI-capable gateway cache (Symfony HTTP cache, Varnish, or an ESI-capable CDN).

## Testing

Unit: mock `Plug` with PHPUnit (see `php.md`).

Functional (`WebTestCase`): replace the service in the test container.

```php
<?php
use Croct\Plug\FetchResponse;
use Croct\Plug\Plug;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class HomeControllerTest extends WebTestCase
{
    public function testRendersHero(): void
    {
        $client = static::createClient();
        $croct = $this->createMock(Plug::class);
        $croct->method('fetchContent')->willReturn(new FetchResponse(['title' => 'Welcome']));
        static::getContainer()->set(Plug::class, $croct);

        $client->request('GET', '/');

        self::assertSelectorTextContains('h1', 'Welcome');
    }
}
```

Real SDK against a mock server:

```yaml
# config/packages/test/croct.yaml
croct:
    base_endpoint_url: 'http://localhost:8080'
```

## Troubleshooting

| Symptom | Action |
|---|---|
| Fetch/evaluation failures | Logged via Monolog; `php bin/console server:log` in dev, or `var/log/dev.log`. |
| No browser console logs | `debug` defaults to `%kernel.debug%`; force with `croct.debug: true`. |
| Bundle services missing | Check `CroctBundle` in `config/bundles.php`. |
| Twig helpers missing | Install `symfony/twig-bundle`. |
| Loader missing / wrong spot | Check `script.auto_inject`, `script.placement`; or use `croct_script()`. |
| Wrong user ID | Check `identity.enabled` and any `IdentityResolver` alias. |
| Personalized page served to others | Ensure the cache honors `Cache-Control: private`; consider ESI. |

## Sources

- https://docs.croct.com/reference/sdk/symfony/integration.md
- https://docs.croct.com/reference/sdk/symfony/manual-installation.md
- https://docs.croct.com/reference/sdk/symfony/content-rendering.md
- https://docs.croct.com/reference/sdk/symfony/query-evaluation.md
- https://docs.croct.com/reference/sdk/symfony/data-collection.md
- https://docs.croct.com/reference/sdk/symfony/event-tracking.md
- https://docs.croct.com/reference/sdk/symfony/caching.md
- https://docs.croct.com/reference/sdk/symfony/testing.md
- https://docs.croct.com/reference/sdk/symfony/troubleshooting.md
- https://docs.croct.com/reference/sdk/symfony/api.md
- https://docs.croct.com/reference/sdk/symfony/api/configuration.md
- https://docs.croct.com/reference/sdk/symfony/api/twig.md
- https://docs.croct.com/reference/sdk/symfony/api/twig/croct-filter.md
- https://docs.croct.com/reference/sdk/symfony/api/twig/croct-script.md
