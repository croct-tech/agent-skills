---
name: croct-use-cli
description: >-
  Use when driving the Croct CLI (`croct`, `npx croct@latest`): setting up Croct in a project
  with `croct init`, adding or removing slots and components (`croct add slot`, `croct add
  component`, `croct remove ...`), syncing generated types and fallback content (`croct
  install`, `croct update`, `croct upgrade`), editing `croct.json` or its version specifiers
  (`"home-hero": "1 - 3"`), authenticating (`croct login`, `croct logout`, `CROCT_API_KEY`,
  `CROCT_TOKEN`), running the CLI non-interactively in CI (`--no-interaction`, `--cwd`),
  creating API keys (`croct create api-key`), opening the admin (`croct admin`), deep links
  (`croct://...`, `croct open`, `enable deep-link`), or writing, testing, and publishing CLI
  templates (`template.json5`, `croct use`, `croct create template`, template actions such as
  `create-resource`, `add-slot`, `download`, expressions `${options.name}`). Also when
  `SlotContent<'home-hero@1'>` types or `slots.d.ts` are stale, or default content is outdated.
---

# Drive the Croct CLI

The CLI configures a project (`croct.json`), installs the SDK, keeps generated **type
definitions** and **fallback content** in sync with the workspace, and runs **templates**
(JSON5 automation scripts). For Croct concepts (slot, component, workspace) see the
`croct-use-croct` skill; for rendering content in code see `croct-integrate-sdk`.

## Running it

- Prefer the project's own runner. Without a global install, the docs run every command as
  `npx croct@latest <command>` (equivalents: `pnpm dlx croct@latest`, `yarn dlx croct@latest`,
  `bunx --bun croct@latest`). Add `--yes` to `npx` to skip npm's install confirmation, as the
  docs do for `open`: `npx --yes croct@latest open '<url>'`.
- Global install: `npm install -g croct` (or `pnpm add -g croct`, `yarn global add croct`,
  `bun add -g croct`). Verify with `croct --version`.
- Run from the project root, or pass `--cwd <path>`.
- **Global options go between `croct` and the command**, never after it:
  `croct --cwd ./app --no-interaction install`, not `croct install --no-interaction`.

## Running without prompts

Every argument a command needs and you omit becomes an interactive prompt you cannot answer.

1. Pass every value as an argument or flag (`croct add slot hero-banner@1`, not
   `croct add slot`). Commands whose positional list is optional (`add`/`remove slot|component`)
   prompt for a selection when it is empty.
2. Add `--no-interaction` for CI or scripted runs. Add `--dnd` (or `CROCT_DND`) for minimal
   interruption, `--stateless` (or `CROCT_STATELESS`) to store nothing locally (no config,
   no tokens), `-q`/`--quiet` to silence output, `--debug` when a command fails.
3. For templates, pass every option as a flag (`croct use template.json5 --name my-app
   --no-typescript`). Prompts in the template fall back to their `default` when running
   non-interactively.

The docs do not say what happens when a required value is missing under `--no-interaction`;
assume the command fails and supply everything up front.

| Global option | Env var | Purpose |
| --- | --- | --- |
| `--cwd <path>` | | Working directory |
| `--api-key <key>` | `CROCT_API_KEY` | Authenticate with an API key |
| `--token <token>` | `CROCT_TOKEN` | Authenticate with a token |
| `--registry <url>` | | Custom template registry |
| `--no-interaction` | | Non-interactive mode |
| `--config <path>` | | Config file path (new projects are initialized there) |
| `--stateless` | `CROCT_STATELESS` | Save no state locally |
| `--dnd` | `CROCT_DND` | Minimal interaction and interruption |
| `--quiet`, `-q` | | Disable output |
| `--debug` | | Debug mode |

## Authentication

- Session-based commands use a login that lasts 7 days and renews on every CLI run.
- **Never ask the user for their email, password, API key, or token, and never type them into a
  command yourself.** When a command needs a session, ask the user to run `croct login` (or
  `npx croct@latest login`) in their own terminal, then retry.
