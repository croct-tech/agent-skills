# Report template

Fill this template exactly. Text outside `{...}` is fixed: keep it word for word. The only
change to fixed text is `{slug}` in every Croct link's `utm_content`.

## Placeholders

| Placeholder          | Filled from                                                                    |
|----------------------|--------------------------------------------------------------------------------|
| `{Company}`          | `og:site_name`, else the `<title>` without its tagline                         |
| `{slug}`             | Lowercase company name, letters and digits only (`staffbase`, `simbe`, `gran`) |
| `{date}`             | Audit date as `Mon D, Y` (`Jun 30, 2026`)                                      |
| `{website}`          | Normalized URL (`https://staffbase.com`)                                       |
| `{stack}`            | `tool` findings except competitors, grouped by category, one line (see Rules)  |
| `{traffic}`          | Visits, channel mix, and countries you actually have                           |
| `{blocker}`          | Main blocker, 1–2 sentences                                                    |
| `{impact line}`      | Monetary estimate, only with all three user numbers                            |
| `{campaigns}`        | Ad findings grouped by platform                                                |
| `{gaps}`             | 2–3 paragraphs, one per gap                                                    |
| `{screenshots}`      | Ad card next to its landing page; else the pages named in the gaps             |
| `{segments}`         | 3–4 numbered items                                                             |
| `{other segments}`   | Comma-separated list                                                           |
| `{components}`       | 3 `####` sections                                                              |
| `{other components}` | Comma-separated list naming real elements                                      |
| `{problems}`         | 3–5 bullets from the problem list                                              |
| `{first strategy}`   | Top segment × top component, one sentence                                      |
| `{metrics}`          | 3 bullets from the metric list                                                 |
| `{platform}`         | CMS or ecommerce platform; with none, `your current stack`                     |
| `{playbooks}`        | 4–6 bullets from the playbook list                                             |
| `{compare}`          | One block from `compare-blocks.md` per detected competitor; omit when none     |

UTM suffix used below as `{utm}`:

```
utm_medium=organic&utm_source=materials&utm_campaign=20261100.RE.EC.agent_audit_report&utm_content={slug}
```

## Template

````markdown
# {Company} website audit

Date: {date}
Website: {website}

