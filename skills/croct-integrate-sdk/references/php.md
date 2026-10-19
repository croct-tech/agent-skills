# PHP SDK (`croct/plug-php`)

Core server-side SDK for plain PHP. The Laravel, Symfony, and Drupal integrations wrap this SDK
and expose the same `Plug` operations, so everything under "Core API" applies to them too.

The PHP SDK runs on the server only: it fetches content, evaluates queries, and manages the
visitor identity. Event tracking and profile/session attributes run in the browser through the
JavaScript SDK, which you bootstrap from the server (see "Client-side handoff" below).

## Install

Preferred: run the CLI in the project root. It installs the SDK and wires the integration.

```sh
npx croct@latest init
```

Manual:

```sh
composer require croct/plug-php
```

The SDK auto-discovers any PSR-18 HTTP client and PSR-17 factories. If the project has none:

```sh
composer require guzzlehttp/guzzle nyholm/psr7
```

## Configure credentials

```bash
# .env
CROCT_APP_ID=<APPLICATION_ID>
CROCT_API_KEY=<API_KEY>
```

Get both from the application's Integration page in the Croct dashboard.

Environment variables read by `Croct::fromDotenv()` and `Croct::fromEnvironment()`:

| Variable | Required | Description |
|---|---|---|
| `CROCT_APP_ID` | Yes | Application ID. |
| `CROCT_API_KEY` | Yes | API key that authenticates requests. |
| `CROCT_TOKEN_DURATION` | No | Lifetime of the user token, in seconds. |
| `CROCT_BASE_ENDPOINT_URL` | No | Base URL for API calls (use for mock servers in tests). |

## Minimal working page

```php
<?php
// index.php
use Croct\Plug\Croct;

$croct = Croct::fromDotenv();
$content = $croct->fetchContent('home-banner')->getContent();
Croct::emitCookies(); // before any output
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>My application</title>
</head>
<body>
    <h1><?= htmlspecialchars($content['headline']) ?></h1>
    <p><?= htmlspecialchars($content['tagline']) ?></p>

    <script src="https://cdn.croct.io/js/v1/lib/plug.js"></script>
    <script>croct.plug(<?= json_encode($croct->getPlugOptions()) ?>);</script>
</body>
</html>
```

- `fromDotenv()` reads `CROCT_*` from `.env` (falling back to the process environment) and uses a
  cookie-based session store.
- `Croct::emitCookies()` writes the session cookies as `Set-Cookie` headers. Call it before output.
- `getPlugOptions()` returns the app ID and cookie configuration so the browser SDK reuses the same
  visitor session.
- Escape output yourself in plain PHP; Twig and Blade escape automatically.

## Choosing a factory

| Situation | Use |
|---|---|
| Credentials in a `.env` file, plain PHP | `Croct::fromDotenv()` |
| Credentials already in the process environment | `Croct::fromEnvironment()` |
| Need an identity resolver, custom storage, logger, HTTP client, debug, or content provider | `Croct::plug(...)` |
| Laravel / Symfony / Drupal | Do not build the SDK yourself; inject `Croct\Plug\Plug` (see the framework reference) |

Type-hint `Croct\Plug\Plug` (the interface) rather than the concrete `Croct` class, so code stays
decoupled and mockable.

## Client-side handoff

```php
<?php
use Croct\Plug\Croct;

$croct = Croct::fromDotenv();
Croct::emitCookies();
?>
<script src="https://cdn.croct.io/js/v1/lib/plug.js"></script>
<script>croct.plug(<?= json_encode($croct->getPlugOptions()) ?>);</script>
```

Once the browser SDK is running, track events and enrich profile/session data with the JavaScript
SDK (`croct.track(...)`, `croct.user.edit()`, `croct.session.edit()`).

Caching: pages that fetch personalized content or carry the session cookies are per-visitor.
Mark them private and never store them in a shared cache (CDN, reverse proxy). Plain PHP does not
do this for you; the Laravel, Symfony, and Drupal integrations do it automatically.

