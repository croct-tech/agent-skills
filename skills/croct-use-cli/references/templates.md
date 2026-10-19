# CLI templates

A template is a JSON5 (or JSON) file that declares typed **options** and runs an ordered list of
**actions**. Apply with `croct use <source>`; scaffold with `croct create template --empty`;
export workspace resources with `croct create template [path]`.

## File format

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
    {"name": "install"},
    {"name": "integrate-croct"}
  ]
}
```

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| `$schema` | string | no | `https://schema.croct.com/json/v1/template.json` (catalog: `https://schema.croct.com/json/catalog-template.json`). |
| `title` | string | yes | Shown before the user confirms execution. |
| `description` | string | yes | Shown with the title. |
| `options` | Record<string, Option> | no | Names start with a letter or digit; letters, digits, `-`, `_`. |
| `actions` | Action[] | yes | Run in order. |
| `metadata` | object | no | Reserved for tooling and registries; ignored at execution. |

## Options

Common properties: `type`, `description` (prompt text), `default` (optional). The CLI prompts
for required options not passed as flags. Read them as `${options.<name>}`.

| Type | Extra properties | Pass on the command line |
| --- | --- | --- |
| `string` | `choices: string[]` (renders a selection prompt) | `--name Alice`, `--color green` |
| `boolean` | | `--uppercase` / `--no-uppercase` |
| `number` | | `--times 3` |
| `array` | | `--names '["Alice", "Bob"]'` (JSON array) |
| `reference` | `default` is a variable name | Used by `import`: the value is a variable *name* in the caller's scope; the imported template reads/writes it via `this[options.target]`. |

```json5
// to-upper.json5 (imported helper with a reference option)
{
  "title": "To uppercase",
  "description": "Converts a variable value to uppercase.",
  "options": {"target": {"type": "reference", "description": "The variable to convert."}},
  "actions": [
    {"name": "define", "variables": {"${options.target}": "${this[options.target].toUpperCase()}"}}
  ]
}
```

## Expressions

`${...}` anywhere in keys or values, using a JavaScript subset.

- **Type preservation**: a value that is exactly one expression keeps its type
  (`"${40 + 2}"` is the number 42). Anything else, even a leading space, is string
  interpolation. Passing `"Total: ${40 + 2}"` to a number option fails with
  `Expected value of type number for option count, but got string.`
- Operators: arithmetic `+ - * / % **`; comparison `== != === !== < > <= >=`; logical
  `&& || !`; `??`; ternary.
- Literals: strings, numbers, booleans, `null`, arrays, objects `{key: 'value'}`, regex
  `/pattern/flags`.
- Access: dot or bracket (`${project.path.source}`, `${options['name']}`).
- Strings: `length`, `slice`, `indexOf`, `match`, `matchAll`, `replace`, `replaceAll`,
  `includes`, `startsWith`, `endsWith`, `toLowerCase`, `toUpperCase`, `repeat`, `split`.
- Arrays: `length`, `slice`, `join`, `includes`, `indexOf`, index access.
- Regex: `source`, `test`.
- Nothing else is documented; do not assume `map`, `filter`, `trim`, etc. exist.

### Variables

Resolved lazily (network/prompts only when referenced).

| Variable | Contents |
| --- | --- |
| `options` | Option values by name. |
| `this` | Variables set by `define` and by action `result`/`output` properties in the current scope. |
| `packageManager.name` | `npm`, `yarn`, `pnpm`, or `bun`. |
| `project.platform` | `nextjs`, `react`, `javascript`, or `unknown`. |
| `project.path.{source,utilities,components,examples,content}` | Resolved paths from `croct.json` `paths` or auto-detection (`content` defaults to project root). |
| `project.organization.{slug,url}` | Configured organization and its dashboard URL. |
| `project.workspace.{slug,url}` | Configured workspace and its dashboard URL. |
| `project.application.{development,production}.{slug,url,publicId}` | Applications; `publicId` initializes the SDK. |
| `project.features.{crossDevice,dataExport}` | Workspace feature flags (booleans). |
| `project.quotas.{audiences,remainingAudiences,components,remainingComponents,slots,remainingSlots,experiences,remainingExperiences,dynamicAttributesPerContent,audiencesPerExperience}` | Plan limits and remaining capacity. |
| `project.server.{running,url}` | Local dev server state; `url` only when running. |

### Functions