- `croct login credentials --username <email> --password <pw>` exists for the user's own
  scripts. Do not construct it with real credentials.
- `croct init` creates an account if the user has none, so a new user can start there.
- `croct logout` ends the session and deletes stored tokens.
- CI: the user provides `CROCT_API_KEY` or `CROCT_TOKEN` as secrets in the environment. The
  docs do not list which commands accept API-key or token auth, nor how to obtain a CLI token;
  check `https://docs.croct.com/reference/cli/global-options.md` or ask the user.

## Pick the command

| Goal | Command |
| --- | --- |
| Integrate Croct into a project (account, org, workspace, apps, SDK, API key) | `croct init` |
| Same, non-interactively | `croct --no-interaction init --sdk next --org acme --wor default --dev-app my-app-dev --prod-app my-app` |
| Regenerate all types and fallback content from `croct.json` (fresh clone, CI) | `croct install` |
| Pull latest schemas/content at the **same** major versions | `croct update` |
| Move slots/components to newer **major** versions | `croct upgrade [--slots a b] [--components c]` |
| Start using a slot that exists in the workspace | `croct add slot <id>[@version] [--example]` |
| Start using a component | `croct add component <id>[@version]` |
| Stop using slots/components | `croct remove slot <ids...>` / `croct remove component <ids...>` |
| Create an API key | `croct create api-key --name "<name>" --env dev\|prod --permissions resource_read_access[,token_issue,data_export] [--copy]` |
| Apply a template | `croct use <file\|url\|npm://pkg\|croct://path> [--option value]` |
| Export workspace resources to a template / scaffold one | `croct create template [path]` / `croct create template --empty` |
| Open the admin (magic link, no manual login) | `croct admin [page]` e.g. `croct admin workspace settings` |
| Allow browser "Run" buttons to drive the CLI | `croct enable deep-link` / `croct disable deep-link` |
| Execute a `croct://` deep link | `croct open '<croct://...>'` |

Full flags, arguments, and deep-link URL syntax: [references/commands.md](references/commands.md).

## `init` essentials

- Interactive walkthrough: organization, workspace, development and production applications,
  SDK installation, API key. Auto-detects the SDK; force it with `--sdk javascript|react|vue|next|nuxt`.
- Existing config is never overwritten unless `--override`/`-o`. `--new org|workspace|app`
  provisions new remote resources instead of reusing configured ones.
- For Next.js and Nuxt it generates an API key and writes it to environment variables. Skip with
  `--skip-api-key-setup` (or `CROCT_SKIP_API_KEY_SETUP`) when the user manages keys manually.

## Keeping a project in sync

Types and fallback content are generated from the workspace for the versions listed in
`croct.json`. Admin changes never break the project: schemas are versioned and nothing changes
locally until you sync.

| Situation | Run |
| --- | --- |
| Fresh clone or reinstall, no postinstall hook | `croct install` |
| Default content changed in the admin | `croct update` |
| Schema changed in the admin (new field, etc.) at the same major version | `croct update` |
| New major version published and you want it | `croct upgrade`, then bump IDs in code (`home-hero@1` -> `home-hero@2`) |
| Need a slot/component not yet in the project | `croct add slot <id>@<version>` / `croct add component <id>@<version>` |
| TypeScript says a slot ID or `SlotContent<'x@1'>` does not exist | Check `croct.json` lists it with a matching version specifier, then `croct update` |

- `install` registers a postinstall hook (SDK-dependent) so a dependency install also runs
  `croct install`.
- `add slot <id>` without a version takes the latest. The docs do not say which specifier it
  writes to `croct.json`, nor whether `add slot <id>@2` replaces an existing entry. To pin or move
  a slot, edit the specifier (`"home-hero": "2"`), run `croct update`, then bump the ID in code.

### CI recipe

Built only from documented flags; gaps are marked.

```sh
# CROCT_API_KEY is provided by the user as a CI secret
npx --yes croct@latest --no-interaction install
```

