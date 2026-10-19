# Croct CLI command reference

Syntax: `croct <global-options> <command> <command-options>`. Global options must come after
`croct` and before the command. Commands listed as "global options only" accept no other flags.

Without a global install, run any command as `npx croct@latest <command>` (or `pnpm dlx`,
`yarn dlx`, `bunx --bun` with `croct@latest`).

## Global options

| Option | Type | Default | Env var | Description |
| --- | --- | --- | --- | --- |
| `--cwd` | string | | | Working directory. |
| `--api-key` | string | | `CROCT_API_KEY` | API key for authentication. |
| `--token` | string | | `CROCT_TOKEN` | Token for authentication. |
| `--registry` | string | | | Template registry URL (replaces the built-in registry). |
| `--no-interaction` | boolean | | | Non-interactive mode, for CI/CD or automation. |
| `--config` | string | `croct.json5` (per the global-options page; the configuration page names the file `croct.json`) | | Path to the configuration file. New projects are initialized at this path. |
| `--stateless` | boolean | `false` | `CROCT_STATELESS` | Store no configuration, tokens, or other data locally. |
| `--dnd` | boolean | `false` | `CROCT_DND` | Minimal interaction and interruption. |
| `--quiet`, `-q` | boolean | `false` | | Disable output messages. |
| `--debug` | boolean | | | Enable debug mode. |
| `--version` | | | | Print the installed CLI version (`croct --version`). |

## Project setup

### `init`

```sh
croct init [options]
```

Interactive walkthrough that configures organization, workspace, applications, and SDK, and
writes the configuration file. Creates an account if the user has none.

| Option | Type | Description |
| --- | --- | --- |
| `--override`, `-o` | boolean | Override existing configuration. By default existing config files are not modified. |
| `--new`, `-n` | string | Force creation of a new remote resource instead of reusing the configured one: `organization`/`org`, `workspace`/`wor` (in the active org), `application`/`app` (in the active workspace). |
| `--sdk`, `-s` | string | SDK to configure; auto-detected by default. `javascript`, `react`, `vue`, `next`, `nuxt`. |
| `--skip-api-key-setup` | boolean (default `false`) | Skip automatic API key generation and saving to environment variables (done by default for integrations that need a server-side key, such as Next.js and Nuxt). Env: `CROCT_SKIP_API_KEY_SETUP`. |
| `--org` | string | Organization slug. Prompts if omitted. |
| `--wor` | string | Workspace slug. Prompts if omitted. |
| `--dev-app` | string | Development application slug. Prompts if omitted. |
| `--prod-app` | string | Production application slug. Prompts if omitted. |

```sh
croct init --sdk next --skip-api-key-setup
```

### `install`

```sh
croct install
```

Installs type definitions and fallback content for everything in the configuration file.
Global options only. Can register a postinstall hook (SDK-dependent) so dependency installs run it.

### `update`

```sh
croct update
```

Re-fetches schemas and default content and regenerates types and fallback content **without**
changing version specifiers. Global options only.

### `upgrade`

```sh
croct upgrade [--slots <ids...>] [--components <ids...>]
```

Moves slots and components to the latest version, updating the version specifiers in the
configuration file, then regenerates types and fallback content.

| Option | Type | Description |
| --- | --- | --- |
| `--slots`, `-s` | string[] | Slots to upgrade, space-separated. |
| `--components`, `-c` | string[] | Components to upgrade, space-separated. |

With neither option, all slots and components are upgraded.

## Slots and components

### `add slot`

```sh
croct add slot [slots...] [--example]
```

Adds slots, regenerates types, and downloads fallback content. Each slot may carry a version:
`hero-banner@1`. Omitting the list prompts for a selection.

| Option | Type | Description |
| --- | --- | --- |
| `--example`, `-e` | boolean | Generate an implementation example (written to the `paths.examples` directory). |

```sh
croct add slot hero-banner sidebar-cta
croct add slot hero-banner@1 --example
```

### `add component`

```sh
croct add component [components...]
```

Adds components and regenerates types. Version suffix allowed (`my-component@2`). Omitting the
list prompts. Global options only.

### `remove slot`

```sh
croct remove slot [slots...]
```

Removes slots and regenerates types and fallback content. Omitting the list prompts. Global
options only.

### `remove component`

```sh
croct remove component [components...]
```

Removes components and regenerates types. Omitting the list prompts. Global options only.

## Authentication

### `login`

```sh
croct login
```

Authenticates the session so the CLI can manage resources on the user's behalf. The session is
valid for 7 days and renews on every CLI command. The only supported method is credentials.
Global options only. Interactive: have the user run it.

### `login credentials`

```sh
croct login credentials [--username <email>] [--password <password>]
```

Email/password login. Missing values are prompted.

| Option | Type | Description |
| --- | --- | --- |
| `--username`, `-u` | string | Email address. |
| `--password`, `-p` | string | Password. |

Never fill these in on the user's behalf.

### `logout`

```sh
croct logout
```

Terminates the session and removes stored authentication tokens. Global options only.

## Resources

### `create api-key`