## Fetching content

```php
<?php
use Croct\Plug\Croct;
use Croct\Plug\FetchOptions;

$croct = Croct::fromDotenv();

// Basic
$hero = $croct->fetchContent('home-hero')->getContent();

// Pinned version (`<id>@<version>`; omitting it equals `@latest`)
$hero = $croct->fetchContent('home-hero@2')->getContent();

// Fallback, locale, and context attributes
$options = FetchOptions::defaults()
    ->withFallback(['title' => 'Welcome to Croct!'])
    ->withPreferredLocale('en-ca')
    ->withAttribute('plan', 'premium');
$hero = $croct->fetchContent('home-hero', $options)->getContent();
```

- Add slots with `npx croct@latest add slot home-hero`. The CLI downloads the slot's default content
  (used as automatic fallback) and writes typings to `slots.stub`.
- Without a fallback (and no CLI-downloaded default content), a failed fetch throws a
  `CroctException`.
- Missing locale falls back to the workspace default locale.
- Attributes are readable in CQL as `context's plan is "premium"`. The context limits the number
  of attributes and nesting depth; see the live `with-attribute` page for limits.

### Response metadata

Request metadata with `withSchema()`:

```php
<?php
use Croct\Plug\Content\ContentSource;
use Croct\Plug\Croct;
use Croct\Plug\FetchOptions;

$croct = Croct::fromDotenv();
$response = $croct->fetchContent('home-banner', FetchOptions::defaults()->withSchema());
$metadata = $response->getMetadata(); // ?SlotMetadata

if ($metadata !== null) {
    $version = $metadata->getVersion();
    $isExperiment = $metadata->getContentSource() === ContentSource::EXPERIMENT;
    $experience = $metadata->getExperience();           // ?ExperienceMetadata
    $experiment = $experience?->getExperiment();        // ?ExperimentMetadata
    $variantId = $experiment?->getVariantId();
}
```

### Typing (PHPStan / Psalm)

The SDK ships PHPStan and Psalm plugins that load the CLI-generated `slots.stub`, so
`fetchContent('home-banner')->getContent()['title']` is typed with no annotations. Generated types
live in the `Croct\Content` namespace:

| Interface | Exposes |
|---|---|
| `Croct\Content\Slots` | One type per slot in PascalCase: `HomeBanner` (latest), `HomeBannerV1`, `HomeBannerV2` |
| `Croct\Content\Components` | One type per component: `Card`, `CardV1`, ... |
| `Croct\Content\MappedSlots` | `SlotId` (union of valid IDs incl. `@latest`, `@N`) and `SlotMap` (ID to content type) |
| `Croct\Content\MappedComponents` | `ComponentId` and `ComponentMap` |

```php
<?php
/**
 * @phpstan-import-type HomeBanner from \Croct\Content\Slots
 * @psalm-import-type HomeBanner from \Croct\Content\Slots
 */
final class HomePage
{
    /** @var HomeBanner */
    public array $banner;
}
```

Indexing `SlotMap[T]` / `ComponentMap[T]` requires PHPStan; Psalm supports the ID unions but not
indexing, so use the named types with Psalm.

## Evaluating queries

```php
<?php
use Croct\Plug\Croct;
use Croct\Plug\EvaluationOptions;

$croct = Croct::fromDotenv();

$returning = $croct->evaluate('user is returning');   // bool
$location = $croct->evaluate('location');             // array (geographic location)

$options = EvaluationOptions::defaults()
    ->withFallback(false)
    ->withAttribute('countries', ['United States', 'Canada', 'Mexico']);
$result = $croct->evaluate("context's countries include location's countryName", $options);
```

Without a fallback, a failed evaluation throws a `CroctException`. For CQL syntax, see the
`croct-cql` skill.

## Identity

Imperative:

```php
<?php
use Croct\Plug\Croct;

$croct = Croct::fromDotenv();
$croct->identify('john-doe'); // on login/registration; any unique ID (email, username, customer ID)
$croct->anonymize();          // on logout
```

