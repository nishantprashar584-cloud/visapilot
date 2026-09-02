# VisaPilot Current-State Specification

## Scope

This document describes the checked-in implementation state of VisaPilot after the current production-readiness pass. It reflects the code, migrations, tests, and route behavior present in this repository today.

## Product Scope Implemented Today

- VisaPilot is a Next.js application for automated Schengen tourist visa packet preparation.
- The active workflow is tourism-only and the generation helpers normalize legacy purpose variants back to tourism.
- The user journey is a five-step application wizard followed by a dashboard and a per-application vault.
- Preview mode is implemented across the product and uses seeded applications from `lib/mock/applications.ts`.
- Phase 1 pricing is INR-only with three implemented tiers: Solo `₹1,999`, Couple `₹3,299`, Family `₹5,599`.
- The codebase still contains non-India preview examples, but the live payment and commercial flow now target an India-first launch.

## Implemented Tech Stack

### Frontend

- Next.js `14.2.33` with the App Router
- React `18`
- TypeScript `5`
- Tailwind CSS `3.4.1`
- Lucide React icons
- React Hook Form with Zod validation

### Backend and Persistence

- Next.js route handlers under `app/api` and download routes under `app/dashboard/*/route.ts`
- Supabase for email OTP auth, Postgres persistence, RLS, and protected file storage
- Direct Supabase queries without an ORM

### AI and Document Processing

- OpenAI for passport OCR, bank-statement parsing, voice-context structuring, audio transcription, and cover-letter drafting
- `pdf-lib` for AcroForm fill, worksheet fallback generation, A4 text pagination, packet assembly, merge/split/reorder/rotate/sanitize operations, and invoice rendering
- `pdfjs-dist` for Organize PDF page thumbnails
- JSZip for full package archive downloads
- LibreOffice CLI for Word-to-PDF conversion
- Python plus `pdf2docx` for PDF-to-Word conversion

### Payments and Testing

- Razorpay orders, checkout verification, and webhook capture handling
- GST invoice generation and protected invoice storage
- Vitest for unit tests
- Playwright for end-to-end coverage

## Implemented Repository Surfaces

### Application Routes

- `app/page.tsx`: landing page
- `app/apply/page.tsx`: five-step wizard entry
- `app/auth/page.tsx`: Supabase email OTP sign-in screen
- `app/dashboard/page.tsx`: dashboard with recent applications and payment history
- `app/dashboard/[applicationId]/page.tsx`: application vault

### API Routes

- `app/api/application-package/route.ts`: application package creation and persistence
- `app/api/checkout/route.ts`: Razorpay order creation plus `payments` row insert
- `app/api/document-convert/route.ts`: Word/PDF conversion endpoint
- `app/api/generate-cover-letter/route.ts`: AI cover-letter and custom-letter generation
- `app/api/health/route.ts`: environment, database, and document-conversion health
- `app/api/identity-lock/route.ts`: applicant identity locking
- `app/api/parse-document/route.ts`: passport and bank-statement extraction
- `app/api/parse-voice-context/route.ts`: transcript or audio parsing into wizard context
- `app/api/payments/verify/route.ts`: client-side Razorpay signature verification and capture finalization
- `app/api/supporting-documents/route.ts`: supporting-document upload and delete flow
- `app/api/webhooks/razorpay/route.ts`: webhook-driven payment capture finalization
- `app/api/webhooks/stripe/route.ts`: decommissioned compatibility stub returning `410`
- `app/api/applications/[applicationId]/supporting-documents/[documentId]/route.ts`: protected document access
- `app/api/applications/[applicationId]/tracking-reference/route.ts`: tracking-reference persistence

### Download Routes

