# React SDK (`@croct/plug-react`)

Provider, hooks, and components on top of the JavaScript SDK. Use it for React apps that are not
Next.js (use `@croct/plug-next` there) or Hydrogen (use `@croct/plug-hydrogen`). Hooks and
components fetch **in the browser**; for server rendering see [SSR](#ssr).

## Install

CLI (recommended):

```sh
npx croct@latest init
```

Manual:

```sh
npm install @croct/plug-react
```

## Initialize

Wrap the app root in `<CroctProvider>`:

```jsx
import {CroctProvider} from '@croct/plug-react';

export default function App() {
  return (
    <CroctProvider appId="APPLICATION_ID">
      <Main />
    </CroctProvider>
  );
}
```

`<CroctProvider>` accepts the same options as `croct.plug` as props: `appId` (required), `debug`,
`test`, `track`, `clientId`, `token`, `userId`, `tokenScope`, `defaultFetchTimeout` (5000 ms),
`defaultPreferredLocale`, `eventMetadata`, `logger`, `urlSanitizer`, `baseEndpointUrl`,
`cidAssignerEndpointUrl`, `disableCidMirroring`, `cookie`. Details: the `Plug configuration` table
in `references/javascript.md` (listed in SKILL.md).

## Render content

Add the slot with the CLI first (`npx croct@latest add slot home-hero@1 --example`); it generates types and
adds `initial` and fallback content automatically.

Hook (imperative) or component (declarative):

```jsx
import {useContent, Slot} from '@croct/plug-react';

export function HomeHero() {
  const {content} = useContent('home-hero@1');

  return (
    <div>
      <strong>{content.title}</strong>
      <p>{content.subtitle}</p>
      <a href={content.button.link}>{content.button.label}</a>
    </div>
  );
}

export function HomeHeroDeclarative() {
  return (
    <Slot id="home-hero@1">
      {({content}) => <strong>{content.title}</strong>}
    </Slot>
  );
}
```

### Loading state

Without `initial`, the component **suspends**. Pick one:

```jsx
// Option A: Suspense boundary
<Suspense fallback="✨ Personalizing content..."><HomeHero /></Suspense>

// Option B: initial value
const {content} = useContent('home-hero@1', {initial: null});
if (content === null) return <div>✨ Personalizing content...</div>;
```

### Fallback

```jsx
const {content} = useContent('home-hero@1', {
  fallback: {
    title: 'Welcome to Croct!',
    subtitle: 'The easiest way to personalize your application.',
    button: {label: 'Get started', link: '/signup'},
  },
});
```

Without `fallback` (and without CLI default content) an error is thrown on failure.

### `useContent` / `<Slot>` options

`useContent<T extends SlotId>(id: T, options?: FetchOptions): FetchResponse<T>` returns
`{content, metadata}`. `<Slot>` takes the same options as props plus `id` and
`children: ({content}) => ReactNode`.

| Option | Default | Notes |
| --- | --- | --- |
| `initial` | — | Rendered while loading; **required for SSR** |
| `fallback` | — | Rendered on error |
| `expiration` | `60000` | Cache TTL in ms, extended on every render; negative = never expires |
| `cacheKey` | slot ID | Set a unique key to force a refetch |
| `staleWhileLoading` | `false` | Keep previous content while refetching after a key/prop change |
| `preferredLocale` | workspace default | e.g. `en-ca` |
| `timeout` | provider default | ms |
| `attributes` | — | CQL `context` attributes (≤ 30 entries, ≤ 5 levels) |

Typing:

```tsx
import type {SlotContent, ComponentContent} from '@croct/plug-react';

type HeroProps = SlotContent<'home-hero@1'>;
export function HomeHero(props: HeroProps) {
  return <h1>{props.title}</h1>;
}
```

For union slots, `SlotContent` is a discriminated union; `switch (props._type)` narrows it.

## Evaluate queries

```jsx
import {useEvaluation, Personalization} from '@croct/plug-react';

export function DocsLink() {
  const isDeveloper = useEvaluation("user's persona is 'developer'", {fallback: false});

  return isDeveloper ? <a href="/docs">View docs</a> : <a href="/share">Share with your developer</a>;
}

export function Greeting() {
  return (
    <Personalization query="user is returning" fallback={false}>
      {returning => (returning ? <p>Welcome back!</p> : <p>Welcome!</p>)}
    </Personalization>
  );
}
```

`useEvaluation<T extends JsonValue>(query: string, options?: EvaluationOptions): T`. Options (and
`<Personalization>` props, plus `query` and `children: (result) => ReactNode`): `initial`,
`fallback`, `expiration` (60000), `cacheKey` (default: hash of query + attributes),
`staleWhileLoading`, `timeout`, `attributes`. Query max 500 characters. Same suspend/`initial`
rules as content.

## SSR

Hooks and components fetch on the client. In any server-rendered React app:

- Pass `initial` to every `useContent`/`<Slot>`/`useEvaluation`/`<Personalization>` that renders on
  the server, or rendering fails with "The initial content/value is required for server-side
  rendering (SSR)."
- Call `useCroct()` methods only in `useEffect` or event handlers.
- For real server-side personalization, use the low-level functions (or a framework SDK such as
  Next.js):

```ts
import {fetchContent, evaluate} from '@croct/plug-react/api';

const {content} = await fetchContent('home-hero@1', {apiKey: process.env.CROCT_API_KEY, clientId});
const returning = await evaluate('user is returning', {apiKey: process.env.CROCT_API_KEY, clientId});
```

They take the same options as `@croct/plug/api` (`appId` or `apiKey`, `clientId`, `clientIp`,
`clientAgent`, `userToken`, `previewToken`, `static`, `preferredLocale`, `context`, `timeout`,
`baseEndpointUrl`, `extra`, `logger`); see `references/javascript.md`.

## SDK instance, data collection, identity

`useCroct(): Plug` returns the JavaScript SDK instance (only inside `<CroctProvider>`):

```jsx
import {useCroct} from '@croct/plug-react';

export function LoginForm() {
  const croct = useCroct();

  const login = async event => {
    const userId = await auth.login(/* ... */);
    if (userId !== null) {
      croct.identify(userId);
    }
  };

  // logout: croct.anonymize();
  // profile: croct.user.edit().set('email', email).save();
  // session: croct.session.edit().set('plan', plan).save();
  // goal: croct.track('goalCompleted', {goalId: 'ctaClicked'});
  return <form onSubmit={login}>{/* ... */}</form>;
}
```

If the user is already logged in on load, pass it to the provider:
`<CroctProvider appId="APPLICATION_ID" userId={userId}>`. Event catalog: `croct-track-events`
skill.

## Testing

Test mode auto-enables when `NODE_ENV=test`; or set `<CroctProvider test>`. Spy on the underlying
`@croct/plug` instance:

```jsx
// HomeHero.jsx: `initial: null` keeps the hook from suspending in tests
import {useContent} from '@croct/plug-react';

export function HomeHero({fallbackContent}) {
  const {content} = useContent('home-hero@1', {
    initial: null,
    fallback: fallbackContent,
  });

  if (content === null) {
    return <div>✨ Personalizing...</div>;
  }

  return (
    <div>
      <h1>{content.title}</h1>
      <p>{content.subtitle}</p>
      <a href={content.button.link}>{content.button.label}</a>
    </div>
  );
}
```

```jsx
// HomeHero.test.jsx
import {act, render, screen, waitFor} from '@testing-library/react';
import {CroctProvider} from '@croct/plug-react';
import croct from '@croct/plug';
import {HomeHero} from './HomeHero';

it('renders the fallback on error', async () => {
  jest.spyOn(croct, 'fetch').mockRejectedValue(new Error('Failed to fetch content'));

  render(
    <CroctProvider appId="00000000-0000-0000-0000-000000000000">
      <HomeHero fallbackContent={{title: 'Fallback title'}} />
    </CroctProvider>,
  );

  await act(() => Promise.resolve()); // flush promises
  await waitFor(() => expect(screen.getByText('Fallback title')).toBeInTheDocument());
});
```

- Success path: `jest.spyOn(croct, 'fetch').mockResolvedValue({content})`; the hook calls
  `croct.fetch('home-hero@1', {})`.
- Queries: `jest.spyOn(croct, 'evaluate')`; it is called as `croct.evaluate('user is returning')`.
- Events: `croct.tracker.addListener(jest.fn())`, then assert on
  `{status: 'confirmed', event: {type: 'userProfileChanged', ...}}`.
- Integration tests: `<CroctProvider baseEndpointUrl="http://localhost:3000">` + a mock server
  (Mockoon). Mockable paths: `/client/web/cid`, `/client/web/evaluate`, `/client/web/track`
  (skip in test mode), `/content`.

## Troubleshooting

Enable `<CroctProvider debug>` and read the browser console; check the Network tab. API-level
errors (credentials, CORS, timeouts, MAU, suspended service) are in `references/javascript.md`.

| Error | Fix |
| --- | --- |
| `useCroct() can only be used in the context of a <CroctProvider> component.` | Wrap the tree in `<CroctProvider>` |
| `Property croct.someMethod is not supported on server-side (SSR)...` | Move the call into `useEffect` (deps `[croct]`) or an event handler |
| `The initial content is required for server-side rendering (SSR).` | Add `initial` to `useContent`/`<Slot>`, or fetch server-side |
| `The initial value is required for server-side rendering (SSR).` | Add `initial` to `useEvaluation`/`<Personalization>` |

## Sources

- https://docs.croct.com/reference/sdk/react/integration.md
- https://docs.croct.com/reference/sdk/react/manual-installation.md
- https://docs.croct.com/reference/sdk/react/content-rendering.md
- https://docs.croct.com/reference/sdk/react/query-evaluation.md
- https://docs.croct.com/reference/sdk/react/data-collection.md
- https://docs.croct.com/reference/sdk/react/event-tracking.md
- https://docs.croct.com/reference/sdk/react/testing/unit-testing.md
- https://docs.croct.com/reference/sdk/react/testing/integration-testing.md
- https://docs.croct.com/reference/sdk/react/troubleshooting/debugging.md
- https://docs.croct.com/reference/sdk/react/troubleshooting/problem.md
- https://docs.croct.com/reference/sdk/react/api/components/croct-provider.md
- https://docs.croct.com/reference/sdk/react/api/components/slot.md
- https://docs.croct.com/reference/sdk/react/api/components/personalization.md
- https://docs.croct.com/reference/sdk/react/api/hooks/use-content.md
- https://docs.croct.com/reference/sdk/react/api/hooks/use-evaluation.md
- https://docs.croct.com/reference/sdk/react/api/hooks/use-croct.md
- https://docs.croct.com/reference/sdk/react/api/functions/fetch-content.md
- https://docs.croct.com/reference/sdk/react/api/functions/evaluate.md
- https://docs.croct.com/reference/sdk/react/api/types/slot-content.md