- `identify` issues a user token, signed when the API key carries a private key, unsigned otherwise.
- Changing the user ID mid-session terminates the current session and starts a new one.
- Recognize identified users in CQL with `user is identified`.

Automatic (preferred): implement `IdentityResolver` and pass it to `Croct::plug`. The SDK
reconciles the session with the resolved user on every request; no `identify`/`anonymize` calls.

```php
<?php
use Croct\Plug\Croct;
use Croct\Plug\CookieStorage;
use Croct\Plug\IdentityResolver;

final class SessionIdentityResolver implements IdentityResolver
{
    public function getUserId(): ?string
    {
        return $_SESSION['user_id'] ?? null; // null = anonymous
    }
}

$croct = Croct::plug(
    appId: 'APPLICATION_ID',
    apiKey: 'API_KEY',
    storage: CookieStorage::fromGlobals(),
    identity: new SessionIdentityResolver(),
);
```

## Locale resolver

`Croct\Plug\LocaleResolver` (`getLocale(): ?string`) is consumed by the framework integrations to
serve content in the visitor's language. Implement it to provide a custom locale source. In plain
PHP, pass the locale per request with `FetchOptions::withPreferredLocale()`; the docs do not show
a `Croct::plug` parameter for a locale resolver.

```php
<?php
use Croct\Plug\LocaleResolver;

final class SessionLocaleResolver implements LocaleResolver
{
    public function getLocale(): ?string
    {
        return $_SESSION['locale'] ?? null;
    }
}
```

## Storage and cookies

| Need | Use |
|---|---|
| Default (plain PHP, `fromDotenv`/`fromEnvironment`) | Built-in cookie store + `Croct::emitCookies()` |
| Custom cookie names/domain/SameSite | `new CookieStorage(configuration: new CookieConfiguration(...))` passed to `Croct::plug`, then `$storage->emit()` |
| Cookies come from a PSR-7 request | `CookieStorage::fromServerRequest($request)` |
| Cookies come as an array | `CookieStorage::fromArray($cookies)` |
| Framework manages the response | `$storage->getResponseCookies()` and set each `Cookie` on the response (or `toSetCookieHeader()`) |
| Tests, no cookies | `new InMemoryIdentityStore()` |
| Store the session elsewhere | Implement `IdentityStore` |

Do not call `Croct::emitCookies()` when you pass a custom storage: it only writes the default
global store. Emit through your own storage instead:

```php
<?php
use Croct\Plug\CookieConfiguration;
use Croct\Plug\CookieStorage;
use Croct\Plug\Croct;

$storage = CookieStorage::fromGlobals(new CookieConfiguration(domain: 'example.com', sameSite: 'Lax'));
$croct = Croct::plug(appId: 'APPLICATION_ID', apiKey: 'API_KEY', storage: $storage);
$content = $croct->fetchContent('home-hero')->getContent();
$storage->emit(); // before any output

// Or, when the framework sets headers:
foreach ($storage->getResponseCookies() as $cookie) {
    header('Set-Cookie: ' . $cookie->toSetCookieHeader(), false);
}
```

## Core API

### `Croct` (entry point, implements `Plug`)

| Static method | Signature | Notes |
|---|---|---|
| `plug` | `plug(string $appId, ApiKey\|string $apiKey, IdentityStore $storage, ?IdentityResolver $identity = null, ?string $baseEndpointUrl = null, int $tokenDuration = 86400, bool $debug = false, ?ContentProvider $contentProvider = null, ?RequestContext $context = null, ?ClientInterface $httpClient = null, ?RequestFactoryInterface $requestFactory = null, ?StreamFactoryInterface $streamFactory = null, ?LoggerInterface $logger = null): self` | Full control. HTTP client and PSR-17 factories auto-discovered. |
| `fromDotenv` | `fromDotenv(?string $directory = null, ?IdentityStore $storage = null): self` | `.env` in `$directory` (default: cwd), then process env. Cookie store by default. |
| `fromEnvironment` | `fromEnvironment(?IdentityStore $storage = null): self` | Reads `CROCT_*` env vars. |
| `emitCookies` | `emitCookies(?callable $emitter = null): void` | Writes default store cookies; `$emitter` defaults to `setcookie` and receives `(name, value, options)` with `expires`, `path`, `domain`, `secure`, `httponly`, `samesite`. |

