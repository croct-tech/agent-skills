<p align="center">
  <a href="https://croct.com" target="_blank">
    <picture>
        <source media="(min-width: 769px) and (prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/croct-tech/plug-js/master/.github/assets/header-light.svg">
        <source media="(min-width: 769px) and (prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/croct-tech/plug-js/master/.github/assets/header-dark.svg">
        <source media="(max-width: 768px) and (prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/croct-tech/plug-js/master/.github/assets/header-dark-mobile.svg">
        <source media="(max-width: 768px) and (prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/croct-tech/plug-js/master/.github/assets/header-light-mobile.svg">
        <img src="https://raw.githubusercontent.com/croct-tech/plug-js/master/.github/assets/header-light-mobile.svg" alt="Croct Agent Skills" title="Croct Agent Skills" width="100%">
    </picture>
  </a>
  <br/>
  <strong>Croct Agent Skills</strong><br/>
  Teach Claude Code, Cursor, Codex, and other AI coding agents to build personalization and A/B tests with Croct.
</p>
<div align="center">
    <strong>🚀 <a href="#quick-start">Quick start &rarr;</a></strong>
</div>
<br/>
<p align="center">
    <a href="https://github.com/croct-tech/agent-skills/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/croct-tech/agent-skills/actions/workflows/ci.yml/badge.svg"/></a>
    <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue"/></a>
    <a href="https://agentskills.io"><img alt="Agent Skills" src="https://img.shields.io/badge/Agent%20Skills-compatible-6b4fbb"/></a>
</p>

## Introduction

Croct is a headless CMS that helps you manage content, run A/B tests, and personalize experiences
without the hassle of complex integrations.

This repository packages [Agent Skills](https://agentskills.io) that give your AI coding agent
working knowledge of Croct, so it can integrate the SDKs, drive the Croct CLI, model content,
write CQL audiences, track events, and plan personalization and experiments without guessing.
Every skill is derived from the official documentation at [docs.croct.com](https://docs.croct.com).

## Quick start

Pick your agent and run one command:

| Agent | Install |
| --- | --- |
| Any Agent Skills-compatible agent | `npx skills add croct-tech/agent-skills` |
| Claude Code | `/plugin marketplace add croct-tech/agent-skills`<br/>`/plugin install croct@croct-agent-skills` |
| Codex | `codex plugin marketplace add croct-tech/agent-skills` |

Then ask your agent in plain language. The right skill loads automatically:

> Add Croct to this Next.js app and render a personalized hero slot

> Create an audience for returning visitors from New York on mobile

> Why is my slot showing the fallback content?

To check the installation, ask: _"Which Croct skills do you have access to?"_

<details>
<summary><strong>Claude Code</strong></summary>

Add the marketplace and install the plugin:

```
/plugin marketplace add croct-tech/agent-skills
/plugin install croct@croct-agent-skills
```

Run `/reload-plugins` to activate it without restarting. The plugin also adds a `/croct` command
that lists the available skills.
</details>

<details>
<summary><strong>Codex</strong></summary>

Add the marketplace:

```sh
codex plugin marketplace add croct-tech/agent-skills
```

Then open the plugin directory, select the **Croct Agent Skills** marketplace, install **Croct**,
and restart Codex.
</details>

<details>
<summary><strong>Cursor, GitHub Copilot, and other agents</strong></summary>

Install with the [`skills`](https://www.npmjs.com/package/skills) CLI, which detects your agent:

```sh
npx skills add croct-tech/agent-skills
```
</details>

<details>
<summary><strong>Manual installation</strong></summary>

Copy the folders under [`skills/`](skills) into your agent's skills directory, for example
`.claude/skills/` for a single project or `~/.claude/skills/` for every project. You need to
update them yourself.
</details>

## Skills

| Skill                                                                      | Use it to                                                                                                                                           |
|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| [`croct-use-croct`](skills/croct-use-croct/SKILL.md)                       | Get oriented: concepts, which skill to load, how to read the live docs                                                                              |
| [`croct-use-cli`](skills/croct-use-cli/SKILL.md)                           | Run `croct init`, add slots and components, generate types and fallback content, configure `croct.json`, write templates                            |
| [`croct-integrate-sdk`](skills/croct-integrate-sdk/SKILL.md)               | Render slots, evaluate queries, and identify users with the JavaScript, React, Next.js, Vue, Nuxt, Hydrogen, PHP, Laravel, Symfony, and Drupal SDKs |
| [`croct-model-content`](skills/croct-model-content/SKILL.md)               | Design components and slots, write schema and content definition JSON, handle versioning                                                            |
| [`croct-cql`](skills/croct-cql/SKILL.md)                                   | Write and debug Contextual Query Language (CQL) for audiences and evaluation                                                                        |
| [`croct-track-events`](skills/croct-track-events/SKILL.md)                 | Track events and goals, manage user and session attributes, identity, and first-party routing                                                       |
| [`croct-personalize-and-test`](skills/croct-personalize-and-test/SKILL.md) | Plan experiences and experiments, feature flags, redirect tests, playbooks, and read analytics                                                      |
| [`croct-use-api`](skills/croct-use-api/SKILL.md)                           | Call the content, evaluation, event tracking, and data export HTTP APIs                                                                             |
| [`croct-integrate-platforms`](skills/croct-integrate-platforms/SKILL.md)   | Connect Storyblok, Sanity, Strapi, Shopify, VTEX, GTM, Clarity, HubSpot, and firmographics providers, or migrate from Mutiny and Ninetailed         |

## How the skills stay accurate

Each reference file lists the documentation pages it came from. When a skill does not cover
something, it tells the agent to read the live docs, which are available as markdown:

- Index: https://docs.croct.com/llms.txt
- Any page: append `.md` to its URL
- Search: `https://docs.croct.com/api/search.md?term=<terms>`

## Documentation

Visit our [official documentation](https://docs.croct.com).

## Support

Join our official [Slack channel](https://croct.link/community) to get help from the Croct team and other developers.

## Contribution

Contributions are always welcome!

- Report any bugs or issues on the [issue tracker](https://github.com/croct-tech/agent-skills/issues).
- For major changes, please [open an issue](https://github.com/croct-tech/agent-skills/issues) first to discuss what you would like to change.
- Read [AGENTS.md](AGENTS.md) for the authoring rules, then run `npm install && npm run validate` before opening a pull request.

## License

These skills are licensed under the [MIT license](LICENSE).
