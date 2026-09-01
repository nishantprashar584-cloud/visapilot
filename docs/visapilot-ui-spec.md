# VisaPilot Visual System Specification

## Purpose

This document defines the current intended UI architecture for VisaPilot across the public landing page and the application detail vault experience. It is written as a delivery spec for engineering, design QA, and product review so the interface can be rebuilt consistently without regressing interaction clarity, compliance framing, or visual quality.

## Goals

1. Remove stock-looking clutter and replace it with structured, product-grade information design.
2. Keep static information visually distinct from actions so the user never mistakes status metadata for clickable controls.
3. Standardize icon treatment across routes with soft-tinted circular badges and consistent semantic color usage.
4. Preserve existing business logic and route behavior while re-architecting visual hierarchy.
5. Keep the interface mobile-safe, dense without feeling crowded, and legible in the app's dark visual language.

## Non-Goals

1. This spec does not redefine the wizard step fields or validation logic.
2. This spec does not replace the existing audit engine, identity-locking logic, or Stripe flow.
3. This spec does not specify a new design token system beyond what is needed for route-level consistency.

## Design Principles

1. Every surface should answer one clear user question.
2. Status first, actions second, supporting detail third.
3. Visual contrast should come from spacing, borders, and tinted accents more than from large gradients or decorative media.
4. Icons should support scanning, not act as decoration.
5. Hero marketing content should stay compact and conversion-oriented.

## Iconography Standard

Use Lucide icons only. Every important action or information category should use a rounded tinted badge.

### Semantic Badge Mapping

1. Official PDF actions
Color treatment: `text-red-600 bg-red-50 dark:bg-red-950/40`
Recommended icons: `FileText`

2. ZIP archive packages
Color treatment: `text-blue-600 bg-blue-50 dark:bg-blue-950/40`
Recommended icons: `Archive` or `FileArchive`

3. AI cover-letter engine
Color treatment: `text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40`
Recommended icons: `Sparkles`

4. Security and purge
Color treatment: `text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40`
Recommended icons: `ShieldCheck`, `Lock`

5. Financial audit rules
Color treatment: `text-amber-600 bg-amber-50 dark:bg-amber-950/40`
Recommended icons: `AlertTriangle` or `ShieldCheck`

6. Tracking and external linking
Color treatment: `text-slate-700 bg-slate-100 dark:bg-slate-900 dark:text-slate-300`
Recommended icons: `Link2`

## Clickability Matrix

This interaction rule is mandatory.

### Must Be Clickable

1. Route navigation links such as `/apply`, `/dashboard`, `/auth`
2. Download buttons for filled PDFs, full ZIP packets, and cover-letter PDFs
3. Tracking portal launch actions
4. Copy-oriented tracking actions embedded in portal buttons
5. Recovery triggers for refused applications
6. Pricing selection CTAs

### Must Be Non-Clickable

1. Applicant identity metadata once locked
2. Passport number display inside the identity vault
3. Privacy countdown labels
4. Audit status badges and summary indicators
5. Application metadata labels such as destination and application ID when rendered as status pills

## Route Specification

## Landing Page

Path: `app/page.tsx`

### Section 1: Country and Flag Bar

Purpose: Establish jurisdiction focus immediately with a static, high-clarity destination selector.

Requirements:

1. Display the top 6 Schengen hubs only: France, Switzerland, Germany, Italy, Spain, Netherlands.
2. Use static wrapped pills or a compact 2x3 grid with actual flag treatments.
3. Each destination tile is clickable and routes into the onboarding flow with that destination pre-selected.
4. No marquee animation and no scrolling ticker behavior.
5. Preserve clean wrapping on mobile without horizontal overflow bugs.

Exact content set:

1. `France`
2. `Switzerland`
3. `Germany`
4. `Italy`
5. `Spain`
6. `Netherlands`

### Section 2: Hero

Purpose: Convert quickly with trust, privacy positioning, and one primary next step.

Required structure:

1. Non-clickable emerald security badge.
2. Primary headline.
3. One-sentence subhead.
4. Two CTAs.
5. Optional compact supporting feature strip, but not large image cards or stock photography.