`plug` parameters:

| Parameter | Default | Description |
|---|---|---|
| `appId` | required | Application ID. |
| `apiKey` | required | `ApiKey` or serialized string. With a private key, tokens are signed. |
| `storage` | required | Session store (client ID, user token). |
| `identity` | `null` | `IdentityResolver` to sync with your auth system. |
| `baseEndpointUrl` | `null` (production) | Point at a mock server in tests. |
| `tokenDuration` | `86400` | User token lifetime, seconds. |
| `debug` | `false` | Forwarded to the browser SDK (console logging). |
| `contentProvider` | auto-discovered | Default content used as fallback. |
| `context` | built from superglobals | Request signals: URL, referrer, IP, user agent, preferred locale. |
| `httpClient` / `requestFactory` / `streamFactory` | auto-discovered | PSR-18 client / PSR-17 factories. |
| `logger` | none | PSR-3 logger for transport failures. |

### `Plug` (interface, what you inject and mock)

| Method | Signature | Returns |
|---|---|---|
| `fetchContent` | `fetchContent(string $slotId, ?FetchOptions $options = null): FetchResponse` | Throws `CroctException` on failure without fallback. |
| `evaluate` | `evaluate(string $query, ?EvaluationOptions $options = null): mixed` | Throws `CroctException` on failure without fallback. |
| `identify` | `identify(string $userId): void` | |
| `anonymize` | `anonymize(): void` | |
| `getUserToken` | `getUserToken(): Token` | Anonymous until identified. |
| `getClientId` | `getClientId(): string` | UUID string. |
| `getAppId` | `getAppId(): string` | |
| `getPlugOptions` | `getPlugOptions(): array` | Options for `croct.plug(...)` in the browser. |

### `FetchOptions` (`Croct\Plug\FetchOptions`, immutable; `with*` return a copy)

| Method | Description |
|---|---|
| `defaults(): self` | Personalized content, default locale, no schema, no attributes, no fallback. |
| `withFallback(mixed $content): self` | Returned when content cannot be fetched. |
| `withPreferredLocale(string $preferredLocale): self` | Language tag, e.g. `en-us`. |
| `withAttribute(string $name, mixed $value): self` | Add a context attribute. |
| `withAttributes(array $attributes): self` | Replace all context attributes. |
| `withSchema(bool $includeSchema = true): self` | Include schema in response metadata. |
| `withStaticContent(bool $static = true): self` | Fetch the slot's default (non-personalized) content. |
| `hasFallback()`, `getFallback()`, `getPreferredLocale()`, `getAttributes()`, `includesSchema()`, `isStaticContent()` | Getters. |

### `EvaluationOptions` (`Croct\Plug\EvaluationOptions`, immutable)

| Method | Description |
|---|---|
| `defaults(): self` | No attributes, no fallback. |
| `withFallback(mixed $fallback): self` | Returned when the query cannot be evaluated. |
| `withAttribute(string $name, mixed $value): self` | Add a context attribute. |
| `withAttributes(array $attributes): self` | Replace all context attributes. |
| `hasFallback()`, `getFallback()`, `getAttributes()` | Getters. |

### Response types