| Function | Returns |
| --- | --- |
| `basename(path, omitExtension = false)` | `basename('src/components/Button.tsx')` -> `Button.tsx`; with `true` -> `Button`. |
| `dirname(path)` | `src/components`; `.` when there is no directory part. |
| `ext(path)` | Extension without the dot (`tsx`); `''` when none. |
| `import(path, params?)` | Loads a JSON/JSON5 file relative to the template, evaluates its expressions, returns the value. `params` merge into the file's `this`; it still sees all parent variables. Can stand in for an action: `"${import('./actions/welcome.json5', {name: 'Alice'})}"`. |
| `url(path)` | Absolute URL relative to the template location (`url('./assets/config.json')` on a GitHub-hosted template -> `https://github.com/acme/templates/blob/main/assets/config.json`). |
| `uuid()` | New random UUID v4 per call. |

## Actions

Every action is an object with `name` plus the properties below. `result`/`output` properties
name a variable later read as `${this.<var>}`.

### Croct project and workspace

| Action | Properties | Notes |
| --- | --- | --- |
| `integrate-croct` | none | Same as `croct init`; skipped if already initialized. |
| `create-resource` | `resources` {`components`, `slots`, `audiences`, `experiences`}; `result` | Provisions in the workspace only. Reuses an existing matching resource (by ID and definition) instead of duplicating, so it is idempotent; capture IDs/versions via `result` because they may differ from the template's. |
| `add-slot` | `slots: string[]` (`id` or `id@version`; default latest); `example?: boolean` | Same as `croct add slot`. `example` writes usage code to `paths.examples`. |
| `add-component` | `components: string[]` (`id` or `id@version`) | Same as `croct add component`. |
| `create-api-key` | `keyName`, `environment` (`development`/`production`), `permissions` (`resource_read_access`, `token_issue`, `data_export`), `result` | Stores the secret in a variable. Requires an initialized project with an application for that environment. |

`create-resource` definitions:

- `components.<id>`: `name`, `description?`, `schema` (content schema; see the
  `croct-model-content` skill).
- `slots.<id>`: `name`, `component` (ID defined here or already in the workspace), `content`
  (locale -> content definition; each locale must exist in the workspace).
- `audiences.<id>`: `name`, `criteria` (CQL; see the `croct-cql` skill).
- `experiences[]`: `name`, `draft?` (default `false` = published immediately), `audiences[]`,
  `slots[]`, `content` {`default?`: slot -> locale -> content, `segmented?`: [{`audiences`,
  `content`}]}, `experiment?` {`name`, `traffic` (0-1), `variants[]` (at least two: `name`,
  `content`, `allocation` relative weight, `baseline?`), `goalId?`, `crossDevice?`}.
- `result`: `components.<id>`/`slots.<id>` -> {`id`: var, `version`: var};
  `audiences.<id>` -> var; `experiences`/`experiments` -> zero-based index -> var.

```json5
// Two entries of the "actions" array
{
  "name": "create-resource",
  "resources": {
    "components": {
      "top-bar": {
        "name": "Top bar",
        "schema": {
          "type": "structure",
          "attributes": {"message": {"type": {"type": "text"}, "label": "Message", "position": 0}}
        }
      }
    },
    "slots": {
      "home-banner": {
        "name": "Home banner",
        "component": "top-bar",
        "content": {
          "en": {
            "type": "structure",
            "attributes": {"message": {"type": "text", "value": {"type": "static", "value": "Welcome!"}}}
          }
        }
      }
    }
  },
  "result": {"slots": {"home-banner": {"id": "bannerSlotId", "version": "bannerSlotVersion"}}}
},
{"name": "add-slot", "slots": ["${this.bannerSlotId}@${this.bannerSlotVersion}"]}
```

### Dependencies and commands

| Action | Properties | Notes |
| --- | --- | --- |
| `install` | none | Installs dependencies with the detected package manager. |
| `add-dependency` | `dependencies: string[]` (version specifiers allowed, `tailwindcss@4`); `development?` (default `false`) | |
| `check-dependency` | `dependencies[]` {`name`, `version?` (range, package-manager syntax), `optional?`}; `result?` (package -> var); `help?` {`message`, `suggestions?`, `links?[{label,url}]`} | Without `result`, fails on any missing non-optional package. Packages listed in `result` never fail; they set booleans. |
| `execute-package` | `command` (`giget@latest`, or a `package.json` script name with `script: true`); `arguments?`; `runner?` (`npm`/`yarn`/`pnpm`/`bun`); `interactions?`; `output?` | Runs via npx/pnpx/etc. `interactions: true` passes all I/O to the terminal (then `output` is not allowed). |
| `start-server` | `server?` {`script`, `url`, `arguments?`} (auto-detected if omitted); `result?` {`id`, `url`} | Waits until `url` responds. `id` is `null` if the server was already running. |
| `stop-server` | `id` | ID from `start-server`. |
| `format-code` | `files: string[]` | Uses the project's formatter; silently does nothing if none or on failure. |
| `open-link` | `url` | Opens the default browser. |

