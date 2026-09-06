# VisaPilot

VisaPilot is a Next.js application for preparing Schengen tourist visa packets with an India-focused Phase 1 payment and operations model. The product combines a five-step application wizard, AI-assisted document extraction and cover-letter drafting, a Step 5 document studio, and consulate-ready PDF packet generation.

## What Is Implemented

- Five-step wizard for identity, travel, financials, accommodations, and document studio.
- Preview mode with seeded applications for product walkthroughs.
- AI-assisted passport OCR, bank-statement extraction, voice-context parsing, and cover-letter drafting.
- Exact A4 text layout shared between on-screen Step 5 preview and exported PDFs.
- Consulate-ready packet generation with a rendered cover sheet, manifest, checklist, and normalized supporting documents.
- Advanced PDF tools in Step 5: merge, JPG to PDF, split, compress, organize, rotate, sanitize, and Word to PDF.
- Organize PDF thumbnail board with drag, touch, keyboard, insertion slots, rotation, delete, and export flows.
- Supabase-backed application persistence, Google OAuth plus email OTP auth, storage, and RLS.
- Razorpay checkout with GST-inclusive INR pricing and server-side invoice generation/storage.

## Tech Stack

- Next.js 14 App Router
- React 18 + TypeScript 5
- Tailwind CSS
- React Hook Form + Zod
- Supabase Auth, Postgres, and Storage
- OpenAI APIs for OCR, transcription, and drafting
- pdf-lib for form filling, layout, and packet generation
- pdfjs-dist for Organize PDF thumbnails
- Vitest and Playwright for automated tests

## Local Prerequisites

- Node.js 20+
- npm
- LibreOffice on the machine PATH for Word-to-PDF conversion
- Python 3 with `pdf2docx` installed for PDF-to-Word conversion
- A Supabase project with the repo migrations applied
- Razorpay test or production credentials

Install the Python dependency with:

```bash
pip install pdf2docx
```

## Environment Variables

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
BUSINESS_LEGAL_NAME=
BUSINESS_GSTIN=
BUSINESS_ADDRESS=
BUSINESS_SUPPORT_EMAIL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup

1. Install dependencies.

```bash
npm install
```

2. Apply Supabase migrations in your target project.

3. Verify LibreOffice and Python tooling are available on the host.

4. Start the development server.

```bash
npm run dev
```

5. Open `http://localhost:3000`.

Use `/apply?preview=1` to exercise the full wizard without authentication.

## Authentication

- `/auth` now offers both Google OAuth and email OTP.
- Google OAuth uses Supabase as the identity broker and returns through `/auth/callback`.
- Email OTP remains available as the fallback sign-in path.
- No additional app-side environment variables are required for Google beyond the existing Supabase project configuration.

## Payment Model

- Phase 1 pricing is INR only.
- `Solo`: `₹1,999`
- `Couple`: `₹3,299`
- `Family`: `₹5,599`
- Checkout is created through Razorpay orders.
- Captured payments generate GST invoices that are stored in the protected Supabase document bucket.

Configure Razorpay to send `payment.captured` webhooks to `/api/webhooks/razorpay`.

## Useful Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Notes:

- `npm run build` runs `scripts/verify-pdf-templates.ts` first.
- `npm run test:e2e` runs the full Playwright suite and expects a production build to be available because Playwright starts `next start`.

## Testing Scope

- Vitest covers packet generation, checklist/provider logic, A4 layout fidelity, itinerary sync, refusal helpers, and consular policy logic.
- Playwright covers the preview wizard flow and the Step 5 document studio, including Organize PDF reorder, insert, rotate, delete, export, and packet download checks.

## Operational Notes

- The main storage bucket used in the current code is `visapilot-supporting-documents`.
- Preview mode bypasses auth gates on key routes and uses seeded applications from `lib/mock/applications.ts`.
- The health endpoint is available at `/api/health` and reports environment, database, and document-conversion health.
- To enable Google sign-in, configure the Google provider inside the target Supabase project and set the OAuth redirect URL to `/auth/callback` on this app origin.

## Current Gaps

- `components/wizard/PacketWorkspace.tsx` still owns a large amount of Step 5 tool orchestration and could be decomposed further.
- Live-mode end-to-end coverage for authenticated Razorpay checkout, webhooks, and supporting-document persistence is still lighter than preview-mode coverage.
- Production deployment still depends on correct Supabase, Razorpay, LibreOffice, and Python host configuration.