| Class | Constructor | Getters |
|---|---|---|
| `Croct\Plug\FetchResponse` | `__construct(mixed $content, ?SlotMetadata $metadata = null)` | `getContent(): mixed`, `getMetadata(): ?SlotMetadata` |
| `Croct\Plug\Content\SlotMetadata` | `__construct(string $version, ContentSource $contentSource, ?ExperienceMetadata $experience = null, ?array $schema = null)` | `getVersion(): string`, `getContentSource(): ContentSource`, `getExperience(): ?ExperienceMetadata`, `getSchema(): ?array` |
| `Croct\Plug\Content\ExperienceMetadata` | `__construct(string $experienceId, string $audienceId, ?ExperimentMetadata $experiment = null)` | `getExperienceId()`, `getAudienceId()`, `getExperiment(): ?ExperimentMetadata` |
| `Croct\Plug\Content\ExperimentMetadata` | `__construct(string $experimentId, string $variantId)` | `getExperimentId()`, `getVariantId()` |
| `Croct\Plug\Content\ContentSource` (enum) | `SLOT` (`'slot'`), `EXPERIENCE` (`'experience'`), `EXPERIMENT` (`'experiment'`) | |

Construct these directly to return fixed responses from mocks in tests.

### Authentication

`Croct\Plug\ApiKey`:

| Method | Description |
|---|---|
| `ApiKey::parse(string $apiKey): self` | From `identifier` or `identifier:privateKey`. |
| `ApiKey::of(string $identifier, ?string $privateKey = null): self` | Without a private key, it cannot sign tokens. |
| `getIdentifier(): string` | Public identifier. |
| `hasPrivateKey(): bool` | Whether it can sign user tokens. |

`Token` (returned by `getUserToken()`, a JWT):

| Method | Returns |
|---|---|
| `getSubject(): ?string` | Identified user ID, `null` if anonymous. |
| `isAnonymous(): bool` | `true` when no subject. |
| `isValidNow(?int $now = null): bool` | Within issue/expiration window. |
| `getIssueTime(): int` | Unix seconds. |
| `getExpirationTime(): ?int` | Unix seconds or `null`. |
| `getTokenId(): ?string` | Unique ID or `null`. |
| `toString(): string` | Encoded JWT. |

### Resolvers

| Interface | Method | Return `null` means |
|---|---|---|
| `Croct\Plug\IdentityResolver` | `getUserId(): ?string` | Visitor is anonymous. |
| `Croct\Plug\LocaleResolver` | `getLocale(): ?string` | No locale determined. |

### Storage

`IdentityStore` (interface; namespace not shown in the docs): `getClientId(): ?Uuid`, `saveClientId(Uuid $clientId): void`,
`getUserToken(): ?Token`, `saveUserToken(Token $userToken): void`.

`Croct\Plug\CookieStorage` (implements `IdentityStore`):

| Member | Signature |
|---|---|
| constructor | `__construct(?Uuid $clientId = null, ?Token $userToken = null, ?CookieConfiguration $configuration = null, ?int $now = null)` |
| `fromGlobals` | `fromGlobals(?CookieConfiguration $configuration = null, ?int $now = null): self` (reads `$_COOKIE`) |
| `fromArray` | `fromArray(array $cookies, ?CookieConfiguration $configuration = null, ?int $now = null): self` |
| `fromServerRequest` | `fromServerRequest(ServerRequest $request, ?CookieConfiguration $configuration = null, ?int $now = null): self` (PSR-7) |
| `emit` | `emit(?callable $emitter = null): void` (default `setcookie`; call before output) |
| `getResponseCookies` | `getResponseCookies(): array` (two `Cookie` objects: client ID and user token) |

`Croct\Plug\CookieConfiguration` constructor (all optional):

| Parameter | Default |
|---|---|
| `clientIdName` | `'ct_client_id'` |
| `userTokenName` | `'ct_user_token'` |
| `clientIdDuration` | `31536000` (1 year) |
| `userTokenDuration` | `604800` (1 week) |
| `domain` | `null` (current host) |
| `secure` | `true` |
| `sameSite` | `'None'` |

Getters: `getClientIdName()`, `getUserTokenName()`, `getClientIdDuration()`, `getUserTokenDuration()`,
`getDomain()`, `isSecure()`, `getSameSite()`.

