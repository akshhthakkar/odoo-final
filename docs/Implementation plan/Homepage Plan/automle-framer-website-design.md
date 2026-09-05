# Design System: Automly

## 1. Visual Theme & Atmosphere

- Overall feeling: Modern, polished, and conversion-focused with a “smart automation” startup aesthetic. The page feels clean, high-contrast, and product-led.
- Visual density: Medium. Large hero typography and spacious sectioning are balanced by repeated proof points, feature cards, and pricing blocks.
- Brand posture: Confident and technical, but approachable. It sells enterprise-grade HR automation with clear outcomes and minimal visual noise.
- Signature motifs: Blue accent color, oversized headline typography, repeated CTA pairs, rounded cards, and product screenshots used as proof.

### Key Characteristics

- Clean white canvas with strong black text and vivid blue accents
- Large editorial-style hero headline paired with product imagery
- Repeated section rhythm: pain → features → process → results → pricing
- Conversion-first layout with duplicated CTAs and social proof

## 2. Color Palette & Roles

| Role | Semantic Name | Value | Usage |
| --- | --- | --- | --- |
| Primary action | Automation Blue | #4671FA | Primary CTA buttons, brand emphasis, key highlights |
| Accent | Link Blue | #527AFF | Links, secondary highlights, interactive emphasis |
| Secondary action | Action Blue | #2266FF | Alternate blue used for emphasis and UI actions |
| Surface | Clean White | #FFFFFF | Page background, cards, content surfaces |
| Text | Ink Black | #000000 | Headings and body copy for maximum contrast |
| Border | Soft Neutral Border | #E5E7EB | Inferred subtle divider/border treatment on white surfaces |

### Primary

- #4671FA as the main brand/action color for CTAs and promotional emphasis
- #2266FF and #527AFF as supporting blues for links, hover states, and accent details

### Interactive

- Links use blue rather than underlines-heavy styling; visual emphasis likely comes from color alone
- Hover/focus states are not directly evidenced, but should remain within the blue family for consistency
- Active interactions should feel crisp and modern, not playful or animated-heavy

### Neutral Scale

- Pure white background suggests a minimal neutral base
- Black primary text indicates an intentionally high-contrast, stripped-back hierarchy
- Light gray borders/dividers are a reasonable inference for card separation and section framing

### Surface & Overlay

