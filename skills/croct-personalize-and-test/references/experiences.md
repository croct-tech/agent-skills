# Experiences

An experience shows different content to a specific group of visitors. Users who match the
targeting rules see the tailored content; everyone else sees the slot's default content. Use
experiences to personalize journeys or as the container for an experiment.

## Anatomy

| Part | What to decide | Notes |
|---|---|---|
| Audience (who) | One or more audiences, written in CQL | Use one audience per subgroup (for example, one per paid search campaign) to keep them separable in the experience analytics. |
| Slots (where) | One or more slots | Combine slots across pages (homepage, product page, checkout) for a consistent journey. |
| Content (what) | Content per slot that replaces the slot default content | With several audiences, give each its own content using content groups. |
| Experiment (optional) | An A/B/n test inside the experience | See `experiments.md`. |

## Audiences

- An audience is a set of criteria written in CQL, evaluated against the user's current context
  (device, pages visited, campaign, location, events, custom attributes, and more).
- It can be as broad as all users or as narrow as users who visited a specific page.
- While the criteria are being refined, the dashboard's audience estimator shows what share of
  the user base currently matches them.
- After evaluating audiences, Croct picks the highest-priority experience for the user.
- Syntax and the full list of expressions: load the `croct-cql` skill. Ready-made criteria:
  `playbooks.md`.

## Content groups

Groups let one experience (or one experiment variant) carry different content for different
audiences. Example from the docs, a free-shipping campaign with thresholds per city:

- Group for Miami: minimum purchase $399.
- Group for New York: minimum purchase $299.
- Catch-all group for San Francisco, Los Angeles, and San Diego: $199.

Groups work inside experiments too, for example testing a personalized shipping offer against a
generic one across all cities while still adapting the content per region.

## Status

| Status | Delivered? | Notes |
|---|---|---|
| Draft | No | Being created or reviewed. Draft changes are not delivered until published. |
| Scheduled | Not yet | Becomes active automatically at the scheduled start. |
| Active | Yes | Delivered to users matching the audience. |
| Paused | No | Can be resumed without losing configuration or collected data. |
| Archived | No | Deleted; kept for reference only. |

## Priority

- A user can qualify for several experiences at once (for example, "First-time visitors" and
  "Mobile users").
- When they target the **same slot**, the higher-priority experience is delivered.
- Every experience has a unique rank; changing one experience's rank shifts the others.
- In the dashboard: open the experience, type the desired rank in the priority section, compare
  against the list, then save and publish. Experiences marked with a paper icon in the priority
  preview still have draft changes.

Planning rule: give the most strategic or time-sensitive experience the highest priority, and
check for overlapping audiences on shared slots before publishing.

## Draft changes

- Edits are saved automatically but **not published**.
- Each panel with pending changes shows an orange dot; hovering lists the changes, color-coded
  (green added, blue modified, gray strikethrough removed). Each change can be discarded
  individually.
- Publish to make changes live, or schedule them. Scheduling applies to starting or pausing the
  experience and to any saved draft content or settings.

## Scheduling (add-on)

Scheduling is an add-on. Three actions:

| Action | Use for |
|---|---|
| Start date | Launch at a set date and time, including nights, weekends, and holidays |
| Pause | Stop at a set moment: campaign end, special dates, operational constraints |
| Resume | Bring a paused experience back automatically |

Time zone: defaults to the workspace time zone. Alternatively, schedule in the **audience's**
time zone so each user sees the change at their local time (for example, a New Year campaign
that goes live at local midnight everywhere).

## Experience content

Edit in the dashboard: Experiences > the experience > **Settings** > **Content** > pick the slot
> edit attributes > **Save**. Then save as draft or apply the changes. To model or write the
content JSON itself, load the `croct-model-content` skill.

## Verifying an experience

1. Use preview to check the content before publishing.
2. During development, target a query parameter so the experience can be toggled:

   ```cql
   property welcome of page's query is "true"
   ```

   Load the page with and without `?welcome=true` to compare experience and default content.
3. In production, replace the parameter with the real audience.

## Sources

- https://docs.croct.com/explanation/experience/introduction.md
- https://docs.croct.com/explanation/experience/priority.md
- https://docs.croct.com/explanation/experience/scheduling.md
- https://docs.croct.com/explanation/experience/unpublished-changes.md
- https://docs.croct.com/explanation/content/experience-content.md
- https://docs.croct.com/explanation/content/groups.md
- https://docs.croct.com/explanation/audience/introduction.md
- https://docs.croct.com/immersion/tutorials/get-started/slot-personalization.md