`Croct\Plug\Cookie`: `__construct(string $name, string $value, ?int $expiration = null, string $path = '/', ?string $domain = null, bool $secure = true, bool $httpOnly = false, ?string $sameSite = 'None')`;
getters `getName()`, `getValue()`, `getExpiration()`, `getPath()`, `getDomain()`, `isSecure()`,
`isHttpOnly()`, `getSameSite()`; `toSetCookieHeader(?int $now = null): string`.

`Croct\Plug\InMemoryIdentityStore`: `__construct(?Uuid $clientId = null, ?Token $userToken = null)`.

`Croct\Plug\Uuid`: `parse(string): self` (throws `InvalidArgumentException` if invalid, lowercases),
`isValid(string): bool`, `random(): self` (v4), `equals(self): bool` (case-insensitive),
`toString(): string`.

### Content providers (fallback content)

When an API request fails, the SDK serves content from a `ContentProvider`. By default it
auto-discovers the content downloaded by the CLI.

| Class | Signature |
|---|---|
| `Croct\Plug\Content\ContentProvider` (interface) | `getSlotContent(string $id, ?string $language = null): ?array` |
| `Croct\Plug\Content\DefaultContentProvider` | `fromProject(?string $projectDirectory = null): ?self` (default: root package install path; `null` if files not found) |
| `Croct\Plug\Content\ArrayContentProvider` | `__construct(array $slots, ?string $defaultLocale = null)` |

```php
<?php
use Croct\Plug\Content\ArrayContentProvider;

$provider = new ArrayContentProvider(
    slots: [
        'home-banner' => [
            ['version' => 1, 'content' => ['en' => ['title' => 'Welcome to Croct!']]],
        ],
    ],
    defaultLocale: 'en',
);
```

`ArrayContentProvider` serves the highest version, resolves the requested language, and falls back
to `defaultLocale`; malformed entries are skipped.

## Exceptions

All implement `Croct\Plug\Exception\CroctException` (extends `Throwable`).

| Exception | Thrown when |
|---|---|
| `Croct\Plug\Exception\EvaluationException` | Query is invalid or cannot be evaluated. |
| `Croct\Plug\Exception\ContentException` | Content cannot be fetched and no fallback is available. |
| `Croct\Plug\Exception\ConfigurationException` | Misconfigured SDK: missing credentials, no HTTP client. |

```php
<?php
use Croct\Plug\Croct;
use Croct\Plug\Exception\CroctException;

$croct = Croct::fromDotenv();

try {
    $returning = $croct->evaluate('user is returning') === true;
} catch (CroctException $error) {
    $returning = false; // fail open
}
```

Prefer `withFallback(...)` over try/catch for resilience.

## Testing

Unit: mock the `Plug` interface.

```php
<?php
use Croct\Plug\FetchResponse;
use Croct\Plug\Plug;
use PHPUnit\Framework\TestCase;

final class HomeControllerTest extends TestCase
{
    public function testRendersHeadline(): void
    {
        $croct = $this->createMock(Plug::class);
        $croct->method('fetchContent')->willReturn(new FetchResponse(['title' => 'Welcome']));

        $controller = new HomeController($croct);

        $this->assertStringContainsString('Welcome', $controller->render());
    }
}
```

Integration: use a mock PSR-18 client (for example `php-http/mock-client`) and an in-memory store.

```php
<?php
use Croct\Plug\Croct;
use Croct\Plug\InMemoryIdentityStore;
use Http\Mock\Client;
use Nyholm\Psr7\Response;

$httpClient = new Client();
$httpClient->addResponse(new Response(200, ['Content-Type' => 'application/json'], '{"content": {"title": "Welcome"}}'));

$croct = Croct::plug(
    appId: 'APPLICATION_ID',
    apiKey: 'API_KEY',
    storage: new InMemoryIdentityStore(),
    httpClient: $httpClient,
);
$content = $croct->fetchContent('home-hero')->getContent();
```

