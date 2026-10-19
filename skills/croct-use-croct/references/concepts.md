# Croct concepts in depth

Use this when you need to explain platform behavior to the user or reason about why content is
(or is not) showing. For code, load `croct-integrate-sdk`; for schemas, `croct-model-content`.

## Account hierarchy

| Level | Typical mapping | Notes |
| --- | --- | --- |
| Organization | A company, group of companies, or personal project | Members have organization roles |
| Workspace | A business unit, product, or project | Holds user data, audiences, components, slots, experiences, experiments; has its own roles and time zone |
| Application | A website or app, usually one per environment | Belongs to exactly one workspace; has its own app ID, API keys, trusted origins, security, privacy, and locale settings |

`croct.json` records the organization, workspace, and the `development`/`production`
application IDs the project uses.

### Workspace roles

| Role | Can do |
| --- | --- |
| Owner | Everything, including settings, applications, and security management |
| Manager | Everything except destructive and security-management actions |
| Maintainer | Manage resources (create audiences/components/slots/experiences, edit drafts) but not settings or members; cannot publish, pause, or archive experiences, nor start, pause, or finish experiments |

Creating API keys requires Owner or Manager.

## Components and slots

- A **component** is a content schema. **Regular** components have a fixed set of attributes;
  **union** components combine several regular components so editors choose one variation.
- A **slot** is a placement bound to one component. Components are reusable across slots; slots
  are context-specific (for example, a `Banner` component used by `home-banner` and
  `product-banner` slots).
- **Versioning:** a breaking schema change creates a new major version and leaves the old one
  untouched. The old version keeps being served to apps pinned to it while editors update the
  affected slot and experience content. Afterwards, the developer bumps the version in code
  (for example, `home-banner@1` → `home-banner@2`).
- Apps that do not pin a version always get the latest one, so breaking changes take effect
  immediately. Always pin.
- **Slot status** in the dashboard: grey = no request received yet; green = receiving
  requests; red = used to receive requests but none in the last 7 days. Use it to confirm a slot
  is actually integrated.

## Content layers

Resolution order for what a user sees in a slot:

1. **Experiment variant**, if the user is in an experiment's traffic allocation.
2. **Experience content**, from the highest-priority active experience whose audience matches.
   **Content groups** can vary content per audience inside one experience or experiment.
3. **Slot default content**, managed in the dashboard per locale. Also served to bots excluded
   by bot filtering, and when the app requests static content (for example, pre-rendering).
4. **Fallback content**, bundled in the app. Used on network failures, downtime, unexpected
   errors, or when services are suspended. The CLI generates it from the default content.

When an experience has no content for the requested locale, the default content is used; when
the default content has no entry for a locale, the default locale's content is used.
Localization is an add-on.

## Experiences

Defined by **who** (one or more audiences), **where** (one or more slots, possibly across
pages), and **what** (content per audience, optionally via content groups).

| Status | Meaning |
| --- | --- |
| Active | Live for matching users |
| Paused | On hold; resumable without losing configuration or data |
| Draft | Being created or reviewed; not delivered until published |
| Scheduled | Starts automatically at a set date and time |
| Archived | Deleted; kept for reference |

- **Priority:** every experience has a unique rank. When several experiences target the same
  slot and a user matches more than one, the higher-priority experience wins. Changing one rank
  shifts the others.
- **Draft changes:** edits to an experience are saved automatically but are not live until
  published; each change can be reviewed and discarded individually.
- **Scheduling** (add-on): schedule start, pause, and resume. Times use the workspace time zone
  or, optionally, each user's local time zone.

## Experiments

- Live inside an experience and inherit its audience and slots. One experiment per experience
  at a time.
- Require a **primary goal ID** (for example, `sign-up`), tracked in the app as a
  `goalCompleted` event with the same ID. Implement the goal before starting.
- **Traffic allocation:** the percentage of eligible users that enter the experiment; the rest
  see the experience content. Use 100% for niche audiences. Keep it stable during the test.