- `app/dashboard/[applicationId]/download/route.ts`: filled-form or worksheet download
- `app/dashboard/[applicationId]/package/route.ts`: ZIP archive download
- `app/dashboard/[applicationId]/consulate-ready-packet/route.ts`: stitched consulate-ready packet download
- `app/dashboard/[applicationId]/consulate-checklist/route.ts`: checklist PDF download
- `app/dashboard/[applicationId]/cover-letter/route.ts`: cover-letter PDF download
- `app/dashboard/[applicationId]/interview-simulator/route.ts`: interview-prep PDF download
- `app/dashboard/[applicationId]/refusal-decoder/route.ts`: refusal-recovery PDF download

## Authentication Model

- Supabase email OTP sign-in is the live authentication flow.
- Protected routes redirect to `/auth` unless preview mode is active.
- `app/auth/callback/route.ts` exchanges the OTP code for a session and redirects to the normalized `next` path.

## Database Schema Implemented Today

Schema is managed through SQL migrations under `supabase/migrations`.

### `applications`

Key columns present in migrations and route usage:

- `id uuid primary key`
- `status text`
- `user_id text not null`
- `applicant_id text not null`
- `vfs_reference_number text null`
- `applicant_name text not null`
- `applicant_email text not null`
- `destination_country text not null`
- `application_data jsonb not null`
- `cover_letter_markdown text not null`
- `filled_pdf_base64 text not null`
- `rejected_at timestamptz null`
- `refusal_reason_code smallint null`
- `recovery_status text not null`
- `recovery_claimed_at timestamptz null`
- `privacy_purge_at timestamptz not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Behavior encoded through migrations and helpers:

- `status` is constrained to the application lifecycle states used by the dashboard and recovery flow
- `recovery_status` is constrained to `NOT_CLAIMED | CLAIMED`
- `refusal_reason_code` follows Annex VI bounds when present
- `privacy_purge_at` drives retention cleanup logic

### `users`

- `id text primary key`
- `email text`
- `credits integer not null default 0`
- `created_at timestamptz`
- `updated_at timestamptz`

Purpose:

- tracks account credits
- supports identity-slot checks
- receives payment capture credit grants

### `applicants`

- `id text primary key`
- `user_id text not null`
- `full_name text not null`
- `passport_number text not null`
- `created_at timestamptz`
- `updated_at timestamptz`

Purpose:

- stores locked applicant identity records
- prevents name/passport drift after first package generation

### `payments`

Added in `202609010001_add_razorpay_payments.sql`.

Implemented fields:

- `id uuid primary key`
- `user_id text not null`
- `application_id uuid null`
- `provider text not null default 'razorpay'`
- `status text not null default 'created'`
- `pricing_tier text not null`
- `requested_credits integer not null`
- `gross_amount_inr numeric(10,2) not null`
- `taxable_amount_inr numeric(10,2) not null`
- `gst_amount_inr numeric(10,2) not null`
- `currency text not null default 'INR'`
- `provider_order_id text not null unique`
- `provider_payment_id text unique`
- `provider_signature text`
- `receipt_number text not null unique`
- `invoice_number text unique`
- `invoice_storage_path text`
- `invoice_issued_at timestamptz`
- `customer_name text`
- `customer_email text`
- `destination_country text`
- `notes jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Implemented statuses:

- `created`
- `verified`
- `captured`
- `failed`

### `audit_logs`

- `id uuid primary key`
- `event_type text not null`
- `actor_user_id text null`
- `entity_type text not null`
- `entity_id text null`
- `payload jsonb not null`
- `created_at timestamptz`

Purpose:

- payment capture audit trail
- recovery and lifecycle audit trail

### `api_rate_limits`

- composite primary key on `scope, identifier`
- DB-backed count and reset tracking for AI routes

### Implemented RPC Functions

- `grant_application_credits(...)`
- `claim_reapplication_recovery_credit(...)`
- `consume_api_rate_limit(...)`
- `purge_expired_private_data()`
- `purge_expired_applications()`
- `capture_payment_and_grant_credits(...)`

## Row-Level Security and Storage

### RLS

