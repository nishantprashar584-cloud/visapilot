# VisaPilot Visual System Specification

## Purpose

This document describes the UI architecture that is actually implemented in the repository today. It is intended to help engineering, design QA, and product review evaluate the current product without relying on the older single-lane landing-page and vault assumptions.

## Scope

The current implementation spans four user-facing surfaces:

1. Landing page at `app/page.tsx`
2. Dedicated pricing page at `app/pricing/page.tsx`
3. Five-step application wizard at `app/apply/page.tsx`
4. Per-application vault at `app/dashboard/[applicationId]/vault/page.tsx`

The vault route is the canonical user-facing path. `app/dashboard/[applicationId]/page.tsx` currently contains the shared implementation and `app/dashboard/[applicationId]/vault/page.tsx` re-exports it.

## Product Model Implemented

VisaPilot is no longer a single automated lane.

Two service tracks are implemented across pricing, checkout, preview mode, the dashboard, and the vault:

1. `Self-Guided`
2. `Done-For-You`

Three pricing tiers are implemented for both tracks:

1. Solo
2. Couple
3. Family

## Design Principles

1. Status first, actions second, supporting detail third.
2. Dark surfaces use spacing, soft borders, and tinted badges instead of flat monochrome blocks.
3. Human-readable labels are preferred over internal product jargon.
4. Trust and compliance copy should reduce anxiety without overpowering primary actions.
5. Preview mode should feel like a real walkthrough, not a disconnected demo shell.

## Shared Terminology

Applicant-facing terminology implemented today:

1. `Self-Guided` replaces the old DIY track naming.
2. `Done-For-You` replaces the old VIP naming.
3. `Smart Form Helper` replaces the old submission-helper wording.
4. `Print-Ready Visa Packet` replaces the old bundle naming.
5. `AI Document Scanner` replaces the old OCR wording on public surfaces.
6. `My Visa Dashboard` is the current vault header label.
7. `My To-Do List` and `Visa progress` are used for post-generation workflow framing.

## Iconography Standard

Use Lucide icons only. Important actions and information categories continue to rely on rounded tinted badges.

### Semantic Badge Mapping

1. Official PDF actions
Recommended icons: `FileText`
Typical usage: filled form or worksheet download

2. Packet and archive exports
Recommended icons: `Archive`, `FileArchive`
Typical usage: print-ready packet and ZIP package actions

3. AI narrative and generation surfaces
Recommended icons: `Sparkles`
Typical usage: cover-letter generation and AI writing support

4. Security, retention, and identity binding
Recommended icons: `ShieldCheck`, `Lock`
Typical usage: privacy, identity lock, retention, and encrypted-processing copy

5. Financial and profile audit state
Recommended icons: `AlertTriangle`, `ShieldCheck`
Typical usage: risk status, funds checks, and audit summaries

6. Tracking and external linking
Recommended icons: `Link2`
Typical usage: VFS, TLS, and BLS tracking launch actions

## Clickability Matrix

### Must Be Clickable

1. Route navigation links such as `/apply`, `/dashboard`, `/pricing`, and `/auth`
2. Pricing-plan CTAs
3. Download buttons for the print-ready packet, ZIP package, worksheet or filled PDF, checklist PDF, and cover-letter PDF
4. Smart Form Helper launch actions
5. Tracking portal launch actions
6. Tracking-reference save actions in live mode
7. Done-For-You remediation actions such as OTP submission and replacement upload

### Must Be Non-Clickable

1. Application metadata pills for application ID, destination, and service track
2. Privacy countdown badges
3. Status badges and audit summary indicators
4. Read-only identity lock fields
5. Packet snapshot summary cells and financial audit summary cells

## Route Specification

## Landing Page

Path: `app/page.tsx`

### Section 1: Hero Shell

Purpose: establish trust, privacy framing, and the primary call to action immediately.

Implemented structure:

1. Security badge using `TintedIconBadge`
2. Secondary proof badge with factual market-positioning copy
3. Main headline
4. One-sentence subhead
5. Destination selector embedded inside the hero shell
6. Two CTAs
7. Three supporting trust cards under the CTAs

Current implemented text:

1. Security badge: `Zero-Retention Architecture • 256-Bit Encrypted`
2. Proof badge: `Built for India-first Schengen tourist visa preparation`
3. Headline: `The Automated Schengen Tourist Visa Engine`
4. Subhead: `Prepare a structured Schengen tourist visa packet with form prep, financial review, and multi-city itinerary sync in minutes.`
5. Primary CTA: `Start Application` -> `/apply`
6. Secondary CTA: `View Pricing` -> `/pricing`

### Section 2: Destination Selector

Component: `components/MarqueePills.tsx`

Purpose: establish destination context before the user enters the wizard.

Implemented behavior:

1. Six curated destinations render in a 2x3 responsive grid.
2. Each destination stores the selection and routes into the wizard.
3. `Other Schengen Country...` opens a searchable modal for the remaining countries.
4. The selector is static and non-animated.

Current curated set:

1. `France`
2. `Switzerland`
3. `Germany`
4. `Italy`
5. `Spain`
6. `Netherlands`
7. `Other Schengen Country...`

### Section 3: Three-Phase Explanation

Purpose: explain the product in one scan.

Implemented cards:

1. `Scan Passport`
Description: `Our AI document scanner reads your identity details without retaining files.`

2. `Audit & Generate`
Description: `Real-time bank sufficiency audit plus an AI consular cover letter.`

3. `Download & Apply`
Description: `One-click download of your ready-to-submit embassy package.`

### Section 4: Embedded Pricing Teaser

Purpose: preview the commercial model from the landing page while delegating the full selector experience to the dedicated pricing route.

Implemented behavior:

1. The landing page includes the same `PricingPlans` component used on `/pricing`.
2. The section headline is `Choose your visa plan.`
3. The helper line references both `Self-Guided` and `Done-For-You`.

## Dedicated Pricing Page

Path: `app/pricing/page.tsx`

Purpose: present the full two-track pricing system with trust and anxiety-reduction copy.

### Pricing Header

Implemented copy:

1. Eyebrow: `Pricing`
2. Heading: `Choose your visa plan.`
3. Helper text: `Compare the Self-Guided and Done-For-You options, see the full GST-inclusive price, and pick the plan that fits your trip.`

### Pricing Toggle and Banner

Implemented behavior:

1. A trust banner appears above the selector.
2. The selector is a two-column grid, not a pill carousel.
3. The active option is emphasized through fill, contrast, and shadow.
4. Subtitle copy changes by selected track.

Current banner text:

1. `Built around current Schengen tourist form structure and provider checklist guidance.`

Current selector labels:

1. `Self-Guided`
2. `Done-For-You`

Current dynamic subtitles:

1. Self-Guided: `We give you the smart tools and print-ready files. You fill the forms and book the slot.`
2. Done-For-You: `Our human experts verify your documents, fill the official forms, and book your VFS slot.`

### Pricing Cards

Implemented behavior:

1. Three cards render per selected track.
2. The couple card is visually highlighted.
3. The main amount is shown in INR.
4. GST is shown as a subtle italic line directly below the main price.
5. Feature bullets emphasize the first phrase with stronger weight and accent color.
6. Done-For-You cards add expert-review trust content.

Implemented tier prices:

1. Solo `₹1,999` or `₹5,999` depending on track
2. Couple `₹3,299` or `₹9,999` depending on track
3. Family `₹5,599` or `₹14,999` depending on track

Implemented CTA behavior:

1. Each card links to `/apply?track=<TRACK>&tier=<TIER>`
2. CTA label is `Choose <Tier>`

Done-For-You reassurance implemented today:

1. In-house expert avatars
2. Final review reassurance
3. Turnaround SLA copy
4. Managed-submission language

## Application Wizard

Path: `app/apply/page.tsx`

Purpose: collect applicant data across five structured stages and transition into the vault.

Implemented steps:

1. Identity
2. Travel
3. Financials
4. Accommodations
5. Document Studio

### Wizard-Level Trust Copy

Implemented trust surfaces include:

1. Identity upload shield text: `DPDP Compliant: Bank-grade encryption. Files automatically delete 30 days after your appointment.`
2. Financial upload shield text with the same 30-day deletion language
3. Bank-statement upload CTA with mandatory bank-seal reassurance
4. Submit-time package-generation checklist during finalization

### Step 5 Document Studio

Purpose: keep the packet preview, writing tools, and PDF utilities in one shell before vault handoff.

Implemented tabs:

1. `Print-Ready Visa Packet`
2. `AI Cover Letter Studio`
3. `Advanced PDF Editor`
4. `VFS Checklist & Stacking Order`
5. `Interview Prep & Recovery`

Implemented bundle behavior:

1. Primary CTA: `Finalize & Go to My Visa Dashboard`
2. Secondary actions for packet download and full interactive viewer
3. Rotating finalization checklist including travel-date, passport, booking-name, and VFS-format checks

## Dashboard

Path: `app/dashboard/page.tsx`

Purpose: show recent applications, payment purchase UI, payment history, and next actions at the account level.

Implemented sections:

1. Top summary shell with account or preview context
2. Razorpay purchase card in live mode
3. Recent payment captures in live mode
4. Preview checklist in preview mode
5. Recent application package rows

The purchase card now mirrors the two-track model and includes the same service-track terminology as the public pricing page.

## Application Vault

Path: `app/dashboard/[applicationId]/vault/page.tsx`

### Overall Purpose

This route behaves as `My Visa Dashboard`, not as the older download-only vault concept. It combines packet download, progress framing, helper actions, tracking, and remediation signals.

### Header Status Bar

Implemented elements:

1. Emerald pulse indicator
2. Eyebrow: `My Visa Dashboard`
3. Applicant name heading
4. Static pills for application ID, destination, and service track
5. Static privacy countdown badge
6. Status badge and audit badge
7. Back link to Document Studio in preview mode or Applications in live mode

### Preview Walkthrough Banner

