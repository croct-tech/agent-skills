# Experiments

An experiment is an A/B test added to an experience. Instead of rolling a change out to the whole
audience, it splits eligible users across variants and compares them against a goal. Results
use a Bayesian approach, are computed in real time without sampling, and update continuously.

## Rules

| Rule | Value |
|---|---|
| Experiments per experience | One at a time |
| Audience and slots | Inherited from the experience |
| Variants | At least 2, at most 5 (A/B/n). One usually acts as control (baseline) |
| Primary goal | One goal ID, required. Drives the statistical indicators and flags |
| Traffic allocation | % of eligible users that enter the experiment |
| Assignment | Deterministic: visitor ID hashed with the experiment key; reloads never flip the variant |
| Exposure | Tracked automatically |

The docs describe A/B/n tests with up to five variants and do not document a separate
multivariate (factorial) mode. Each variant can set any content in any of the experience's
slots, so a combination of changes is expressed as one variant, within the five-variant limit.
If the user needs true factorial analysis, say the docs are silent and point to the live docs.

## Plan the test

Write these down before touching the dashboard:

1. **Hypothesis**: "Changing X will move goal Y because Z."
2. **Primary goal ID**: the conversion that decides the winner (`sign-up`, `hero-cta-click`,
   `form-submission`). Other tracked goals can be inspected later in the performance per goal
   widget, but only the primary goal drives the flags.
3. **Audience**: all users, or a segment (for example `user is returning`).
4. **Allocation**: 100% for niche audiences; otherwise the share the team is willing to expose.
5. **Variants**: control plus up to four challengers.
6. **Exit criteria**: the dashboard's stability rules (each variant ≥ 1,000 visitors and ≥ 25
   conversions, at least one week) and winner rule (PBB > 95% and potential loss < 0.1%).

## Traffic allocation

- Allocation 30% on a homepage experiment: 30% of visitors get a variant; 70% see the experience
  content.
- Segmented experiment, returning users, 60% allocation: 60% of matching users enter the
  experiment, 40% see the experience content, and users who do not match the audience see the
  slot default content or other active experiences.
- Keep the allocation stable throughout the experiment to avoid skewing results.

## Variants and content

- Create the variants, then set content per variant: Experiences > the experience >
  **Experiments** tab > the experiment > **Settings** > **Content** > pick the variant and slot >
  edit > **Save**.
- A variant can copy the slot content (Options menu > copy from the slot) or inherit the
  experience content, so the control does not need duplicate configuration.
- Each variant can hold content groups for sub-segments.

Changing the traffic distribution or adding or removing variants during an experiment is
strongly discouraged: it can invalidate the results.

## Goals

- The primary goal ID must equal the `goalId` of a `goalCompleted` event tracked in the app.
  Without it the experiment collects exposures but no conversions, and the dashboard shows
  "Track your goal".
- The dashboard suggests goal IDs already tracked in the application.
- Also track `orderPlaced`, `leadGenerated`, and `userSignedUp` when they apply, so the revenue,
  lead, and sign-up widgets are populated for the same comparison.

```js
import croct from '@croct/plug';

croct.track('goalCompleted', {goalId: 'sign-up'});
```

## Cross-device consistency

- For identified users, the user ID is the assignment key, so the variant stays the same on
  laptop, phone, and tablet. Enable the cross-device consistency toggle in the experiment
  configuration.
- Anonymous users have no persistent cross-device identifier; this is expected, not a
  misconfiguration.
- The SDKs reconcile the visitor with the logged-in user once per request (from the framework's
  authentication, or from a user ID resolver configured once). Call `identify` explicitly only
  when login happens outside those flows, and anonymize on logout. See the `croct-integrate-sdk`
  skill.

## Launch checklist

1. Goal event implemented and firing with the exact goal ID.
2. Preview each variant (preview mode; the SDK detects the preview token from the request).
3. Publish.
4. In the experiment dashboard, confirm sessions per variant match the configured split. A
   persistent imbalance means assignment or logging is dropping a class of users; no other
   metric is worth reading until it is fixed. Small early deviations are normal and converge.
5. Complete the conversion yourself and confirm the event appears with the correct goal.

## Quick test locally

Open the app in several incognito tabs; each starts a new session and gets a variant assigned,
so after a few tries both variants should appear.

## Ending the test

- **Recommended winner**: apply the winning content to the experience, then stop the
  experiment.
- **No clear winner**: end without a winner (the dashboard then shows "No clear winner between
  variants") or start a new hypothesis.
- After declaring a winner, the dashboard shows "Experiment finished" with the winner and the
  duration.

Interpretation details: `analytics.md`.

## Sources

- https://docs.croct.com/explanation/experiment.md
- https://docs.croct.com/explanation/content/experiment-content.md
- https://docs.croct.com/explanation/content/groups.md
- https://docs.croct.com/immersion/tutorials/get-started/ab-testing.md
- https://docs.croct.com/immersion/tutorials/experiment-feature-flagging.md
- https://docs.croct.com/reference/analytics/experiment/flags.md
- https://docs.croct.com/reference/event/types/engagement/goal-completed.md