- RLS is enabled on `applications`, `users`, `applicants`, `payments`, `audit_logs`, and `api_rate_limits`.
- Authenticated users can read their own payment rows through the `payments_select_own` policy.
- Application and applicant ownership policies remain enforced through `auth.uid()` checks.
- `audit_logs` remains a service-role surface.

### Storage

The clearly provisioned bucket in the scanned migrations is:

- `visapilot-supporting-documents`

Current usage of that bucket:

- supporting document uploads
- protected supporting-document downloads
- GST invoice PDF storage under `userId/system/invoices/...`

Current repo-level gap:

- cleanup logic still references buckets named `passport-scans` and `generated-packets`, but matching bucket-creation statements were not confirmed in the migrations reviewed here

## Canonical Types and Data Shape

The primary source of truth is `types/index.ts` plus the Zod schema in `lib/applications/schema.ts`.

### `ApplicantInfo`

Top-level sections:

- `personal`
- `contact`
- `passport`
- `employment`
- `trip`
- `sponsor`
- `homeTies`
- `application`
- `financialEvidence`
- `supportingDocuments`

Domain behaviors encoded in schema/helpers:

- stay duration recalculation from arrival and departure dates
- purpose normalization back to tourism
- destination normalization around the primary destination
- conditional previous-visa and VIS fingerprint validation
- cross-validation between passport and trip dates

### Payment Types

`types/index.ts` now defines:

- `PaymentGateway`
- `PaymentStatus`
- `PaymentRow`

These are used by the dashboard, payment routes, and Razorpay finalization helpers.

## State Management Implemented Today

There is still no global client-state library. State is managed through React Hook Form, local component state, local storage, and a narrow event-bus pattern.

### Wizard State

`components/wizard/ApplicationWizard.tsx` owns the main application draft.

Implemented mechanisms:

- `useForm<ApplicantInfo>` with Zod resolver
- `useWatch` for derived signals
- local `useState` slices for UI and async actions
- `localStorage` persistence under `visapilot.applicationDraft`
- custom-letter persistence under `visapilot.customLettersDraft`

Observed derived effects include:

- destination prefill from query string or stored context
- stay duration recalculation
- sponsor-type mapping from funding source
- previous-visa summary generation
- VIS fingerprint synchronization
- debounced draft persistence
- first-entry cover-letter bootstrap when empty

### Step 5 State

`components/wizard/Step5Workspace.tsx` owns:

- active Step 5 tab
- bundle preview scale and active preview page
- cover-letter draft and custom-letter interactions
- speech-dictation state for title, prompt, and content fields
- itinerary synchronization badges
- shared A4 preview layout state

`TravelIntentStudio` publishes itinerary updates through `lib/applications/moduleSyncBus.ts`, and `Step5Workspace` subscribes to apply synced cover-letter changes.

### PDF Workspace State

`components/wizard/PacketWorkspace.tsx` still owns the tool-level operational state, including:

- selected tool
- active tool stage: `select | upload | workspace`
- uploaded workspace documents
- preview document/output IDs
- PDF and Word tool selections
- split ranges, rotation state, progress messages, and export state
- reorder board items, thumbnails, drag state, and insert slots

Persistence behavior:

- tool flows marked for persistence upload through `/api/supporting-documents` outside preview mode
- reorder state is mirrored back through `syncSavedSupportingOrder(...)`
- switching to a different PDF tool clears the in-memory workspace session so uploads, previews, and exports do not bleed across tools

## User Workflow Implemented Today

### 1. Sign-In

- Users sign in with email OTP through Supabase.

### 2. Wizard

The main flow remains:

1. Identity
2. Travel
3. Financials
4. Accommodations
5. Document Studio

Implemented step behavior:

1. Identity: manual entry or passport OCR extraction, plus live identity locking before leaving the step in non-preview mode.
2. Travel: tourism-focused itinerary capture, previous Schengen visa capture for Item 26, VIS fingerprint capture for Item 27, and stay-duration normalization.
3. Financials: optional statement extraction, live risk audit, exact statutory-funds gating, and anomaly-aware interview-prep generation.
4. Accommodations: hotel reference, place of application, accommodation summary, and home-ties evidence.
5. Document Studio: tabbed Step 5 workspace with bundle preview, AI letters, PDF operations, checklist/stacking guidance, and prep/recovery artifacts.

### 3. Package Generation

On submit:

- the wizard posts to `/api/application-package`
- the applicant payload is normalized
- a cover letter is generated if missing
- the filled form or worksheet PDF is generated
- the user row is upserted
- the applicant identity is locked
- the application row is inserted into `applications`
- the app redirects to `/dashboard/[applicationId]`

### 4. Dashboard and Vault

The dashboard exposes:

- recent application cards
- risk snapshot and privacy countdown
- quick links into the packet vault
- payment purchase UI through Razorpay
- recent payment capture status with invoice-storage state

The application vault exposes:

- filled form or worksheet download
- cover-letter preview and download
- ZIP package download
- consulate-ready packet download
- supporting-document access
- tracking-reference save flow
- interview-prep and refusal-recovery artifacts

## Step 5 Document Studio: Current Implemented State

### Tab Layout

The Step 5 workspace is now a tabbed single-surface shell with extracted presentation components:

- `components/wizard/step5/Step5TabBar.tsx`
- `components/wizard/step5/BundleTabPanel.tsx`
- `components/wizard/step5/ChecklistTabPanel.tsx`
- `components/wizard/step5/PrepTabPanel.tsx`

Implemented tabs:

- Master Bundle
- AI Cover Letter Studio
- Advanced PDF Editor
- VFS Checklist & Stacking Order
- Interview Prep & Recovery

The tab strip is horizontally scrollable on small viewports and only one panel renders at a time.

### Master Bundle

Implemented behavior:

- packet-readiness summary cards
- bundle download/view actions
- sectioned preview experience
- exact A4 cover-letter preview pages via `A4TextPreview`
- zoom controls

Important current-state limitation:

- this is still a structured preview surface, not a literal full-packet renderer that reproduces every final divider page and supporting-document page on screen

### AI Cover Letter Studio

Implemented behavior:

- main cover-letter draft editing
- AI generate/regenerate flow
- DOC download
- PDF download generated through the same A4 layout engine used for preview
- speech dictation for the main draft and custom letters
- additional AI letters with title, prompt, content, generation, and downloads
- itinerary sync summary badges for transit and accommodation gaps

### Advanced PDF Editor

Tools exposed in the UI:

- Merge PDF
- JPG to PDF
- Split PDF
- Compress PDF
- Organize PDF
- Rotate PDF
- Sanitize PDF
- Word to PDF

Tool still present in code but hidden from the Step 5 tool list:

- `pdfToWord`

### Organize PDF

The Organize PDF flow has been materially upgraded:

- page thumbnails are rendered with `pdfjs-dist` instead of `iframe` tiles
- the board UI is extracted into `components/wizard/pdf/ReorderBoard.tsx`
- drag reorder remains supported
- touch reorder is implemented through pointer-location drop targeting
- keyboard support is implemented with grab/release, arrow-key moves, Enter drop, and Delete/Backspace removal
- exact insert slots are rendered between items and at the tail
- rotation, delete, and export actions work directly from the board

### Checklist and Stacking Guidance

The checklist layer now resolves provider-aware physical packet guidance from `config/consulate-details.ts`.

Explicit stack blueprints are implemented for:

- Spain via BLS International
- France via VFS Global and TLScontact
- Germany via VFS Global
- Italy via VFS Global and TLScontact
- Switzerland via VFS Global
- Netherlands via VFS Global and TLScontact

Fallback behavior still exists for unmapped destinations through a default VFS-style stack.

### Interview Prep and Recovery

Implemented behavior:

- interview preparation prompts driven by the risk audit
- refusal decoder and reapplication support surfaces