```sh
croct create api-key [--name <name>] [--permissions <list>] [--env prod|dev] [--copy]
```

Creates an API key for the application. Missing values are prompted.

| Option | Type | Description |
| --- | --- | --- |
| `--name` | string | Key name. |
| `--permissions` | string | Comma-separated: `resource_read_access` (read content and slots), `token_issue` (issue auth tokens), `data_export` (export analytics and event data). |
| `--env` | string | `prod` or `dev`. |
| `--copy`, `-c` | boolean | Copy the key to the clipboard. |

```sh
croct create api-key --name "My API Key" --env prod --permissions resource_read_access,token_issue --copy
```

The key is a secret: do not print it into logs or commit it. Prefer `--copy` or let the user
place it in their environment file.

### `create template`

```sh
croct create template [path] [--empty]
```

Exports workspace resources (experiences, slots, components, audiences) into a template whose
single action is `create-resource`. Interactive selection: choosing experiences pre-selects the
slots and audiences they reference; if an experience has an experiment, the CLI asks whether to
include it.

| Argument / option | Type | Description |
| --- | --- | --- |
| `path` | string (default `template.json5`) | Output path. |
| `--empty`, `-e` | boolean | Write an empty template with a placeholder `print` action instead of exporting. |

### `use`

```sh
croct use <template> [--<option> <value> ...]
```

Applies a template. `template` is a local path, URL, GitHub blob URL, `npm://<package>`, or a
registry URI such as `croct://starter/nextjs` (the command page calls it "the path to the
template file"; the templates sources page documents the other forms). Template options are
passed as flags after the template. Global options only otherwise.

```sh
croct use template.json5 --name my-app
croct use croct://starter/nextjs
```

## Admin and deep links

### `admin`

```sh
croct admin [page]
```

Generates a magic link to the admin app (`https://app.croct.com`) and opens it in the default
browser, no manual login needed. `page` accepts partial names and opens the best match;
otherwise it asks the user to choose. Examples: `home`, `personal settings`, `organization`,
`organization settings`, `organization members`, `workspace`, `workspace settings`,
`workspace members`, `dev application`, `prod application`, `dev application settings`,
`prod application settings`, `slots`, `components`, `experiences`.

### `enable deep-link` / `disable deep-link`

```sh
croct enable deep-link
croct disable deep-link
```

Registers (or removes) a URL protocol so "Run" buttons in the docs, admin, and template
catalog open the CLI with the command ready. The CLI always asks for confirmation before running
a command from a deep link. On the first command run without deep links enabled, the CLI asks
whether to enable them. Global options only.

### `open`

```sh
croct open <url>
```

Executes a deep link; normally invoked by the OS when the user clicks a Run button.

```sh
npx --yes croct@latest open 'croct://use?arg=croct://starter/nextjs'
```

URL syntax: `croct://<command>[/<subcommand>][?<options>&arg=<positional>]`

- Host and path segments map to the command and subcommands.
- Query parameters map to options:

| Parameter | Becomes | Rule |
| --- | --- | --- |
| `f=` | `-f` | Empty value, one-character key: short flag. |
| `force=` | `--force` | Empty value, longer key: long flag. |
| `name=John` | `--name John` | Value present: option with value. |
| `arg=<value>` | positional | Appended after all options; may repeat. |

- Must use `croct://`; no username, password, port, or fragment.

Example: `croct://use?eslint=&name=my-project&arg=croct://starter/nextjs` runs
`croct use 'croct://starter/nextjs' --eslint --name my-project`.

The docs' example `croct://slot/add` is said to correspond to "`croct slot add`", but the
documented command is `croct add slot`; verify the segment order before building such a link.

## Sources

- https://docs.croct.com/reference/cli/installation.md
- https://docs.croct.com/reference/cli/global-options.md
- https://docs.croct.com/reference/cli/commands.md
- https://docs.croct.com/reference/cli/commands/init.md
- https://docs.croct.com/reference/cli/commands/install.md
- https://docs.croct.com/reference/cli/commands/update.md
- https://docs.croct.com/reference/cli/commands/upgrade.md
- https://docs.croct.com/reference/cli/commands/add-slot.md
- https://docs.croct.com/reference/cli/commands/add-component.md
- https://docs.croct.com/reference/cli/commands/remove-slot.md
- https://docs.croct.com/reference/cli/commands/remove-component.md
- https://docs.croct.com/reference/cli/commands/login.md
- https://docs.croct.com/reference/cli/commands/login-credentials.md
- https://docs.croct.com/reference/cli/commands/logout.md
- https://docs.croct.com/reference/cli/commands/create-api-key.md
- https://docs.croct.com/reference/cli/commands/create-template.md
- https://docs.croct.com/reference/cli/commands/use.md
- https://docs.croct.com/reference/cli/commands/admin.md
- https://docs.croct.com/reference/cli/commands/enable-deep-link.md
- https://docs.croct.com/reference/cli/commands/disable-deep-link.md
- https://docs.croct.com/reference/cli/commands/open.md
- https://docs.croct.com/reference/cli/deep-links.md