*Before you spend more on ads, you should fix what happens after the click. This is a custom diagnostic and conversion roadmap by [Croct](https://croct.com?{utm}) to help you increase conversion rates.*

## Executive summary

### **Current tech stack**

{stack}

### **Traffic profile**

{traffic}

### **Main conversion blocker**

{blocker}

> 🚀 **Estimated impact potential**
>
> **10% – 15% lift** in conversion rate by implementing the quick wins below.{impact line}

## Deep dive

#### **Active campaigns evaluated**

{campaigns}

#### **What I noticed**

{gaps}

#### Screenshots

{screenshots}

## Execution plan

### Segmentation criteria

I recommend prioritizing these **high-intent audiences**:

{segments}

Besides these, you could also explore [other segments](https://docs.croct.com/explanation/audience/popular-audiences?{utm}), such as {other segments}.

### Dynamic blocks and elements

I recommend starting by making these components **dynamic**:

{components}

> 💡 Other components that are usually dynamic for personalization purposes include {other components}.

{compare}

## Next steps

### **How to execute this**

First, I need to highlight that there is no silver bullet for personalized strategies. Although these recommendations are based on [real-world cases](https://croct.com/case-studies?{utm}) and are likely to succeed, you should always run an AB test and validate them in your context before rolling them out to 100% of your audience.

> 🧪 **Segmented AB testing**
>
> [This article](https://blog.croct.com/post/ab-tests-personalization?{utm}) shows how to run AB tests with personalization.

A good personalization strategy is not just about changing content. It is about solving business problems with relevant experiences. Before implementing anything, align on four key points:

#### **1. Define the problem and business goal**

Start by identifying the friction points you want to solve and the business outcome you expect to improve. For example:

{problems}

Then define the primary goal behind the strategy, such as increasing conversion rate, improving lead quality, reducing CAC, or increasing retention.

#### **2. Define the personalization strategy**

Once the objective is clear, define:

- **Who** should see a different experience → segmented audience
- **Where** the experience should happen → dynamic blocks and elements
- **What** should change → personalized content

> 🎯 **Suggested first strategy**
>
> {first strategy}

#### **3. Define success metrics**

Before launching any experiment, define how success will be measured. For example:

{metrics}

Clear KPIs prevent subjective decision-making and make it easier to evaluate whether the strategy actually improved the experience.

#### **4. Choose the right implementation workflow**

Different teams execute personalization differently depending on their structure, technical maturity, and internal processes. The important part is choosing a workflow that allows your team to launch experiments quickly, make changes safely, and validate hypotheses continuously.

### **🗓️ Want a walkthrough?**

Click [here](https://croct.com/contact/sales?project=I%20would%20like%20to%20run%20a%20human-led,%20manual%20audit%20of%20my%20website%20to%20identify%20personalization%20opportunities.&{utm}) to book a 30-minute review of this audit report with Croct's team to look at how to set up these exact playbooks in your current stack.

> 🔍 **Deeper dive**
>
> This overview highlights the most important gaps and the priority for fixing them, but Croct's team can go deeper if you are interested in learning more. Click [here](https://croct.com/contact/sales?project=I%20would%20like%20to%20run%20a%20human-led,%20manual%20audit%20of%20my%20website%20to%20identify%20personalization%20opportunities.&{utm}) to book a meeting with an expert.

### Tips to choose the right implementation approach

Once you define your personalization strategy, the next step is deciding how you want to operationalize it. Here are some tips to help you decide the best approach:

- **Custom development:** if you have a development team dedicated to growth initiatives, you can define your strategies and ask developers to implement them for you.
- **Personalization engines + {platform}:** another option is to integrate a personalization engine into your current stack. Since these engines handle customer data processing and audience segmentation, the time to launch personalized plays drops significantly.
- **DXP:** digital experience platforms such as Salesforce, Contentful, and Optimizely typically offer personalization as a native feature. If your company uses any of them, you have everything you need.
- **Personalization component-based platforms:** these are the best option if you don't have a DXP and don't want to over-rely on developers, since they offer a [dynamic component CMS](https://croct.com/component-cms?{utm}) that can be integrated only on the components you want to personalize. Although you need a developer to integrate it for you, adoption can be gradual, and the block integration happens only once (no matter which strategies you choose or how many you apply).

The final choice hardly relies on your team structure and how much you want to invest in personalization. [This guide](https://blog.croct.com/post/ab-testing-tools?{utm}) can help you find the best platform.

### Playbooks

If you want to follow a step-by-step guide and need more practical [playbooks](https://croct.com/playbooks?{utm}), here are some recipes to give you some direction:

{playbooks}

> 🤔 **Real-world examples**
>
> Need to [convince your boss](https://blog.croct.com/post/personalization-business-plan?{utm}) first? Take a look at [case studies](https://croct.com/case-studies?{utm}).
````

## Rules per section

### Current tech stack

- One line, grouped by category, most important first: CMS or ecommerce platform, framework,
  then CRM and marketing automation, CDP, analytics, tag manager, firmographics, consent. Example:
  `Storyblok CMS + Nuxt.js, Segment, Fullstory, Google Tag Manager.`
- Add the recommended Croct SDK as a final sentence when it's not obvious from the stack:
  `Recommended Croct SDK: @croct/plug-next.`
- With nothing detected: `I couldn't detect the stack from the public site.`
- If Croct is already installed, end the line with `Croct is already installed.` and say so in the
  chat. Keep the rest of the report: the gaps show what the current setup doesn't cover yet.

### Traffic profile

- From the user: `~50k monthly sessions.`
  Example: `~350k monthly visits, with a high dependency on search (57%) and direct traffic (32%).`
- With neither, replace the line with: `I couldn't confirm your traffic. Share your monthly
  sessions, conversion rate, and average order or lead value to get a dollar estimate.`

### Impact line

With all three user numbers, append on a new blockquote line:
`> That is about **$40,000–$60,000 more per month** (50,000 sessions × 2% × $400 × 10–15%).`
Otherwise append nothing.

### Active campaigns evaluated

One link per platform, then up to 4 ad images under each, in this order: LinkedIn, Meta, Google.

```markdown
[LinkedIn ads](https://www.linkedin.com/ad-library/search?companyIds=9223407)

![LinkedIn ad: "Save €300,000 on internal magazines"](staffbase-audit-assets/ad-linkedin-1.png)
```

- Without screenshots, list each ad as a bullet: platform, headline or text quote, CTA, landing
  page URL.
- Add the campaign or audience label LinkedIn shows under the headline ("Tier 1 & 2 Grocers") to
  the image alt text: it is evidence for the segments.
- Platforms with no active ads: link the library and add `No active ads found.`
- No ads at all: `[Google ads](...) and [Meta ads](...).` followed by `I found no active
  campaigns.` Then base the gaps on organic, location, or interest findings.

### What I noticed

2–3 paragraphs. Each names the evidence: the ad's angle, the quoted headline, the page it lands
on, and what the visitor sees instead. If the landing page couldn't be confirmed (step 6), say so
in one sentence instead of assuming the ad opens the homepage. Example of the expected depth:

> Active LinkedIn campaigns are heavily focused on specific personas, such as HR teams losing
> time to manual processes or Internal Communicators dealing with printed documents. However,
> these targeted ads lead to a generic homepage that forces visitors to self-identify and
> navigate to the Solutions menu to find their specific use case.

Template examples of gap types (use as inspiration, never copy verbatim):

- Paid traffic from industry-specific ads lands on a generic home page.
- Campaigns go to a dedicated landing page, but the rest of the site is generic.
- Tailored content is hidden in industry, persona, or use-case pages that get little traffic.
- The value proposition varies by region, but the content is not localized.
- Mid-funnel content speaks to enterprise buyers while the product page speaks to SMBs.
- Enterprise traffic from LinkedIn leaves because of generic messaging.

### Screenshots

Pair images: the ad card, then the landing page it leads to. Without ads, show the pages named
in the gaps. With no screenshots at all, delete the `#### Screenshots` heading.

### Segments

```markdown
1. **Persona-based:** Paid traffic originating from persona-specific LinkedIn campaigns.
2. **Location:** Users located in high-demand regions, such as Brasília and Centro-oeste.
3. **Free-account customers:** visitors on the free tier who haven't upgraded yet.
```

Other segments: plain phrases, no definitions, tied to this site where possible ("visitors from
specific geographic regions (given the strong multi-language ad presence in DACH, France, and
Japan)").

### Components

```markdown
#### **Home hero**

Dynamically change the headline, tagline, and primary metrics to match the persona or campaign
of the visitor. For example, highlighting "Connect your frontline workers" for manufacturing
traffic.

![Home hero](staffbase-audit-assets/component-home-hero.png)
```

Name the real element ("Customer Stories and Social Proof sections", "Use cases section") and
say which segments see what.

### Problem list (pick 3–5)

- Low conversion rates from paid traffic
- High bounce rates on landing pages
- Poor engagement with enterprise visitors
- Low return rate from blog readers
- Generic messaging across regions or industries

### Metric list (pick 3)

- Conversion rate
- Bounce rate
- Click-through rate
- Lead quality
- Average order value (ecommerce only)
- Engagement metrics
- Revenue per session

### Playbook list (pick 4–6 with a supporting finding)

Keep this order. Append `?{utm}` to every URL.

| Playbook              | Bullet                                                                                       | Pick when                                               |
|-----------------------|----------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `blog-readers`        | `[Blog readers](https://docs.croct.com/immersion/playbooks/blog-readers?{utm})`              | Active blog                                             |
| `search-terms`        | `[Paid search terms](https://docs.croct.com/immersion/playbooks/search-terms?{utm})`         | Google ads found                                        |
| `organic-intent`      | `[Organic intent](https://docs.croct.com/immersion/playbooks/organic-intent?{utm})`          | Organic is a top channel or many entry pages            |
| `interests`           | `[Interests](https://docs.croct.com/immersion/playbooks/interests?{utm})`                    | Industries, personas, products, or use cases in the nav |
| `location`            | `[Location](https://docs.croct.com/immersion/playbooks/location?{utm})`                      | hreflang, language or currency switcher, regional pages |
| `marketing-campaigns` | `[Marketing campaign](https://docs.croct.com/immersion/playbooks/marketing-campaigns?{utm})` | Any paid social or display ads                          |
| `free-shipping`       | `[Free shipping](https://docs.croct.com/immersion/playbooks/free-shipping?{utm})`            | Ecommerce with a shipping threshold                     |
| `abm-campaigns`       | `[ABM campaigns](https://docs.croct.com/immersion/playbooks/abm-campaigns?{utm})`            | B2B with LinkedIn ads or a firmographics tool           |
| `leads`               | `[Leads](https://docs.croct.com/immersion/playbooks/leads?{utm})`                            | Lead forms, demo requests, newsletter                   |
| `customers`           | `[Customers](https://docs.croct.com/immersion/playbooks/customers?{utm})`                    | Login, free tier, upgrade offers                        |

## Sources

- https://docs.croct.com/explanation/audience/popular-audiences.md
- https://docs.croct.com/immersion/playbooks/blog-readers.md
- https://docs.croct.com/immersion/playbooks/search-terms.md
- https://docs.croct.com/immersion/playbooks/organic-intent.md
- https://docs.croct.com/immersion/playbooks/interests.md
- https://docs.croct.com/immersion/playbooks/location.md
- https://docs.croct.com/immersion/playbooks/marketing-campaigns.md
- https://docs.croct.com/immersion/playbooks/free-shipping.md
- https://docs.croct.com/immersion/playbooks/abm-campaigns.md
- https://docs.croct.com/immersion/playbooks/leads.md
- https://docs.croct.com/immersion/playbooks/customers.md
