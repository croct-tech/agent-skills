# Laravel SDK (`croct/plug-laravel`)

Laravel package built on the PHP SDK. It auto-registers a `Croct\Plug\Plug` service, syncs identity
with Laravel auth, detects the locale, writes session cookies, injects the browser SDK, and marks
personalized responses private. Every `Plug` method, option class, response type, and exception is
the PHP core API documented in `php.md`; this file covers only what Laravel adds.

## Install

Preferred:

```sh
npx croct@latest init
```

Manual:

```sh
composer require croct/plug-laravel
```

- The service provider is auto-discovered; nothing to register.
- A PSR-18 HTTP client and PSR-7 factories are pulled in; nothing else to install.

```bash
# .env
CROCT_APP_ID=<APPLICATION_ID>
CROCT_API_KEY=<API_KEY>
```

Optional: publish the config to customize it.

```sh
php artisan vendor:publish --tag=croct-config
```

This creates `config/croct.php`.

Do not call `Croct::fromDotenv()`, `Croct::emitCookies()`, or echo `getPlugOptions()` in Laravel:
the package builds the SDK, writes the cookies, and injects the loader for you.

## Configuration (`config/croct.php`)

| Option | Type | Default | Description |
|---|---|---|---|
| `app_id` | string | `CROCT_APP_ID` env | Application ID. Required. |
| `api_key` | string | `CROCT_API_KEY` env | API key used to sign visitor tokens. Required; keep it in the environment. |
| `base_endpoint_url` | string | `null` | API base URL. Override only for tests (mock server). |
| `token_duration` | int | `86400` | Visitor token lifetime, seconds. |
| `debug` | bool | follows app debug mode | Browser SDK console logging. Env: `CROCT_DEBUG`. |
| `locale.enabled` | bool | `true` | Detect locale from the request. |
| `locale.default` | string | `null` | Overrides the detected locale, or fixes it when detection is off. |
| `cookie.domain` | string | `null` (current host) | Cookie domain. |
| `cookie.secure` | bool | `true` | HTTPS-only cookies. |
| `cookie.same_site` | string | `none` | `strict`, `lax`, or `none`. |
| `script.auto_inject` | bool | `true` | Inject the browser SDK loader into HTML responses. |
| `script.placement` | string | `head` | `head` or `body` (end of body). |
| `script.path` | string\|null | `/_croct/plug.js` | First-party path serving the SDK; `null` loads from the CDN. |
| `script.mode` | string | `defer` | `defer`, `async`, or `sync` (blocking). |
| `storyblok.enabled` | bool | `true` | Auto-personalize Storyblok content; needs `croct/plug-storyblok` and a bound Storyblok Stories API. |

Documented env vars: `CROCT_APP_ID`, `CROCT_API_KEY`, `CROCT_DEBUG`, `CROCT_BASE_ENDPOINT_URL`
(the last is used in the testing guide).

## Fetching content

Type-hint `Croct\Plug\Plug` in a route closure, controller, or service. There is no documented
Croct facade; use dependency injection.

```php
<?php
// routes/web.php
use Croct\Plug\FetchOptions;
use Croct\Plug\Plug;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Plug $croct) {
    $options = FetchOptions::defaults()->withFallback([
        'title' => 'Welcome to Croct!',
        'subtitle' => 'The easiest way to personalize your application.',
        'image' => ['url' => '/images/hero.png', 'alt' => 'Hero image'],
        'button' => ['label' => 'Get started', 'url' => '/signup'],
    ]);
    $hero = $croct->fetchContent('home-hero@1', $options)->getContent();

    return view('home', ['hero' => $hero]);
});
```

```blade
{{-- resources/views/home.blade.php --}}
<section class="hero">
    <h1>{{ $hero['title'] }}</h1>
    <p class="subtitle">{{ $hero['subtitle'] }}</p>
    <img src="{{ $hero['image']['url'] }}" alt="{{ $hero['image']['alt'] }}">
    <a href="{{ $hero['button']['url'] }}">{{ $hero['button']['label'] }}</a>
</section>
```

- Add slots with `npx croct@latest add slot home-hero@1` (downloads default content as automatic fallback,
  generates `slots.stub` for PHPStan/Psalm typing).
- Versioning (`home-hero@2`), `withPreferredLocale`, `withAttribute`, and metadata work exactly as
  in `php.md`.
- Locale is detected automatically; call `withPreferredLocale()` only to force a specific one.

## Evaluating queries

```php
<?php
use Croct\Plug\EvaluationOptions;
use Croct\Plug\Plug;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Plug $croct) {
    $returning = $croct->evaluate('user is returning', EvaluationOptions::defaults()->withFallback(false));

    return view('home', ['returning' => $returning]);
});
```

## Identity resolver

Default: with Laravel authentication, the package reconciles the visitor with the authenticated
user on every request, using the user's primary key as the user ID. No code required.

Custom identifier (for example email): implement `IdentityResolver` and bind it.

```php
<?php
// app/Croct/AuthIdentityResolver.php
namespace App\Croct;

use App\Models\User;
use Croct\Plug\IdentityResolver;
use Illuminate\Contracts\Auth\Factory as AuthFactory;

final class AuthIdentityResolver implements IdentityResolver
{
    private AuthFactory $auth;

    public function __construct(AuthFactory $auth)
    {
        $this->auth = $auth;
    }

    public function getUserId(): ?string
    {
        $user = $this->auth->guard()->user();

        return $user instanceof User ? (string) $user->email : null;
    }
}
```

```php
// app/Providers/AppServiceProvider.php
use App\Croct\AuthIdentityResolver;
use Croct\Plug\IdentityResolver;

public function register(): void
{
    $this->app->singleton(IdentityResolver::class, AuthIdentityResolver::class);
}
```