- 2 to 5 **variants**; typically one control. Variants can reuse experience or slot content.
- Do not change traffic distribution or add/remove variants while running; it invalidates
  results.
- Results use a Bayesian approach computed on unsampled data in real time.
- **Cross-device consistency** applies to identified users only (assignment keyed by user ID).
  The feature-flag tutorial enables it with a toggle in the experiment settings; check that
  toggle when variants differ across a user's devices.

## Audiences

Sets of users defined by CQL criteria evaluated against the user's current context (device,
pages visited, location, campaign, custom attributes, and more). The **audience estimator**
shows what share of the user base currently matches while editing. Syntax: `croct-cql`.

## Preview links

- Simulate how an experience, experiment, or slot content looks for a given audience, even when
  you are not part of it. A widget in the bottom-right corner shows preview mode is active.
- For an active experience with edits, choose between **published** and **draft** content.
- For a slot being edited, choose **default** or **fallback** content.
- Links are valid for **24 hours** and can be shared with people without a Croct account.

When a preview does not show the expected content, check in this order:

1. The preview URL points to a page that actually renders the slot.
2. The slot is integrated (slot status is green).
3. The slot version in the experience matches the version pinned in the app (an orange dot on
   the slot in the experience editor signals a mismatch).
4. The domain is a trusted origin.
5. Caching/CDN is not serving a stale page (try an incognito window).
6. The link was not truncated by a messaging app.

## Trusted origins

- Domains authorized to call Croct's client-side APIs on behalf of an application, enforced
  through CORS. Without them, the browser blocks event tracking and content fetching.
- Enter the domain without protocol. Options: port, allow insecure HTTP (for
  `http://localhost:3000`), allow any subdomain (`*.example.com`).
- Never authorize shared hosting domains such as `vercel.app` or `github.io`.

## Operations

- **Service suspension** (Growth and Scale plans): halts event tracking, makes content rendering
  fall back to the content in source code, and rejects API requests. Define fallback content
  first. For permanent removal, remove the SDK instead.
- **Data retention** (defaults by plan; profiles stay while active, counted from the most recent
  event):

| Plan | Profiles | Sessions | Events | Analytics | Backup |
| --- | --- | --- | --- | --- | --- |
| Scale | 60 days | 60 days | 60 days | 90 days | 360 days |
| Growth | 30 days | 30 days | 30 days | 90 days | 180 days |
| Free | 1 day | 1 day | 1 day | 90 days | 90 days |

- Organizations with no event traffic or user activity for 120 consecutive days are permanently
  deleted.

## Sources

- https://docs.croct.com/introduction/overview.md
- https://docs.croct.com/introduction/getting-started.md
- https://docs.croct.com/explanation/organization/overview.md
- https://docs.croct.com/explanation/organization/data-retention.md
- https://docs.croct.com/explanation/workspace/overview.md
- https://docs.croct.com/explanation/workspace/roles-and-permissions.md
- https://docs.croct.com/explanation/workspace/service-suspension.md
- https://docs.croct.com/explanation/application/overview.md
- https://docs.croct.com/explanation/application/api-keys.md
- https://docs.croct.com/explanation/application/trusted-origins.md
- https://docs.croct.com/explanation/component.md
- https://docs.croct.com/explanation/slot.md
- https://docs.croct.com/explanation/content/overview.md
- https://docs.croct.com/explanation/content/slot-default-content.md
- https://docs.croct.com/explanation/content/fallback-content.md
- https://docs.croct.com/explanation/content/groups.md
- https://docs.croct.com/explanation/content/preview.md
- https://docs.croct.com/explanation/experience/introduction.md
- https://docs.croct.com/explanation/experience/priority.md
- https://docs.croct.com/explanation/experience/scheduling.md
- https://docs.croct.com/explanation/experience/unpublished-changes.md
- https://docs.croct.com/explanation/experiment.md
- https://docs.croct.com/explanation/audience/introduction.md