Exact text:

1. Badge: `Zero-Retention Architecture • 256-Bit Encrypted`
2. Headline: `Schengen Visa Applications, Automated & Privacy-First`
3. Subhead: `Generate official auto-filled PDFs, consular cover letters, and daily financial audit checks in 5 minutes.`

CTA rules:

1. Primary CTA label: `Start Application`
Destination: `/apply`
2. Secondary CTA label: `View Pricing`
Destination: `#pricing`

### Section 3: Three-Step Process

Purpose: Explain the product in one scan.

Layout:

1. Three-card horizontal grid on desktop.
2. Single-column stack on mobile.
3. Each card includes a tinted icon badge, step number, short title, and one-sentence explanation.

Exact content:

1. `Step 1: Scan Passport`
Badge tone: red
Description: `Ephemeral RAM OCR extracts identity without retaining files.`

2. `Step 2: Audit & Generate`
Badge tone: indigo
Description: `Real-time bank sufficiency audit + AI consular cover letter.`

3. `Step 3: Download & Apply`
Badge tone: blue
Description: `One-click download of your ready-to-submit embassy package.`

### Section 4: Pricing Grid

Purpose: Present the commercial model with zero ambiguity.

Layout:

1. Three cards.
2. Couple card visually highlighted.
3. One CTA per card.

Required copy:

1. Solo `₹1,999`
Details: `1 Applicant • India-first OCR and cover letter • GST invoice included.`

2. Couple `₹3,299`
Details: `2 Adults • Shared itinerary • Cross-referenced co-traveler narratives.`

3. Family `₹5,599`
Details: `Up to 4 Applicants • Minor-safe document rules • Shared family bundle.`

CTA label for all cards: `Select Pass`

Routes:

1. `/apply?tier=solo`
2. `/apply?tier=couple`
3. `/apply?tier=family`

Launch constraints:

1. Phase 1 targets Indian applicants only.
2. Pricing is displayed in INR.
3. Checkout and packet generation remain fully automated with no human review lane.
4. Avoid community chat, appointment-booking bots, multi-language launch work, full flight purchasing, and gamified progress systems.

## Application Detail Page

Path: `app/dashboard/[applicationId]/page.tsx`

### Overall Purpose

This route should behave like a structured vault, not a general dashboard. Every section should either present immutable package state or provide a clear, discrete action.

### Header Status Bar

Purpose: Provide non-clickable application status context at the top of the page.

Required elements:

1. Emerald pulse indicator.
2. `Document Toolkit & Download Vault` eyebrow.
3. Applicant name heading.
4. Static metadata pills for application ID and destination.
5. Static privacy countdown badge.
6. Static status badge and static audit badge.
7. Preview-only builder link when preview mode is active.

Interaction rules:

1. Metadata pills are not buttons.
2. Countdown remains non-clickable.
3. Status and audit indicators remain non-clickable.

### Card 1: Official Form PDF

Purpose: Isolate the core embassy form action.

Elements:

1. Red tinted PDF badge.
2. Title: `Schengen Application Form`
3. Description indicating the form is filled and flattened.
4. One primary button: `Download Filled PDF`

Behavior:

1. Live mode button downloads from the PDF route.
2. Preview mode shows a non-clickable placeholder state.

### Card 2: AI Cover Letter

Purpose: Separate the narrative artifact from the PDF package.

Elements:

1. Indigo AI badge.
2. Title: `Consular Cover Letter`
3. Inline preview area.
4. Action buttons: `View Letter` and `Download PDF`

Behavior:

1. `View Letter` scrolls to or focuses the inline preview block.
2. `Download PDF` downloads a generated PDF rendition of the letter.

### Card 3: Full Packet Archive

Purpose: Present the complete packet export as the primary submission artifact.

Elements:

1. Blue ZIP badge.
2. Title: `Complete Embassy Submission ZIP`
3. Description of included files.
4. Hero action button: `Download Full Package (.zip)`

Included contents definition:

1. Filled Schengen PDF
2. AI cover letter
3. Personalized checklist
4. Insurance verification slip
5. Saved supporting documents