Preview mode adds a standalone banner explaining that Step 5 finalization leads into the dashboard and that downloads remain available from the vault.

### Visa Progress

Component: `components/dashboard/StatusPipeline.tsx`

Implemented behavior:

1. Eyebrow: `Visa progress`
2. Heading: `Track what happens next`
3. One-line progress summary derived from the application status
4. Four progress cards: Audit Complete, Official Submission, Appointment Booking, Ready for VFS

### Action Center

Component: `components/dashboard/VaultActionCenter.tsx`

Implemented states:

1. `action_required`: replacement upload lane
2. `otp_pending`: OTP entry lane with countdown
3. `bundle_ready` on Self-Guided: Smart Form Helper launch lane
4. Managed Done-For-You lane: operator handoff summary, center, appointment, and mock-interview CTA

Current user-facing labels:

1. `Smart Form Helper ready`
2. `My to-do list`

### Primary Packet Actions

Implemented standalone top cards:

1. `Print-Ready Visa Packet`
2. `Smart Form Helper`

These cards exist above the larger toolkit grid so the most common next actions are visible first.

### Main Toolkit Grid

Implemented toolkit sections:

1. Official form or worksheet card
2. Cover-letter preview and download card
3. Submission checklist PDF card
4. Packet snapshot summary card
5. Large print-ready packet card with PDF and ZIP actions
6. Supporting documents vault
7. Interview rehearsal panel
8. Refusal decoder panel
9. Tracking reference and deep-link card
10. Rejection insurance card
11. Identity lock vault
12. Financial and profile audit card

### Live vs Preview Rules

1. Preview mode keeps tracking-reference persistence static.
2. Preview mode still allows packet-oriented walkthrough downloads.
3. Live mode enables tracking-reference save actions and uses the authenticated application record.

## Component Responsibilities

### `components/MarqueePills.tsx`

Current responsibility: render the destination selector and searchable fallback modal.

### `components/pricing/PricingPlans.tsx`

Current responsibility: render the two-track pricing selector, dynamic subtitle, plan cards, tax line, and Done-For-You trust block.

### `components/dashboard/StatusPipeline.tsx`

Current responsibility: map application status into the four-stage visa progress UI.

### `components/dashboard/VaultActionCenter.tsx`

Current responsibility: render status-dependent next actions for Self-Guided and Done-For-You applications.

### `components/ui/TintedIconBadge.tsx`

Current responsibility: provide the shared rounded badge treatment used across marketing, wizard, dashboard, and vault surfaces.

## Content Strategy

1. Prefer plain-English product labels over internal operational language.
2. Keep trust copy short, explicit, and adjacent to the action it supports.
3. Use `Print-Ready Visa Packet`, `Smart Form Helper`, `Visa progress`, and `My Visa Dashboard` as the stable public nouns.
4. Keep preview-mode explanations visible where route behavior differs from live mode.
5. Avoid wording that makes static metadata look interactive.

## Responsive Behavior

1. Landing page hero content remains centered.
2. Destination tiles collapse into a two-column grid on narrow viewports.
3. Pricing cards collapse below desktop breakpoints.
4. Vault metadata pills wrap cleanly.
5. Large packet and toolkit cards stack vertically on smaller screens.
6. Step 5 tab navigation remains horizontally scrollable when space is tight.

## Accessibility Requirements

1. All route and download actions remain keyboard reachable.
2. Static pills and badges must not masquerade as buttons.
3. Selected track state on pricing selectors must be obvious without relying only on color.
4. Inline cover-letter preview text remains selectable.
5. Upload, tracking, and OTP inputs remain labeled in the action center and wizard.

## QA Acceptance Checklist

1. Landing page hero shows the current headline, current subhead, destination selector, and `/pricing` secondary CTA.
2. The destination selector is static and opens a searchable modal for non-featured countries.
3. Pricing shows `Self-Guided` and `Done-For-You` with a visible selected state.
4. Pricing shows the guideline trust banner above the track selector.
5. Pricing shows GST as a subtle italic line directly under the main price.
6. Done-For-You pricing shows expert-review reassurance and SLA copy.
7. Wizard upload cards show the current DPDP-compliant trust text and 30-day deletion message.
8. Step 5 finalization routes into `My Visa Dashboard`.
9. Vault top sections include `Visa progress`, the action center, `Print-Ready Visa Packet`, and `Smart Form Helper`.
10. Tracking save actions remain disabled in preview mode and active in live mode.

## Known External Dependencies

1. Filled-form behavior depends on template support and the worksheet fallback path in `public/templates`.
2. ZIP and packet routes depend on protected supporting-document access and stored packet artifacts.
3. Tracking-reference persistence depends on authenticated Supabase-backed application ownership.
4. Razorpay checkout and verification remain external dependencies for live purchase flows.

## Suggested Next Extensions

1. Bring the same selected-state clarity from `/pricing` into the dashboard purchase card.
2. Add visual regression snapshots for the landing page, pricing page, wizard Step 3, wizard Step 5, and the application vault.
3. Resolve the current dev-only `.next-dev` vendor-chunk instability separately from product UI work.