## PDF Rendering and Generation Engine

### Form Strategy Resolution

`lib/pdf/formStrategy.ts` decides the PDF-generation path.

Observed behavior:

- native form maps exist for supported templates such as France, Spain, and Germany
- template files are checked from disk
- AcroForm capability is detected through `pdfDoc.getForm().getFields().length`
- unsupported or flat templates fall back to worksheet generation and regional guidance

### AcroForm Fill Path

`lib/pdf/fillSchengenPdf.ts` remains the core fill engine.

Implemented behavior:

- loads the official template with `PDFDocument.load(...)`
- resolves field mappings against normalized field names
- supports text fields and checkboxes
- embeds Helvetica for field appearances
- updates field appearances and flattens the form before save

### Shared A4 Text Layout Engine

`lib/pdf/a4TextLayout.ts` is now the canonical source of truth for text pagination.

Implemented behavior:

- line wrapping based on `pdf-lib` font metrics
- stable A4 page geometry and margins
- reusable layout metadata for preview rendering
- `generateA4TextPdf(...)` for exported PDFs using the same coordinates

Current consumers:

- `lib/pdf/generateTextPdf.ts`
- `components/wizard/Step5Workspace.tsx`
- tests covering pagination fidelity

### Consulate-Ready Packet Builder

Two layers build the final packet:

- `lib/applications/consulateReadyPacket.ts`
- `lib/pdf/generateConsulateReadyPacket.ts`

Current behavior:

- builds ordered packet sections from the application, checklist, cover letter, audit, insurance slip, and supporting documents
- renders a real packet cover sheet with applicant summary, travel window, tracking reference, and document manifest
- inserts divider pages for each packet section
- normalizes source PDF pages to A4 portrait
- rotates landscape pages where needed
- appends image sections for PNG and JPEG inputs
- paginates long manifest indexes across continuation pages

### ZIP Package Builder

`app/dashboard/[applicationId]/package/route.ts` assembles a ZIP containing:

- cover-letter markdown and PDF
- filled application PDF and destination-named duplicate
- checklist markdown and PDF
- financial-audit markdown and PDF
- insurance verification slip
- interview simulator markdown and PDF
- refusal decoder markdown and PDF
- optional regional form guidance markdown
- stored supporting documents when present
- the final consulate-ready packet PDF

## Payment Flow Implemented Today

### Pricing

`lib/payments/tiers.ts` defines three GST-inclusive INR tiers:

- `solo`: 1 credit, max 1 applicant, `₹1,999`
- `couple`: 2 credits, max 2 applicants, `₹3,299`
- `family`: 4 credits, max 4 applicants, `₹5,599`

### Checkout and Capture

Implemented flow:

1. `app/api/checkout/route.ts` validates the request, creates a Razorpay order, computes the GST breakdown, and inserts a `payments` row.
2. `components/dashboard/PaymentCheckoutCard.tsx` loads Razorpay Checkout in the browser and posts the signed checkout result to `/api/payments/verify`.
3. `app/api/payments/verify/route.ts` verifies the checkout signature, fetches the Razorpay payment, and finalizes immediately if the payment is already captured.
4. `app/api/webhooks/razorpay/route.ts` finalizes `payment.captured` webhook events for server-side reconciliation.
5. `lib/payments/paymentProcessing.ts` generates a GST invoice PDF, uploads it to protected storage, calls `capture_payment_and_grant_credits(...)`, and refreshes the payment row.

### Invoice Rendering

`lib/payments/gstInvoice.ts` generates invoice PDFs with inclusive GST breakdowns and business metadata supplied by environment variables.

## Document Processing Features Implemented Today

### Supporting Document Uploads

- accepted MIME classes: PDF and image uploads used by Step 5 flows
- page counts and metadata are tracked in the client payload
- files persist to Supabase storage outside preview mode
- protected route handlers stream files back to authenticated users

### Conversion Pipeline