Alternatively set `baseEndpointUrl` (or `CROCT_BASE_ENDPOINT_URL`) to a mock server.

## Troubleshooting

| Symptom | Action |
|---|---|
| Need to see failures | Pass a PSR-3 `logger:` to `Croct::plug`. |
| Debug browser SDK | Pass `debug: true` to `Croct::plug` (forwarded to the browser console). |
| `ConfigurationException` on startup | Check `CROCT_APP_ID` / `CROCT_API_KEY` and that a PSR-18 client is installed. |
| `ContentException` / `EvaluationException` | Add a fallback; inspect `$error->getMessage()`. |
| Browser starts a different session | Ensure cookies are emitted before output and `croct.plug(getPlugOptions())` is used. |
| Custom storage cookies missing | Call `$storage->emit()` (not `Croct::emitCookies()`). |
| No traffic on the Integration page | Confirm the browser SDK loads; status should read "Received traffic in the past 24 hours". |

## Sources

- https://docs.croct.com/reference/sdk/php/integration.md
- https://docs.croct.com/reference/sdk/php/manual-installation.md
- https://docs.croct.com/reference/sdk/php/client-side-setup.md
- https://docs.croct.com/reference/sdk/php/content-rendering.md
- https://docs.croct.com/reference/sdk/php/query-evaluation.md
- https://docs.croct.com/reference/sdk/php/data-collection.md
- https://docs.croct.com/reference/sdk/php/testing/unit-testing.md
- https://docs.croct.com/reference/sdk/php/testing/integration-testing.md
- https://docs.croct.com/reference/sdk/php/troubleshooting/debugging.md
- https://docs.croct.com/reference/sdk/php/api/core/croct.md
- https://docs.croct.com/reference/sdk/php/api/core/croct/plug.md
- https://docs.croct.com/reference/sdk/php/api/core/croct/from-dotenv.md
- https://docs.croct.com/reference/sdk/php/api/core/croct/from-environment.md
- https://docs.croct.com/reference/sdk/php/api/core/croct/emit-cookies.md
- https://docs.croct.com/reference/sdk/php/api/core/plug.md
- https://docs.croct.com/reference/sdk/php/api/options/fetch-options.md
- https://docs.croct.com/reference/sdk/php/api/options/evaluation-options.md
- https://docs.croct.com/reference/sdk/php/api/response/fetch-response.md
- https://docs.croct.com/reference/sdk/php/api/response/slot-metadata.md
- https://docs.croct.com/reference/sdk/php/api/response/experience-metadata.md
- https://docs.croct.com/reference/sdk/php/api/response/experiment-metadata.md
- https://docs.croct.com/reference/sdk/php/api/response/content-source.md
- https://docs.croct.com/reference/sdk/php/api/authentication/api-key.md
- https://docs.croct.com/reference/sdk/php/api/authentication/token.md
- https://docs.croct.com/reference/sdk/php/api/resolvers/identity-resolver.md
- https://docs.croct.com/reference/sdk/php/api/resolvers/locale-resolver.md
- https://docs.croct.com/reference/sdk/php/api/storage/identity-store.md
- https://docs.croct.com/reference/sdk/php/api/storage/cookie-storage.md
- https://docs.croct.com/reference/sdk/php/api/storage/cookie-configuration.md
- https://docs.croct.com/reference/sdk/php/api/storage/cookie.md
- https://docs.croct.com/reference/sdk/php/api/storage/in-memory-identity-store.md
- https://docs.croct.com/reference/sdk/php/api/storage/uuid.md
- https://docs.croct.com/reference/sdk/php/api/content/content-provider.md
- https://docs.croct.com/reference/sdk/php/api/content/default-content-provider.md
- https://docs.croct.com/reference/sdk/php/api/content/array-content-provider.md
- https://docs.croct.com/reference/sdk/php/api/exceptions/croct-exception.md
- https://docs.croct.com/reference/sdk/php/api/types/slots.md
- https://docs.croct.com/reference/sdk/php/api/types/mapped-slots.md
