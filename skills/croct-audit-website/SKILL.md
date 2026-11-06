---
name: croct-audit-website
description: >-
  Use when the user wants a personalization opportunity audit of a website: find conversion gaps, 
  compare ads with the pages they land on, detect the tech stack and A/B or personalization tools, 
  suggest audiences (segments), dynamic blocks (slots), a first strategy, and an estimated lift, 
  then deliver a Markdown report. Afterwards, offer to turn the plan into Croct resources by 
  generating a CLI template (`template.json5` with `create-resource` audiences, components, slots, 
  draft experiences and experiments) and running it with `croct use`. Phrasings: "audit my website", 
  "personalization opportunities for example.com", "where should I personalize my site?", "what should 
  I A/B test first?", "analyze my landing pages and ads", "find conversion blockers", "set up the 
  experience in Croct", "create the audiences and experiences from the audit".
---

# Audit a website and build a report

Produce a report with a diagnostic of what happens after the click, with segments, dynamic blocks, and 
a first strategy. Then offer to  create those audiences, components, slots, and draft experiences in Croct 
with a CLI template.

Work in three phases and keep them separate:

1. **Collect** findings, each with evidence (a quote, URL, screenshot, or network signal).
2. **Write** the report only from those findings.
3. **Set up** Croct resources, only if the user says yes.

## Phase 0: intake

Ask these in one message, then start. Never block on optional answers.

| Ask                                                                | Required | Use                                                                                               |
|--------------------------------------------------------------------|----------|---------------------------------------------------------------------------------------------------|
| Website URL                                                        | Yes      | Audit target. Normalize to `https://<host>`; refuse `localhost`, private IPs, and intranet hosts. |
| Monthly sessions, conversion rate (%), average order or lead value | No       | Impact figure. All three are needed for a monetary estimate.                                      |
| Deliver as a file or in the chat?                                  | No       | Default: a file named `<slug>-croct-audit.md` in the current directory.                           |

Then check what you can do and tell the user in one line what will be skipped:

| Capability                                                                                                                 | If present                                                                              | If absent                                                                                               |
|----------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Browser tool (Playwright MCP, Claude in Chrome, built-in browser, or Playwright through the shell with the user's consent) | Full capture: screenshots, element crops, network requests, ad libraries                | Fetch HTML only. No screenshots, ad libraries reduced to links, and stack detection limited to the HTML |
| Web fetch                                                                                                                  | Crawl and read pages                                                                    | Use the browser for everything                                                                          |
| The site's source code in the working directory                                                                            | Read `package.json`, `composer.json`, and framework config to confirm the stack and SDK | Rely on the live site                                                                                   |

## Phase 1: collect findings

Record every finding in a working ledger with an ID (`F1`, `F2`, ...), its type, and its
evidence. Methods, fingerprints, URLs, and fallbacks for each step:
[references/audit-steps.md](references/audit-steps.md).

| # | Step                                                                                                                                                                                 | Output                                               | If it fails                                      |
|---|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|--------------------------------------------------|
| 1 | Load the homepage at 1440 x 900, accept the cookie banner, scroll through it, capture HTML, network requests, globals, and screenshots                                              | Page snapshot                                        | Retry once, then stop: "site unreachable"        |
| 2 | Crawl up to 15 same-origin pages, ranked: pricing, products/solutions, industries, personas, use cases, customers, blog index + 3 newest posts, locale variants                      | Page snapshots                                       | Continue with what loaded                        |
| 3 | Detect the stack in 11 categories (framework, CMS, ecommerce, CDP, analytics, CRM/marketing automation, firmographics, tag manager, A/B and personalization, feature flags, consent) | `tool` findings with the matching signal             | Report "not detected"                            |
| 4 | Map the stack to a Croct SDK and integrations                                                                                                                                        | Recommended SDK                                      | Default to `@croct/plug`                         |
| 5 | Find ads in the Google, Meta, and LinkedIn libraries, up to 12 per platform                                                                                                          | `ad` findings with text, CTA, destination, card crop | Keep the library link; say "no active ads found" |
| 6 | Visit each unique ad destination (record its `utm_*` values, then strip them)                                                                                                        | Ad and landing page pairs                            | Pair the ad with the homepage; say the landing page is unconfirmed |
| 7 | Traffic: the user's numbers                                                                                                                                                          | `traffic` finding with its source                    | Omit the figure                                  |
| 8 | Read content: what each page sells, to whom, where; sitewide signals for location, interests, organic, customers                                                                     | `signal` findings that quote the page                | Fewer segments                                   |
| 9 | Inventory components (hero, announcement bar, nav, CTAs, card grids, testimonials, logo walls, pricing cards); crop each and judge how generic it is                                 | `component` findings                                 | Use "Home hero" and the main CTA only            |

Expect LinkedIn to block ad detail pages: read ads from the search results page instead (see
step 5 in the reference). The strongest finding is usually **an ad's promise compared with the page it lands on**. Spend
effort there first. When there are no ads, look for organic, location, or interest findings
instead.

Use domain knowledge to reason about the business, but tie every claim to captured content.

## Phase 2: synthesize and write the report

From the ledger, decide:

- **Main blocker**: 1–2 sentences, the single largest gap.
- **What I noticed**: 2–3 gaps, each specific to this site (quotes, page names, ad angles).
- **Segments**: 3–4, each with a type label (`Persona-based`, `Location`, `Paid campaigns`,
  `Free-account customers`, ...), a one-line definition, the playbook it maps to, and a CQL
  audience (kept for Phase 3, not shown in the report). Write CQL with the `croct-cql` skill.
- **Components**: 3, each naming what changes, for which segments, with its element crop.
- **Others**: other segments and components, naming things actually on the site; say when an
  element is missing, for example "top notification bar (not present)".
- **First strategy**: the top segment combined with the top component, in one sentence. Never
  reuse the generic template example.
- **Problems** (3–5) and **metrics** (3), picked from the template's lists.
- **Playbooks**: 4–6 that a signal or ad finding supports.

Then fill the template exactly: [references/report-template.md](references/report-template.md).
If you detected a competing A/B or personalization tool, add the matching block from
[references/compare-blocks.md](references/compare-blocks.md) before "Next steps".

### Quality gate

Deliver the report only if all of these hold:

- [ ] At least 3 pages loaded, with more than 300 words of visible text in total.
- [ ] No login wall or bot challenge (Cloudflare, Akamai, or similar) on the homepage.
- [ ] At least 2 segments, each resting on a signal or ad finding of medium or high confidence.
- [ ] At least 2 components found on the page (with a crop when a browser is available).
- [ ] Every generated sentence traces to at least one finding in the ledger.

If the report fails the gate, don't write a thin report. Tell the user the site couldn't be
analyzed well and why (blocked, login wall, too little content). Offer to retry with a browser
tool or a different URL, or a manual review at 
`https://croct.com/contact/sales?project=I%20would%20like%20to%20run%20a%20human-led,%20manual%20audit%20of%20my%20website%20to%20identify%20personalization%20opportunities.`.

### Impact

The uplift range is **10–15%**. With all three numbers from the user, add the monthly figure:

```
monthly sessions × conversion rate × value × 10–15%
50,000 × 2% × $400 × 10–15% = $40,000–$60,000 more per month
```

With any number missing, show only the percentage range.

### Deliver

- Write the file (or print it in the chat), with screenshots saved in `<slug>-audit-assets/`
  next to it and linked by relative path.
- Then give a 3–5 line summary in the chat: main blocker, the top segment, the first strategy,
  and the file path.

## Phase 3: offer to set it up in Croct

After delivering, ask once:

> Do you want help setting this up in Croct? I can create the audiences, the components and
> slots, and draft experiences (with optional A/B experiments) for the segments above. Nothing is
> published: everything is created as a draft.

If Croct is already installed on the site, the resources belong in the site owner's workspace:
confirm the user has access to it, and reuse existing slots and components (ask, or read
`croct.json`) instead of creating duplicates.

If they say yes, follow [references/setup-template.md](references/setup-template.md). In short:

1. Confirm which segments, components, and experiments to create, the workspace locale
   (default `en`), and the goal ID for each experiment.
2. Generate `croct-audit/<slug>/template.json5` plus `configuration/*.json`: one
   `create-resource` action with every audience, component, and slot, and one experience per
   segment, all `"draft": true`.
3. Validate every JSON file, show a summary, and get a yes before running.
4. Run `npx croct@latest use ./croct-audit/<slug>/template.json5`. If it needs a login, ask
   the user to run `croct login` themselves (suggest `! npx croct@latest login`).
5. Report what was created and what is left: render the slots in code (the
   `croct-integrate-sdk` skill), track the goals (the `croct-track-events` skill), then review
   and publish the drafts in the Croct dashboard.

## Do / Don't

- Do label numbers. Show only figures you have.
- Do keep the template's fixed text exactly, except `utm_content`, which is the company slug.
- Do keep competitor tools out of "Current tech stack"; they belong in "How Croct compares".
- Don't state anything about a vendor beyond the detected snippet and the linked public facts.
- Don't invent ads, quotes, numbers, or customers. A missing finding becomes a shorter report or
  a failed quality gate, never filler.
- Don't scrape behind logins, solve captchas, or bypass bot protection. Stop and report it.
- Don't create or publish anything in Croct before the user agrees to Phase 3.

## Related skills

- `croct-cql`: audience criteria for each segment.
- `croct-personalize-and-test`: playbooks, experiences, and experiments.
- `croct-model-content`: component schemas and content definitions.
- `croct-use-cli`: templates, `croct use`, login, and `croct.json`.
- `croct-integrate-sdk` and `croct-integrate-platforms`: the SDK and integration recommended in
  the report.

## Live docs

- Popular audiences: `https://docs.croct.com/explanation/audience/popular-audiences.md`
- Playbooks: `https://docs.croct.com/immersion/playbooks/<name>.md`
- Templates: `https://docs.croct.com/reference/cli/templates/actions/create-resource.md`
- Index: `https://docs.croct.com/llms.txt`; search: `https://docs.croct.com/api/search.md?term=<terms>`
