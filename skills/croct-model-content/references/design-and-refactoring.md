# Design, versioning, and refactoring

## Contents

- [Regular vs union components](#regular-vs-union-components)
- [Best practices](#best-practices)
- [Slots](#slots)
- [Content hierarchy](#content-hierarchy)
- [Versioning and breaking changes](#versioning-and-breaking-changes)
- [Refactoring techniques](#refactoring-techniques)
- [Preview](#preview)
- [Markdown in text attributes](#markdown-in-text-attributes)

## Regular vs union components

- **Regular**: fixed structure and attributes. Example: a static banner that is the same in every
  blog post.
- **Union**: variations combining several regular components. Example: a blog banner that can be
  a text banner, an image banner, or a form banner, chosen per post or experience.

A regular component's schema is its attributes. A union component's schema is the list of
components it combines (up to 10).

## Best practices

| Practice | Do | Don't |
|---|---|---|
| Modularity | Build small components (image, bulleted list, button) and combine them | One large component for a whole page section |
| Descriptive names | "Product feature list", "Product image gallery" | "Product cards", "Product grid" |
| Split complex components | One component per section, each rendered by its own slot, when near the complexity limit | Keep growing one component with many sections |
| Avoid unnecessary components | Use structures or primitives for simple elements like titles or images | A component per title or image |
| Flexibility vs consistency | Flexibility -> structure attribute; consistency -> new component | |
| Refactor when needed | Restructure when a connected component blocks a new nesting level, or a widely used component needs an attribute only some usages want | Force the change into every usage |

Attribute hygiene (from the schema reference):

- Give every attribute a `label` and a `description`; descriptions support basic Markdown.
- Set `position` to control the editor order.
- Use `optional` for content that may be absent and validation (`maximumLength`, `minimum`,
  `pattern`, `allowedTypes`) for real UI constraints.

## Slots

- A slot defines where content goes and which component it uses (hero, announcement bar,
  product-page banner).
- Components are reusable; slots are context-specific. A "Banner" component can back both a
  "Home banner" slot and a "Product banner" slot.
- Default content is shown when the user matches no experience, an experience lacks content for
  the locale, the app requests static content (pre-rendering), or an error occurs.
- Slot status: grey = no requests yet; green = receiving requests; red = received requests before
  but none in the last 7 days.

## Content hierarchy

1. **Slot default content**: the base. Also served to bots excluded by bot filtering and used as
   fallback content when Croct is integrated via the CLI.
2. **Experience content**: content for an audience, edited per slot under the experience's
   Settings > Content. Save as draft or apply.
3. **Experiment content**: per-variant content inside an experience. Configure at least two
   variants; the baseline can duplicate the default content or inherit the experience content.
4. **Content groups**: additional variations for specific audience segments inside an experience
   or an experiment variant. Example: one Free Shipping experience with a group for Miami ($399
   minimum), one for New York ($299), and a catch-all for San Francisco, Los Angeles, and San
   Diego ($199).
5. **Fallback content**: lives in the app's source code; renders on network failures, downtime,
   errors, or manual service suspension. Keep it in sync with the CLI (it syncs from slot default
   content) or source it from a CMS. See the `croct-use-cli` skill.

## Versioning and breaking changes

Components:

1. Modify the component schema, for example add an attribute or change an existing one.
2. If the change affects the content structure in a way that could break the app, Croct creates a
   new version and leaves the old one untouched. The dashboard flags the slots that need review
   after a breaking change.
3. While you update the affected slots and experiences, the app keeps getting the old version.

Slots add a final step:

4. Bump the slot version in the app code and apply the code changes the new structure needs.

Rules:

- Versioning only protects the app when the slot version is specified in code (for example
  `home-hero@1`). Without a version, the app uses the latest version and breaking changes take
  effect immediately.
- The dashboard shows a slot impact alert listing the slots to review, and each slot in the slot
  list shows its version. The alert is a reminder; the app keeps working meanwhile.
- To update a slot: Slots > the slot > each content with a warning indicator > apply changes >
  Save; then Save the slot. The version selector shows the new version; earlier versions stay
  editable.
- If the slot is used in an experience, update the experience content too.
- The docs do not enumerate which schema edits count as breaking. Rely on the impact alert.

## Refactoring techniques

### Duplicate and modify

Use when a change should affect most, but not all, places a component is used. Example: a CTA
button component needs a new attribute that most usages want.

1. On the Components page, open the component's Options menu > **Duplicate component**.
2. Enter a name and slug for the copy, then **Save**.
3. Point the places that must not change to the copy.
4. Change the original component.

### Duplicate and replace

Use when a change should affect only some places. Example: the CTA button needs a style
attribute only in the hero section.

1. On the Components page, open the component's Options menu > **Duplicate component**.
2. Enter a name and slug for the copy.
3. Make the changes on the copy, then **Save**.
4. Point the places that need the change to the copy.

### Flatten and merge

Use when the component has reached the maximum nesting level (6). Example: a "Product Info"
component holds a "Product Details" structure (price, brand, description) and now needs a
"Product Reviews" structure (ratings, comments) but cannot nest deeper. Move price, brand, and
description directly into Product Info, freeing a level for Product Reviews.

1. Identify the component causing the complexity issue.
2. Flatten as many nested structures as needed.
3. Update the content everywhere the component is used.

Flattening always requires content updates in every usage; that cost is unavoidable whichever
approach you take.

### Split across slots

Use when a component is near the complexity limit (50): create one component per section and
render each with its own slot.

## Preview

- Preview links show experience or experiment content as a targeted user sees it, even if you
  are not in the audience. A widget in the bottom-right shows the experience or slot, the
  experiment, audience, content details, and locale.
- Slot preview (only when editing an existing slot) can show default or fallback content.
- For an active experience, choose Published or Draft content before opening the link.
- Links last 24 hours, can be shared with people without a Croct account, and can be regenerated
  without limit.

Troubleshooting:

| Symptom | Cause | Fix |
|---|---|---|
| Stale content | Caching layer or CDN, or other preview links in parallel tabs | Open the link in an incognito window |
| Wrong page | Preview URL defaults to the application's main domain | Set the URL to the page with the slot, or navigate there |
| Nothing changes | Slot not integrated in the app | Check the slot status |
| Older content shown; orange dot on the slot in the experience editor | Experience's slot version differs from the app's | Match the slot version in the experience to the app |
| Content does not load | Domain not a trusted origin | Add it in the application settings |
| No preview widget | Link truncated by a messaging app | Resend the full link |
| Default content shown | Experience is paused | Activate it or create a draft before generating the link |

## Markdown in text attributes

`text` attributes store plain strings; to render Markdown, parse it in the app. `@croct/md-lite`
supports a minimal subset (bold, italic, strike, code, link, image, paragraph) and suits short
texts like titles and descriptions. For a toolbar editor and richer formatting, use the
rich text schema (a `reference` to `@croct/richText`).

```sh
npm install @croct/md-lite
```

```js
import {render} from '@croct/md-lite';

const html = render(content.description, {
    fragment: node => node.children.join(''),
    text: node => node.content,
    bold: node => `<b>${node.children}</b>`,
    italic: node => `<i>${node.children}</i>`,
    strike: node => `<s>${node.children}</s>`,
    code: node => `<code>${node.content}</code>`,
    link: node => `<a href="${node.href}">${node.children}</a>`,
    image: node => `<img src="${node.src}" alt="${node.alt}">`,
    paragraph: node => `<p>${node.children.join('')}</p>`,
});

document.querySelector('.description').innerHTML = html;
```

Reusable React renderer that maps each element to design-system classes:

```tsx
// markdown.tsx
import type {ReactNode} from 'react';
import {render} from '@croct/md-lite';

export type MarkdownClasses = {
    bold?: string,
    italic?: string,
    strike?: string,
    code?: string,
    link?: string,
    paragraph?: string,
};

export function renderMarkdown(content: string, classes: MarkdownClasses = {}): ReactNode {
    return render<ReactNode>(content, {
        fragment: node => node.children,
        text: node => node.content,
        bold: node => <b key={node.index} className={classes.bold}>{node.children}</b>,
        italic: node => <i key={node.index} className={classes.italic}>{node.children}</i>,
        strike: node => <s key={node.index} className={classes.strike}>{node.children}</s>,
        code: node => <code key={node.index} className={classes.code}>{node.content}</code>,
        link: node => <a key={node.index} className={classes.link} href={node.href}>{node.children}</a>,
        image: node => <img key={node.index} src={node.src} alt={node.alt} />,
        paragraph: node => <p key={node.index} className={classes.paragraph}>{node.children}</p>,
    });
}
```

```tsx
// HeroTitle.tsx: heading content "Personalization made **simple**"
import {renderMarkdown} from './markdown';

export function HeroTitle({content}: HeroTitleProps) {
    return (
        <h1 className="text-5xl font-bold">
            {renderMarkdown(content.heading, {
                bold: 'bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent',
            })}
        </h1>
    );
}
```

Guidelines:

- Keep formatting simple: bold, italic, links, inline code.
- Use dedicated attributes for anything that needs validation, consistency, or reuse (CTA labels,
  URLs, product information).
- Document the supported syntax in the attribute description so unsupported formatting does not
  appear broken.

## Sources

- https://docs.croct.com/explanation/component.md
- https://docs.croct.com/explanation/slot.md
- https://docs.croct.com/explanation/content/overview.md
- https://docs.croct.com/explanation/content/slot-default-content.md
- https://docs.croct.com/explanation/content/experience-content.md
- https://docs.croct.com/explanation/content/experiment-content.md
- https://docs.croct.com/explanation/content/groups.md
- https://docs.croct.com/explanation/content/fallback-content.md
- https://docs.croct.com/explanation/content/preview.md
- https://docs.croct.com/immersion/guides/designing-components/best-practices.md
- https://docs.croct.com/immersion/guides/designing-components/refactoring/duplicate-and-modify.md
- https://docs.croct.com/immersion/guides/designing-components/refactoring/duplicate-and-replace.md
- https://docs.croct.com/immersion/guides/designing-components/refactoring/flatten-and-merge.md
- https://docs.croct.com/immersion/guides/using-markdown-syntax.md