- The docs do not say whether `install` accepts `CROCT_API_KEY`/`CROCT_TOKEN` or which API-key
  permission it needs. If it fails on auth, ask the user.
- The docs do not say whether the postinstall hook runs non-interactively during `npm ci`.
  Committing the generated types (`slots.d.ts`) avoids depending on it for builds.
- Commit the generated types file (for TypeScript, `slots.d.ts`, auto-registered in
  `tsconfig.json`): not required, but recommended so builds do not fetch definitions from the API.
- Do not hand-edit generated types or fallback files; change the workspace or `croct.json` and
  re-run the CLI.

## `croct.json` essentials

```json
{
  "$schema": "https://schema.croct.com/json/v1/project.json",
  "organization": "acme",
  "workspace": "default",
  "applications": {"development": "my-app-dev", "production": "my-app"},
  "defaultLocale": "en",
  "locales": ["en", "pt-br"],
  "slots": {"home-hero": "1 - 3", "banner": "2"},
  "components": {"card": "1"},
  "paths": {"source": "src", "components": "src/components"}
}
```

- `slots`/`components` map IDs to **major-version specifiers**: exact `"3"`, range `"1 - 3"`,
  set `"1, 3, 5"`. The CLI manages them on `add`/`remove`/`upgrade`; if you edit them by hand,
  run `croct update` afterwards.
- `paths` is optional and auto-detected; `paths.content` sets where fallback content and type
  definitions are written (default: project root).

Full schema, type-generation usage per SDK, and fallback hierarchy:
[references/configuration.md](references/configuration.md).

## Templates in one screen

A template is a JSON5 file with `title`, `description`, optional typed `options`, and an ordered
`actions` list. Values support `${...}` expressions with `options`, `this` (variables set by
`define` or action `result`s), `project`, and `packageManager`.

```json5
// template.json5
{
  "$schema": "https://schema.croct.com/json/v1/template.json",
  "title": "Quick start",
  "description": "Sets up the project with the Croct SDK.",
  "options": {
    "typescript": {"type": "boolean", "description": "Whether to use TypeScript.", "default": true}
  },
  "actions": [
    {"name": "check-dependency", "dependencies": [{"name": "next"}]},
    {"name": "install"},
    {"name": "integrate-croct"},
    {"name": "print", "semantics": "success", "message": "You're all set!"}
  ]
}
```

- Test locally with `croct use template.json5`; share by file, URL, GitHub blob URL,
  `npm://<package>` (template at the root of the package's GitHub repo), or the catalog
  (`croct://...`).
- `create-resource` only provisions resources in the workspace; follow it with `add-slot` /
  `add-component` to bring them into the project, using IDs captured in its `result`.
- A value that is exactly one `${...}` keeps its type (number, boolean, object); anything else
  becomes a string.

Format, every action, options, expressions, variables, functions, sources, registries, and
publishing: [references/templates.md](references/templates.md).

## Pitfalls

- Do: put global options before the command. Don't: `croct init --cwd app`.
- Do: give slot IDs with versions when it matters (`hero-banner@1`). Bare IDs take the latest.
- Don't run `croct admin`, `croct open`, or `enable deep-link` unprompted: they open the browser
  or register an OS URL handler on the user's machine.
- `--sdk` accepts only `javascript`, `react`, `vue`, `next`, `nuxt`. For other stacks, omit it and
  let `init` auto-detect: the PHP, Laravel, Symfony, Drupal, and Hydrogen integration pages all
  recommend `croct init`. Fall back to the SDK's manual steps (see `croct-integrate-sdk`) only if
  detection fails.
- After `upgrade`, update versioned IDs in code; the CLI only changes `croct.json` and
  generated files.
- The first CLI run without deep links enabled asks whether to enable them; expect that prompt
  in interactive sessions.

## Live docs

- Command reference: `https://docs.croct.com/reference/cli/commands.md`
- Any page as markdown: append `.md` (e.g. `https://docs.croct.com/reference/cli/configuration.md`)
- Index: `https://docs.croct.com/llms.txt`; search: `https://docs.croct.com/api/search.md?term=<terms>`