### Card 4: Tracking Reference

Purpose: Keep post-submission tracking separated from document download.

Elements:

1. Slate link badge.
2. Title describing VFS, TLS, and BLS tracking.
3. External link buttons.
4. Reference input and save flow in live mode.

Behavior:

1. Portal action remains clickable.
2. Save action remains clickable only in live mode.
3. Preview mode shows static explanatory state.

### Card 5: Identity Lock Vault

Purpose: Make identity binding visible and unmistakably read-only.

Elements:

1. Emerald lock badge.
2. Read-only full name field.
3. Read-only passport number field.
4. Short explanatory text about binding.

Interaction rule:

1. No action buttons inside this card.

### Card 6: Financial Audit Rules

Purpose: Keep financial and passport compliance visible without turning the vault into a workflow editor.

Elements:

1. Amber audit badge.
2. Static funds summary.
3. Static passport validity summary.
4. Static audit status reference.

Interaction rule:

1. Entire card is informational only.

### Supporting Documents Vault

Purpose: Preserve visibility of uploaded attachments after the main toolkit grid.

Requirements:

1. Keep as a separate lower section.
2. Open-document buttons remain clickable in live mode.
3. Preview state remains non-clickable.
4. Presentation should remain subordinate to the main five-card toolkit.

## Component Responsibilities

### `components/MarqueePills.tsx`

Current responsibility: render the static country-and-flag bar.

Rules:

1. No secondary feature ticker.
2. No motion-heavy marquee behavior.
3. Must support horizontal overflow on small screens.

### `components/ui/TintedIconBadge.tsx`

Responsibility: shared icon badge system.

Rules:

1. Supports semantic tone variants.
2. Can render icon-only or icon-plus-label.
3. Must preserve readable contrast in dark surfaces.

## Content Strategy

1. Avoid long explanatory paragraphs on the landing page.
2. Use sentence-case labels in cards and controls.
3. Use high-signal nouns: `PDF`, `ZIP`, `Cover Letter`, `Tracking`, `Identity Lock`.
4. Avoid developer-facing wording such as internal model names on public routes.
5. Keep private-processing language precise and restrained.

## Responsive Behavior

1. Landing hero content remains centered on mobile.
2. Pricing and steps collapse to a single column below desktop breakpoints.
3. Header metadata wraps cleanly into multiple lines without truncating labels.
4. Download buttons stack vertically on narrow viewports.
5. Cover letter preview preserves readable line-height and does not cause horizontal scroll.

## Accessibility Requirements

1. All clickable items must remain keyboard reachable.
2. Non-clickable badges must not masquerade as buttons.
3. Icon-only affordances should include text or nearby labels.
4. Color must not be the only indicator of meaning; label text must carry the role.
5. Long preview text should remain selectable.

## QA Acceptance Checklist

1. Landing page contains no stock photography, no animated pill marquees, and no extra vault/security card sections beyond the streamlined structure.
2. The country bar is visible and horizontally scrollable on mobile.
3. Hero contains exactly two CTAs with the requested destinations.
4. All process and pricing cards use tinted icon badges consistent with semantic colors.
5. Dashboard detail page clearly separates static metadata from action buttons.
6. Cover letter has a real download action, not a placeholder button.
7. Privacy countdown, audit badge, and identity fields are visually static.
8. Tracking links and save interactions remain functional in live mode.
9. Supporting document list remains accessible beneath the main toolkit cards.
10. Dark-theme contrast stays readable for all labels, helper text, and card boundaries.

## Known External Dependencies

1. The filled PDF action depends on the official template PDFs being present in `public/templates`.
2. The full ZIP action depends on stored supporting documents being accessible in Supabase Storage.
3. Cover letter PDF generation depends on application ownership and stored cover-letter content.

## Suggested Next Extensions

1. Apply the same tinted icon-badge system to `/dashboard` list rows and `/apply` step summaries.
2. Replace remaining generic button gradients in client components with the structured neutral-plus-accent treatment defined here.
3. Add visual regression snapshots for the landing page and application vault page.