`execute-package` interaction rules (evaluated in order; at least one must be `final`):
`when` (text, or regex with `pattern: true`), `then?` (responses; special keys `[enter]`,
`[space]`, `[up]`, `[down]`, `[left]`, `[right]`, `[backspace]`), `always?` (respond every time;
not with `final`), `final?` (stop accepting input). Each rule needs `then` or `final`.

```json5
{
  "name": "execute-package",
  "command": "shadcn@latest",
  "arguments": ["add", "button", "card"],
  "interactions": [
    {"when": "Would you like to overwrite?", "then": ["y"], "always": true},
    {"when": "(Created|Skipped) \\d+ files?", "pattern": true, "final": true}
  ]
}
```

### Files and paths

| Action | Properties | Notes |
| --- | --- | --- |
| `download` | `source` (URL or path relative to the template); `destination`; `filter?` (glob); `mapping?` (source name -> destination name, expressions allowed); `overwrite?`; `result?` {`destination`} | |
| `write-file` | `path`, `content`, `overwrite?` | If `overwrite` is unset and the file exists, the user is prompted. Set it explicitly for non-interactive runs. |
| `read-file` | `path`, `result`, `optional?` | `optional: true` stores `null` instead of failing when missing or a directory. |
| `replace-file-content` | `files[]` {`path`, `replacements[]` {`pattern` (regex), `value` (`$1` capture refs), `caseSensitive?`}} | Replaces all occurrences, sequentially. Fails if no files match. |
| `resolve-import` | `path` (glob) | Rewrites `?/`-prefixed import specifiers (e.g. `import {cn} from "?/src/**/utils/*.ts"`) to the real path of the matching file that exports those names, using project aliases or relative paths. Fails if no files match. |
| `locate-path` | `path` (glob), `result` (string[]), `limit?`, `depth?` (0 = current directory only), `matcher?` | `matcher`: `{pattern, caseSensitive?}` or `{type: "and"|"or", matchers: [...]}`, nestable. |
| `create-directory` | `path` | Creates parents; idempotent. |
| `move-path` | `path`, `destination`, `overwrite?` (default `false`) | Fails if destination exists unless `overwrite`. |
| `delete-path` | `path`, `recursive?` (default `false`, required for non-empty directories) | No error if missing. |
| `change-directory` | `path` | Working directory for all following actions. |

### Flow control and I/O

| Action | Properties | Notes |
| --- | --- | --- |
| `define` | `variables` (name -> literal or expression) | Sets `this.<name>` for following actions. |
| `test` | `condition`, `then`, `else?` | Branches take one action or an array. |
| `repeat` | `condition`, `actions[]` | Loops while true. |
| `run` | `actions` (one or array) | Groups steps where a single action is expected. |
| `try` | `action`, `else?`, `finally?`, `help?` {`message?`, `suggestions?`, `links?`} | `else` runs on failure (then `help` is ignored); `finally` always runs. Without `else` or `help` the original error propagates. |
| `import` | `template` (relative path, URL, or registry URI), `options?`, `share?: string[]` | Runs another template in an isolated scope; `share` lets it read/write listed caller variables. |
| `fail` | `message`, `title?`, `details?`, `suggestions?`, `links?` | Aborts with an error. |
| `print` | `message` (supports `**bold**`, `*italic*`, `~~strike~~`, `` `highlight` ``, `[text](url)`), `semantics?` (`neutral` default, `info`, `success`, `warning`, `error`), `title?` (renders a callout) | |
| `prompt` | `type`, `message`, `result` (optional for `keypress`), plus type-specific props | See below. |

`prompt` types and results: `confirmation` (boolean), `text` (string), `choice` (string),
`multi-choice` (string list), `keypress` (string).

- `default`: boolean for `confirmation`, string for `text`/`choice`; not for `multi-choice` or
  `keypress`. **Used when running non-interactively.** Takes precedence over `initial`.
- `initial` (`text`): pre-filled editable value.
- `required` (`text`): reject empty input.
- `options` (`choice`, `multi-choice`): strings or `{value, label?, disabled?, selected?}`
  (`selected` for `multi-choice`).