- Word to PDF uses LibreOffice in headless mode
- PDF to Word uses Python `pdf2docx`
- temporary OS files are created and cleaned per request

Current limitation:

- DOCX outputs are downloadable but not previewed inline in the UI

### OCR and Voice Intake

Implemented AI surfaces:

- passport extraction via `gpt-4o-mini`
- bank-statement extraction via `gpt-4o-mini`
- audio transcription via `whisper-1`
- structured voice-context parsing via `gpt-4o`
- cover-letter drafting via `gpt-4o` with `gpt-4o-mini` fallback

Fallback behavior:

- voice-context parsing falls back to deterministic heuristics when AI parsing fails
- cover-letter generation falls back to a deterministic professional template

## Rate Limiting and Operational Health

- `/api/health` reports environment, database, and document-conversion health
- AI-backed routes use DB-backed rate limiting through Supabase RPC

Rate-limited routes visible in code:

- `/api/parse-document`
- `/api/generate-cover-letter`
- `/api/parse-voice-context`

## Tests and Validation Present Today

### Unit Coverage

Vitest now covers:

- cover-letter fallbacks and tourism normalization
- consular policy logic
- itinerary synchronization
- provider-aware checklist logic
- refusal-decoder helpers
- A4 text layout fidelity
- consulate-ready packet cover-sheet rendering and manifest pagination

### End-to-End Coverage

Playwright coverage exists for:

- `e2e/wizard-flow.spec.ts`: preview-mode wizard completion and ZIP verification
- `e2e/step5-document-studio.spec.ts`: Step 5 tab switching, Organize PDF upload/reorder/insert/rotate/delete/export, and packet route validation

### Validation Status For This Pass

The repository was validated with:

- `npm test`
- `npm run lint`
- `npm run build`
- focused regression tests for packet pagination, checklist/provider logic, and A4 layout fidelity

## Pending Manual / Business Tasks (User Side)

These items still require operator or business input outside normal code changes.

1. Supply the live Supabase, OpenAI, Razorpay, and business invoice environment values in deployment.
2. Configure the live Razorpay webhook endpoint at `/api/webhooks/razorpay` and confirm capture events are delivered.
3. Apply all Supabase migrations and verify RLS/storage behavior in the target project.
4. Install and operate LibreOffice, Python 3, and `pdf2docx` on the deployment host.
5. Confirm the final India-only launch copy and remove or keep non-India preview examples intentionally.
6. Approve or refine the current provider stacking blueprints for the mapped countries and supply rules for any new rollout countries.
7. Decide the public-launch compliance copy: privacy, terms, refund language, and AI disclosure.
8. Decide whether hidden PDF-to-Word support should remain an operator-only capability or be removed.

## Pending Technical Tasks (Copilot Side)

The largest remaining engineering tasks are now narrower and mostly operational hardening.

1. Further decompose `components/wizard/PacketWorkspace.tsx`, which still contains a large amount of state and tool orchestration.
2. Add broader live-mode end-to-end coverage for authenticated checkout, webhook reconciliation, supporting-document persistence, and tracking-reference updates.
3. Verify storage cleanup assumptions around legacy bucket references such as `passport-scans` and `generated-packets`, then either provision or remove them.
4. Add explicit deployment runbook material if you want environment provisioning and host dependencies documented beyond the new README.
5. Evaluate session-level caching or virtualization for very large Organize PDF payloads if real-world packets show thumbnail memory pressure.

## Bottom Line

VisaPilot is now materially closer to production readiness than the earlier snapshot. The codebase has a real packet cover sheet and manifest, provider-aware stacking rules, exact shared A4 text pagination, a lighter and more accessible Organize PDF board, Razorpay-based INR checkout, GST invoice generation/storage, and automated Step 5 browser coverage.

The primary remaining work is not core feature delivery. It is production rollout hardening: deployment configuration, live payment/webhook validation, residual component decomposition, and verification of operational assumptions in Supabase storage and infrastructure.