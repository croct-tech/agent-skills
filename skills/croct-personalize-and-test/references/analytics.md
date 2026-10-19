# Analytics

Use this to explain dashboard numbers to the user and to tell them which events are missing when
a widget is empty.

## Which dashboard

| Dashboard | Scope | Use it to |
|---|---|---|
| Workspace | All applications, all users, exposed or not | Overall health, trends, spotting segments worth personalizing |
| Application | One application; tabs General, Marketing, Conversions | Engagement, campaigns, and conversions for one app |
| Experience | Only sessions and users impacted by one experience | Measure a personalization strategy |
| Experiment | Only users in the experiment, broken down by variant | Decide which variant wins |

## Filters

| Dashboard | Date default | Other filters |
|---|---|---|
| Workspace | Last 7 days | Audience (any audience with matched users) |
| Application | Last 7 days | Audience (audiences that received matches) |
| Experience | Last 7 days | Audience (experience audiences with traffic in the period), device |
| Experiment | Full test period | Audience (experiment audiences with traffic), device |

- Predefined ranges include today, last 14 days, last 28 days, plus a custom range.
- Filters apply to all widgets, except **Online users** (always the last 30 minutes).
- Workspace **Top audiences** with an audience filter shows the top 10 audiences users matched
  *after* the selected one (audience progression).
- "Comparison over the last period" = change versus the period of equal length immediately
  before the selected range.

## Definitions

- **Session**: a visit; starts on arrival and ends after 30 minutes of inactivity (default). One
  user can have several sessions.
- **Active user**: any visitor, human or bot, who accessed the site at least once in the period,
  counted once. Anonymous and identified versions of the same person count as different users.
- Revenue widgets never aggregate across currencies; pick a currency.
- Conversion rates are **per session**, not per user.

## Required events

| Widgets | Feed |
|---|---|
| Sessions, active/new/online users, session duration, clicks, pageviews, tabs, devices, geography, impacted users, active experiences, experiences per session, top audiences, sessions per variant | Automatic (SDK) |
| Conversions, performance per goal | `goalCompleted` |
| Orders, order conversion rate, revenue, average ticket, revenue per user, top products, product sales per variant, campaign revenue | `orderPlaced` |
| Leads, lead conversion rate | `leadGenerated` |
| Sign-ups, sign-up conversion rate | `userSignedUp` |
| Top interests, user interest rate | `interestShown` |

An empty widget almost always means the matching event is not tracked. See the
`croct-track-events` skill.

## Formulas

| Metric | Formula |
|---|---|
| Conversion rate (goal) | sessions with the goal completed / sessions |
| Order conversion rate | orders / sessions |
| Lead conversion rate | leads / sessions |
| Sign-up conversion rate | sign-ups / sessions |
| Average ticket | revenue / orders |
| Revenue per user (ARPU) | revenue / active users |
| Sessions with click | sessions with ≥ 1 click / sessions |
| Average clicks per session | clicks / sessions |
| Average session duration | total session duration / sessions |
| Quantity share | units of a product sold / total units sold |
| Revenue share | revenue of a product / total revenue |
| Experience: percentage of total sessions | experience sessions / workspace sessions |
| Experience: impacted users share | experience active users / workspace active users |
| User interest rate | users who showed interest / active users |

Average ticket vs ARPU: 100 users, 50 purchases, $2,000 total → average ticket $40, ARPU $20.

## Experiment dashboard

### Flags

| Flag | Condition | Action |
|---|---|---|
| Track your goal | No goal completion events recorded for the experiment | Fix `goalCompleted` tracking for the primary goal ID |
| Experiment in progress | Not yet stable | Wait. Stable = every variant ≥ 1,000 visitors **and** ≥ 25 conversions **and** ≥ 1 week running |
| Recommended winner | Stable, and a variant has PBB > 95% **and** potential loss < 0.1% | Consider ending and applying the winner |
| No clear winner | Stable, variants too similar; more data unlikely to change it | End without a winner or test a new hypothesis |
| No clear winner between variants | The test was ended without a winner | — |
| Experiment finished | A winner was declared | Shows the winner and duration |

### Performance per goal

The decision widget. Columns: goal filter, variant, conversion rate, improvement (relative to the
baseline), conversions, probability to be best, potential loss. Any tracked goal can be selected,
but flags use the primary goal.

- **Improvement** is relative: A at 10% and B at 12% is a 20% improvement for B.
- **Probability to be best (PBB)**: how likely a variant beats all others. 95% is the common
  minimum to declare a winner.
- **Potential loss**: expected missed gain if you pick this variant and it is not the best. A 2%
  potential loss on A means sticking with A may leave up to 2 percentage points of conversions on
  the table; it is a missed opportunity, not a drop.

How to read it:

| Pattern | Reading |
|---|---|
| High PBB and low potential loss | Confident winner |
| Close PBB across variants | Need more data, or the change has no meaningful impact |
| High potential loss | Picking this variant risks significant missed gains; wait for more data |
| Values stable over time | Ready for a decision (after ≥ 1,000 visitors and ≥ 25 conversions per variant) |

### How PBB and potential loss are computed

- Each variant's conversion rate is modeled as Beta(α, β), with α = conversions and
  β = interactions − conversions. More data narrows the distribution.
- **PBB**: Monte Carlo. Each round, sample a rate from every variant's distribution and record the
  highest; repeat thousands of times. PBB_i = rounds where i was highest / total rounds.
- **Potential loss**: each round, compute max(best competing rate − rate of i, 0); average over
  all rounds.

### Other experiment widgets

| Widget | Shows | Watch for |
|---|---|---|
| Sessions per variant | Sessions assigned to each variant | Must converge to the configured split; persistent imbalance = configuration or logging issue. Low volume → broaden the audience or reduce variants |
| Sessions with click | % sessions with a click and clicks per session, per variant (page filter) | Very high click counts can signal friction |
| Average session duration | Per variant | Longer is not always better; read with conversions |
| Total orders, total revenue, total sign-ups, total leads | Counts per variant | Not meaningful before statistical validity, especially with low traffic |
| Order / lead / sign-up conversion rate | Per variant | Small differences may need more data |
| Average ticket, revenue per user | Per variant, per currency | Separates "more orders" from "more valuable orders" |
| Product sales per variant | Top 10 products per variant | Which products a variant pushes |

## Experience dashboard

Isolates users and sessions impacted by the experience. Widgets: sessions (and share of all
workspace sessions), impacted users (and share of active users, per slot over time), conversions
(per goal, by device), clicks (by device), average session duration (with duration ranges),
order/lead/sign-up conversion rates and totals, revenue, average ticket, revenue per user, top
products. Use the audience filter to compare the subgroups of a multi-audience experience.

## Application and workspace dashboards

- **Application, General**: total sessions, sessions per day, new vs returning sessions, online
  users, average session duration, pageviews/tabs/tabviews per session, clicks, device
  distribution (category, vendor, browser), geographic distribution (top 10 countries, regions,
  cities), active experiences, experiences per session.
- **Application, Marketing > Campaigns**: top 10 campaigns grouped by UTM (source, medium,
  campaign, content, term) with users, sessions, order conversion rate, orders, revenue.
- **Application and workspace, Conversions**: conversions (application only), orders, revenue,
  leads, sign-ups, and their conversion rates.
- **Workspace, General**: active users, new users, online users, sessions, session duration,
  clicks, geography, top audiences, top interests, user interest rate.

Use workspace and campaign data to find under-performing segments worth an experience; use
experience and experiment dashboards to measure them.

## Explaining results to the user

1. State the flag first. If it is "Experiment in progress" or "Track your goal", stop there and
   say what is missing.
2. Check sessions per variant against the split.
3. Report the primary goal from Performance per goal: conversion rate, improvement, PBB, and
   potential loss for each variant.
4. Add secondary metrics (revenue, ARPU, average ticket) as context, not as the decision.
5. Recommend per the flag: apply the winner to the experience and stop the experiment, keep
   running, or end with no winner.

## Sources

- https://docs.croct.com/reference/analytics/workspace/overview.md
- https://docs.croct.com/reference/analytics/workspace/filters.md
- https://docs.croct.com/reference/analytics/application/overview.md
- https://docs.croct.com/reference/analytics/application/filters.md
- https://docs.croct.com/reference/analytics/application/marketing/campaigns.md
- https://docs.croct.com/reference/analytics/experience/overview.md
- https://docs.croct.com/reference/analytics/experience/filters.md
- https://docs.croct.com/reference/analytics/experience/widgets/impacted-users.md
- https://docs.croct.com/reference/analytics/experience/widgets/sessions.md
- https://docs.croct.com/reference/analytics/experience/widgets/conversions.md
- https://docs.croct.com/reference/analytics/experiment/overview.md
- https://docs.croct.com/reference/analytics/experiment/filters.md
- https://docs.croct.com/reference/analytics/experiment/flags.md
- https://docs.croct.com/reference/analytics/experiment/widgets/performance-per-goal.md
- https://docs.croct.com/reference/analytics/experiment/widgets/sessions-per-variant.md
- https://docs.croct.com/reference/analytics/experiment/widgets/sessions-with-click.md
- https://docs.croct.com/reference/analytics/experiment/widgets/average-ticket.md
- https://docs.croct.com/reference/analytics/experiment/widgets/revenue-per-user.md
- https://docs.croct.com/reference/analytics/experiment/widgets/product-sales-per-variant.md
- https://docs.croct.com/reference/analytics/workspace/general/widgets/user-interest-rate.md