- Main surface token: White page background (#FFFFFF)
- Card surface token: White or near-white surfaces with subtle separation
- Overlay token: Not explicitly evidenced; if needed, use translucent black for modals/tooltips with restraint

### Theme Modes

The branding evidence explicitly indicates a light color scheme. No dark mode evidence is present.

#### Light Mode

- Background: #FFFFFF
- Surface: #FFFFFF
- Text: #000000
- Accent: #4671FA / #527AFF
- Notes: Strong contrast, minimal neutrals, and blue-led interaction styling

#### Dark Mode

- Background: Not evidenced
- Surface: Not evidenced
- Text: Not evidenced
- Accent: Not evidenced
- Notes: Do not assume dark mode support from the available evidence

### Shadows & Depth

- Border/ring treatment: Likely subtle and low-opacity, with more reliance on spacing than heavy shadow
- Card shadow stack: Minimal to moderate; product screenshots and cards appear clean rather than heavily elevated
- Focus treatment: Should be a visible blue focus ring or blue outline to match the brand accent

## 3. Typography Rules

### Font Family

- Primary: Inter
- Monospace: Not evidenced
- OpenType Features: Inter Display is used for display and paragraph stacks; Instrument Serif is used for headings

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Hero headline | Instrument Serif / Inter Display stack | 75px | Likely 400–700 | Tight, headline-led | Slightly tight | Used for the main promise, large and dramatic |
| Section heading | Instrument Serif | 30px | Likely 400–700 | Comfortable | Normal | Used for major section titles like Features and Pricing |
| Body | Inter | 23px | Regular | Spacious | Normal | Larger-than-average body copy for readability and premium feel |
| Label / Eyebrow | Inter Display | Inferred smaller utility size | Medium | Compact | Slightly widened possible | Used for short section labels like “Pain” and “Features” |
| Caption / Meta | Inter | Smaller than body, not evidenced | Regular/Medium | Compact | Normal | Used for pricing notes, support copy, and fine print |

### Principles

- Editorial hero type is paired with clean sans-serif body copy for contrast
- Headings are oversized relative to typical SaaS pages, creating a bold, premium feel
- Body text is intentionally large, supporting quick scanning and a confident tone

## 4. Component Stylings

### Buttons and Links

- Primary CTA: Blue-filled button using #4671FA or #2266FF, likely with white text and rounded corners
- Secondary CTA: Neutral or ghost-style button for “Learn more” and secondary actions
- Text links: Blue text using #527AFF, visually lightweight and direct
- Hover and active feel: Crisp, immediate, and functional; likely subtle darkening or underline on hover

### Cards and Containers

- Surface style: White cards and section blocks on a white background, relying on spacing and borders
- Radius: 8px base radius from branding data; likely used consistently across cards and buttons
- Border: Soft, subtle borders or hairline dividers
- Shadow or elevation: Low-key; depth comes more from layout than heavy shadow
- Internal spacing: Generous padding, especially around screenshots, feature descriptions, and pricing items

### Inputs and Interactive Controls

- Input treatment: Not directly evidenced; if used, should follow the clean white/blue system
- Focus behavior: Blue outline or ring aligned with the primary accent
- Selection states: Blue highlight and clean, high-contrast active state

### Navigation

- Structure: Simple top navigation with anchor links to Features, Pricing, Process, and Contact
- Background treatment: Likely transparent or white, blending into the page
- Link style: Minimal, text-based links with blue accent on interaction
- Sticky or scroll behavior: Not evidenced; if present, should remain unobtrusive

### Image Treatment

- Screenshot treatment: Rounded, clean screenshots presented as product evidence
- Photography or illustration style: Mostly UI/product imagery rather than lifestyle photography
- Border and radius treatment: Soft rounded corners and tidy framing around images

### Distinctive Components

- Repeated logo strip/social proof row
- Feature modules pairing short copy with product screenshots
- Pricing cards with checklist-style feature lists
- FAQ-style question list with short supporting answers

## 5. Layout Principles

### Spacing System

- Base unit: 10px
- Repeated spacing values: 10, 20, 30, 40, 50, and larger section gaps inferred from the page rhythm

### Grid & Container

- Grid logic: Single-column storytelling broken into stacked sections, with two-column content likely used in feature and pricing areas
- Max content width: Not explicitly evidenced; likely centered container with a moderate desktop width
- Section spacing: Large vertical spacing between major marketing sections

### Whitespace Philosophy

- Whitespace philosophy: Spacious and deliberate; supports premium positioning and clarity
- Alignment tendencies: Left-aligned text blocks with centered or balanced supporting imagery
- Content width behavior: Content stays readable and not overly wide, preserving scanability

### Border Radius Scale

- Micro: 8px base radius for controls and small UI elements
- Standard: 8px for cards and buttons
- Large: Inferred slightly larger radius for feature screenshots/cards where appropriate
- Pill: Not evidenced, but may be used for small badges or pill CTAs if needed

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | White surface on white background | Core page sections and text blocks |
| Ring | Subtle blue focus ring or light gray border | Inputs, buttons, selected states |
| Card | Soft border with minimal shadow | Feature cards, pricing cards, FAQ blocks |
| Focus | Clear blue outline/ring | Keyboard navigation and form focus |

### Depth Principles

- Surface hierarchy: Very shallow; hierarchy is established through typography, spacing, and color
- Shadow language: Minimal and restrained
- Blur, glass, or overlay behavior: Not evidenced
- When depth is used versus avoided: Depth appears only when necessary for cards and interactive controls; otherwise the interface stays flat

## 7. Do's and Don'ts

### Do

- Use large, confident headlines with generous spacing
- Keep the palette focused on white, black, and blue
- Use product screenshots and proof points to support claims

### Don't

- Don’t introduce colorful gradients or decorative neon effects
- Don’t overcrowd sections with dense copy or multiple competing accents
- Don’t use heavy shadows or complex glassmorphism

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
| --- | --- | --- |
| Mobile | < 768px | Stack sections vertically, reduce headline scale, keep CTAs full-width |
| Tablet | 768px–1024px | Use two-column layouts where possible, preserve generous spacing |
| Desktop | > 1024px | Full editorial layout with large hero type and multi-column feature sections |

### Touch Targets

- Buttons should be large enough for comfortable tapping, with ample padding around CTAs
- Link targets should remain clearly separated, especially in footer and navigation

### Collapsing Strategy

- Desktop behavior: Multi-column storytelling with large imagery and pricing comparison
- Tablet behavior: Maintain structure but collapse dense feature layouts into fewer columns
- Mobile behavior: Stack content into a single column, keep CTAs visible and easy to tap
- Breakpoint-driven component changes: Feature grids, pricing cards, and FAQ lists should collapse progressively
- Touch target and spacing adjustments: Increase vertical spacing between controls and use full-width buttons on mobile

## 9. Agent Prompt Guide

### Quick Color Reference

- Primary CTA: #4671FA
- Background: #FFFFFF
- Heading text: #000000
- Body text: #000000
- Border or ring: #E5E7EB
- Accent: #527AFF

### Quick Summary

Automly is a light, modern SaaS landing page for HR automation.
It uses a white background, black text, and vivid blue CTA/link colors.
Typography mixes Inter and Instrument Serif for a premium editorial-tech feel.
The layout is spacious, conversion-focused, and organized into clear marketing sections.
Product screenshots and repeated social proof strengthen trust.
Buttons are simple, rounded, and blue-forward.
Overall tone: confident, clean, and technically competent.

### Example Component Prompts

- Hero: “Create a spacious SaaS hero with a large serif headline, short supporting copy, two CTA buttons, and a product screenshot on a white background with blue accents.”
- Card: “Design a clean white feature card with a subtle border, rounded 8px corners, a bold title, short body text, and a product image.”
- Navigation: “Build a minimal top nav with text links only, white background, and blue hover states.”
- Button or badge: “Create a rounded blue primary button with white text and a subtle hover darkening effect.”

### Ready-to-Use Prompt

Design a clean, light-themed SaaS landing page for Automly using a white background, black typography, and blue action accents (#4671FA / #527AFF). Use Inter for body text and Instrument Serif for prominent headings. Keep spacing generous, corners rounded to 8px, shadows minimal, and components simple and conversion-focused with product screenshots, social proof, and clear CTA hierarchy.

### Iteration Guide

1. Preserve the white/black/blue palette and avoid introducing extra brand colors.
2. Keep typography large and editorial, especially for hero and section headings.
3. Maintain clean spacing and restrained depth so screenshots and CTAs remain the main focus.

## Optional Appendix: Interaction Patterns

- Scroll behavior: Likely smooth anchor-based navigation between sections
- Hover behavior: Subtle blue emphasis on links and buttons
- Click behavior: Direct and low-friction, optimized for conversion
- Animation tone: Minimal and understated, if any

## Optional Appendix: Content & Messaging Patterns

- Headline pattern: Outcome-driven claims paired with a technical or automation promise
- CTA language: Action-oriented verbs like “Launch,” “Start,” and “Book”
- Trust signal pattern: Company counts, hours saved, and simple proof metrics
- Voice and tone: Confident, efficient, and professional

## Optional Appendix: Observed Pages

- Homepage: Hero promise, pain points, feature blocks, process steps, results, pricing, FAQ, and footer links