Without Laravel auth: implement the same interface from your session/token; return `null` for
anonymous. The injected `Plug` also exposes `identify()` / `anonymize()` for imperative control.

The docs do not list an `identity.enabled` option for Laravel (Symfony has one).

## Locale resolver

Detected from the Laravel application locale and forwarded as the preferred locale. Controlled by
`locale.enabled` / `locale.default`:

```php
// config/croct.php
'locale' => [
    'default' => 'en-us',
],
```

Full control: implement `Croct\Plug\LocaleResolver` and bind it.

```php
// app/Providers/AppServiceProvider.php
use App\Croct\AccountLocaleResolver;
use Croct\Plug\LocaleResolver;

$this->app->singleton(LocaleResolver::class, AccountLocaleResolver::class);
```

## Blade: `@croct` directive

Runs a JavaScript snippet once the browser SDK has loaded, with `croct` in scope, regardless of
`script.mode`. Use it for event tracking and profile/session attributes.

| Form | Description |
|---|---|
| `@croct ... @endcroct` | Deferred snippet. |
| `@croct($nonce) ... @endcroct` | Adds a CSP nonce to the generated `<script>` tag. |

```blade
{{-- resources/views/layouts/app.blade.php --}}
<!DOCTYPE html>
<html>
    <head><title>My application</title></head>
    <body>
        @yield('content')
        @auth
            @croct
                croct.user.edit()
                    .set('name', @json(auth()->user()->name))
                    .set('email', @json(auth()->user()->email))
                    .save();
            @endcroct
        @endauth
    </body>
</html>
```

```blade
{{-- resources/views/checkout.blade.php --}}
@extends('layouts.app')
@section('content')
    <button id="place-order">Place order</button>
    @croct
        document.getElementById('place-order').addEventListener('click', () => {
            croct.track('goalCompleted', {goalId: 'paymentApproved'});
        });
    @endcroct
@endsection
```

Session attributes: `croct.session.edit().set('plan', value).save();`. Pass server values with
`@json(...)`. For the client API and recommended events, see the JavaScript SDK reference.

## Storage and cookies

The package writes the session cookies to the response itself. Configure them through the
`cookie.*` options; do not instantiate `CookieStorage` or call `emitCookies()`.

## Caching

- Any response that fetched personalized content, evaluated a query, or identified the user is
  marked `Cache-Control: private` automatically. Responses that render only static content
  (`withStaticContent()`) stay cacheable.
- If your CDN/proxy ignores `private` or forces caching, exclude personalized routes first.

| Approach | First load final | No flicker | Crawler-visible | Shared-cacheable |
|---|---|---|---|---|
| Server (`Plug` in route/controller) | Yes | Yes | Yes | No |
| Client (`@croct` + `croct.fetch`) | No | No | No | Yes |

The docs' caching page writes `croct.fetchContent(...)` in this snippet; the JavaScript SDK method is
`croct.fetch`.

```blade
@extends('layouts.app')
@section('content')
    <section id="hero"><h1>Welcome to Croct!</h1></section>
    @croct
        const heading = document.querySelector('#hero h1');
        croct.fetch('home-hero@1').then(({content}) => {
            heading.textContent = content.title;
        });
    @endcroct
@endsection
```

## Testing

Unit: mock `Plug` with PHPUnit and pass it to your service (see `php.md`).

Feature: swap the container binding.

```php
<?php
namespace Tests\Feature;

use Croct\Plug\FetchResponse;
use Croct\Plug\Plug;
use Tests\TestCase;

final class HomePageTest extends TestCase
{
    public function testRendersHero(): void
    {
        $this->mock(Plug::class, function ($mock) {
            $mock->shouldReceive('fetchContent')
                ->andReturn(new FetchResponse(['title' => 'Welcome']));
        });

        $this->get('/')->assertSee('Welcome');
    }
}
```

Real SDK against a mock server:

```xml
<!-- phpunit.xml -->
<php>
    <env name="CROCT_BASE_ENDPOINT_URL" value="http://localhost:8080"/>
</php>
```

## Troubleshooting

| Symptom | Action |
|---|---|
| Fetch/evaluation failures | Check `storage/logs/laravel.log`, or `php artisan pail` (logged via Monolog). |
| No browser console logs | `debug` follows `APP_DEBUG`; force with `CROCT_DEBUG=true`. |
| Loader missing in HTML | Check `script.auto_inject`; response must be HTML. |
| Need CSP compliance for snippets | Use `@croct($nonce)`. |
| Wrong language | Check app locale, `locale.enabled`, `locale.default`, or bind a `LocaleResolver`. |
| Personalized page served to others | Ensure the cache honors `Cache-Control: private`. |

## Sources

- https://docs.croct.com/reference/sdk/laravel/integration.md
- https://docs.croct.com/reference/sdk/laravel/manual-installation.md
- https://docs.croct.com/reference/sdk/laravel/content-rendering.md
- https://docs.croct.com/reference/sdk/laravel/query-evaluation.md
- https://docs.croct.com/reference/sdk/laravel/data-collection.md
- https://docs.croct.com/reference/sdk/laravel/event-tracking.md
- https://docs.croct.com/reference/sdk/laravel/caching.md
- https://docs.croct.com/reference/sdk/laravel/testing.md
- https://docs.croct.com/reference/sdk/laravel/troubleshooting.md
- https://docs.croct.com/reference/sdk/laravel/api.md
- https://docs.croct.com/reference/sdk/laravel/api/configuration.md
- https://docs.croct.com/reference/sdk/laravel/api/blade.md