- `min`/`max` (`multi-choice`).
- `key` (`keypress`): `enter`, `space`, or one character; any key if omitted.

## Sources (where `croct use` loads from)

| Form | Example | Resolution |
| --- | --- | --- |
| Local file | `croct use template.json5` | Relative or absolute path. Best for testing. |
| URL | `croct use https://example.com/template.json5` | Without a filename, looks for `template.json` or `template.json5`. |
| GitHub | `croct use https://github.com/org/repo/blob/master/template.json5` | Repository, branch, and path extracted from the blob URL. |
| npm | `croct use npm://package-name` | Reads npm metadata, finds the linked GitHub repo, fetches the template from its root. |
| Registry | `croct use croct://starter/nextjs` | Scheme mapped by the registry. |

### Registries

A registry is a JSON5 array of `{pattern, destination}`: `pattern` is a regex matched against
the source; `destination` uses `$1`, `$2` and resolves relative to the registry file. First match
wins.

```json5
[
  {"pattern": "^croct://?(.+)$", "destination": "croct/$1"},
  {"pattern": "^shadcn-ui://?(.+)$", "destination": "shadcn-ui/$1"}
]
```

Built-in schemes: `croct://` (Croct templates), `shadcn-ui://`, `magic-ui://`, `hero-ui://`,
`material-ui://`, `mantine://`, `tailwind://`, `nextjs://`, `npm://`. A custom registry replaces
the built-in one: `croct --registry https://example.com/registry.json5 use my-scheme://template`.

## Authoring and publishing workflow

1. Scaffold: `croct create template --empty` (writes `template.json5` with a placeholder `print`
   action), or export resources: `croct create template [path/to/my-template.json5]`.
2. Edit metadata, options, and actions. Examples: https://github.com/croct-tech/templates
3. Test: `croct use template.json5 [--option value]`.
4. Share:
   - The file itself (fine when there are no extra assets such as images or code files).
   - A public URL, or a GitHub blob URL (versioned).
   - npm: put the template in the root of the GitHub repo linked from the package; users run
     `croct use npm://<package>`.
5. Catalog (`https://croct.com/templates`): fork `croct-tech/templates`, switch `$schema` to
   `https://schema.croct.com/json/catalog-template.json`, add `metadata` (`id`, `verified`,
   `author` {`name`, `avatarUrl`, `websiteUrl`}, `categories`, `sourceUrl`, `coverImageUrl`,
   `installationUrl` such as `croct://utils/example-launcher`, `documentationUrl`), place it in a
   subfolder of a directory named after the company domain without the TLD, open a pull request,
   and fix any failing checks before requesting review.
6. README button once listed:

```md
[![Use Template](https://croct.com/button)](https://croct.com/templates/boilerplate/starter/nextjs-croct)
```

Use `https://croct.com/button?variant=cms` for templates whose main purpose is a component
schema.

## Authoring rules

- Check preconditions first (`check-dependency`, `test` on `project.platform`, then `fail` with
  suggestions) so the template aborts before changing files.
- Capture IDs from `create-resource` `result` and feed them to `add-slot`/`add-component`.
- Set `overwrite` explicitly on `write-file`/`download` and give every `prompt` a `default` so
  the template also works with `--no-interaction`.
- Use `project.path.*` instead of hardcoded `src/...` paths, and `resolve-import` instead of
  hardcoded import paths, so the template adapts to each project.
- Single-expression values keep their type; wrap only when you need a string.

## Sources

- https://docs.croct.com/reference/cli/templates/overview.md
- https://docs.croct.com/reference/cli/templates/structure.md
- https://docs.croct.com/reference/cli/templates/sources.md
- https://docs.croct.com/reference/cli/templates/registries.md
- https://docs.croct.com/reference/cli/templates/expressions.md
- https://docs.croct.com/reference/cli/templates/variables.md
- https://docs.croct.com/reference/cli/templates/functions.md
- https://docs.croct.com/reference/cli/templates/options/overview.md
- https://docs.croct.com/reference/cli/templates/options/types.md
- https://docs.croct.com/reference/cli/templates/actions.md
- https://docs.croct.com/reference/cli/templates/actions/create-resource.md
- https://docs.croct.com/reference/cli/templates/actions/execute-package.md
- https://docs.croct.com/reference/cli/templates/actions/prompt.md
- https://docs.croct.com/reference/cli/commands/create-template.md
- https://docs.croct.com/immersion/tutorials/template-publishing.md
