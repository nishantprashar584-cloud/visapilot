# SYSTEM ARCHITECTURE & WORKFLOW SPECIFICATION: VISAPILOT PHASE 1

## 1. System Overview & Core Philosophy

VisaPilot operates on a hybrid two-track service architecture for Indian Schengen tourist visa applications:

1. Track 1: "Self-Guided" (DIY / Software-Led): Automated data extraction, AI document scanner checks, Print-Ready Visa Packet generation, and self-submission via an interactive Smart Form Helper drawer.
2. Track 2: "Done-For-You" (DFY / Human-Assisted "Wizard of Oz"): Complete end-to-end execution where internal operators handle official portal submissions (France-Visas, VIDEX, BLS), real-time OTP requests, human document verification, and VFS slot booking, communicating with the user via an in-app Action Center and formal email triggers.

## 2. Package & Feature Matrix

| Feature / Deliverable | Self-Guided: Solo (₹1,999) | Self-Guided: Couple (₹3,299) | Self-Guided: Family (₹5,599) | Done-For-You: Solo (₹5,999) | Done-For-You: Couple (₹9,999) | Done-For-You: Family (₹14,999) |
| --- | --- | --- | --- | --- | --- | --- |
| Application credits included | 1 traveler | 2 adults | Up to 4 members | 1 traveler | 2 adults | Up to 4 members |
| Document OCR & automated audit engine | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 37-box harmonized EU worksheet PDF | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Custom AI cover letter generation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Print-Ready Visa Packet stacking guide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Post-generation vault access | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cross-referenced co-traveler narratives | — | ✓ | ✓ | — | ✓ | ✓ |
| Joint sponsorship & funding logic | — | ✓ | ✓ | — | ✓ | ✓ |
| Minor annexures & parental consent NOCs | — | — | ✓ | — | — | ✓ |
| Smart Form Helper (1-click copy drawer) | ✓ | ✓ | ✓ | — (done by agent) | — (done by agent) | — (done by agent) |
| Human expert document audit (bank seal / NOC) | — | — | — | ✓ | ✓ | ✓ |
| Human official portal filing (France / VIDEX / BLS) | — | — | — | ✓ | ✓ | ✓ |
| Real-time OTP coordination system | — | — | — | ✓ | ✓ | ✓ |
| Managed VFS / BLS slot booking | — | — | — | ✓ | ✓ | ✓ |
| 1-on-1 live mock interview call (15 mins) | — | — | — | ✓ (1 call) | ✓ (1 joint call) | ✓ (1 family call) |
| In-app Action Center & status pipeline | Basic | Basic | Basic | Premium | Premium | Premium |
| B2C tax compliance (18% GST invoice) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 3. Data Model & Database Schema (Supabase PostgreSQL)

```sql
-- 1. ENUMS
CREATE TYPE service_track AS ENUM ('APPLY_MYSELF', 'VIP_CONCIERGE');
CREATE TYPE package_tier AS ENUM ('SOLO', 'COUPLE', 'FAMILY');
CREATE TYPE application_status AS ENUM (
  'DRAFT',
  'AUDITING',
  'ACTION_REQUIRED',
  'BUNDLE_READY',
  'PORTAL_FILING_IN_PROGRESS',
  'OTP_PENDING',
  'PORTAL_SUBMITTED',
  'APPOINTMENT_PENDING',
  'APPOINTMENT_BOOKED',
  'COMPLETED'
);
CREATE TYPE country_submission_type AS ENUM ('PORTAL_ONLINE', 'PAPER_PDF');
CREATE TYPE traveler_role AS ENUM ('PRIMARY', 'SPOUSE', 'ADULT_DEPENDENT', 'MINOR');

-- 2. APPLICATIONS TABLE
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_country VARCHAR(100) NOT NULL,
  submission_type country_submission_type NOT NULL,
  track service_track NOT NULL DEFAULT 'APPLY_MYSELF',
  tier package_tier NOT NULL DEFAULT 'SOLO',
  status application_status NOT NULL DEFAULT 'DRAFT',
  total_amount_inr NUMERIC(10,2) NOT NULL,
  gst_amount_inr NUMERIC(10,2) NOT NULL,
  appointment_date TIMESTAMPTZ,
  vfs_reference_number VARCHAR(50),
  vfs_center_location VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TRAVELERS TABLE (Handles Solo, Couple, Family)
CREATE TABLE travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  role traveler_role NOT NULL DEFAULT 'PRIMARY',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  passport_number VARCHAR(20) NOT NULL,
  passport_expiry_date DATE NOT NULL,
  is_sponsored BOOLEAN DEFAULT false,
  sponsor_traveler_id UUID REFERENCES travelers(id),
  employment_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. APPLICATION DOCUMENTS (Private Supabase Storage Links)
CREATE TABLE application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  traveler_id UUID REFERENCES travelers(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 5. VIP OTP & ACTION REQUESTS TABLE
CREATE TABLE vip_action_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  prompt_message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ROW LEVEL SECURITY AND STORAGE CONSTRAINTS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_action_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY applications_select_own
ON applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY applications_insert_own
ON applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY applications_update_own
ON applications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY travelers_select_own
ON travelers FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = travelers.application_id
      AND applications.user_id = auth.uid()
  )
);

CREATE POLICY travelers_insert_own
ON travelers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = travelers.application_id
      AND applications.user_id = auth.uid()
  )
);

CREATE POLICY travelers_update_own
ON travelers FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = travelers.application_id
      AND applications.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = travelers.application_id
      AND applications.user_id = auth.uid()
  )
);

CREATE POLICY application_documents_select_own
ON application_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = application_documents.application_id
      AND applications.user_id = auth.uid()
  )
);

CREATE POLICY application_documents_insert_own
ON application_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = application_documents.application_id
      AND applications.user_id = auth.uid()
  )
  AND file_path LIKE 'applicant-documents/' || auth.uid()::text || '/%'
);

CREATE POLICY application_documents_update_own
ON application_documents FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = application_documents.application_id
      AND applications.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = application_documents.application_id
      AND applications.user_id = auth.uid()
  )
  AND file_path LIKE 'applicant-documents/' || auth.uid()::text || '/%'
);

CREATE POLICY vip_action_requests_select_own
ON vip_action_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = vip_action_requests.application_id
      AND applications.user_id = auth.uid()
  )
);

CREATE POLICY vip_action_requests_insert_own
ON vip_action_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = vip_action_requests.application_id
      AND applications.user_id = auth.uid()
  )
);

CREATE POLICY vip_action_requests_update_own
ON vip_action_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = vip_action_requests.application_id
      AND applications.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.id = vip_action_requests.application_id
      AND applications.user_id = auth.uid()
  )
);

-- Storage note:
-- Enforce private bucket object paths under applicant-documents/${auth.uid()}/...
-- in Supabase Storage policies alongside the table-level ownership checks above.
```

## 4. End-to-End Workflow State Machine

```text
                 [DRAFT] (Studio Wizard 1-4)
                    |
                    v
               [AUDITING] (OCR + Financial Guardrails Engine)
                    |
       +------------+------------+
       |                         |
       v                         v
 [ACTION_REQUIRED]        [BUNDLE_READY] (Vault Print-Ready Visa Packet Exported)
 (Missing/Failed Docs)           |
       |                         +-----------------------------------------+
       +----------> +------------+------------+                            |
                    |                         |                            v
                    v                         v                  [PAPER FORM DESTINATION]
            [SELF-GUIDED TRACK]       [DONE-FOR-YOU TRACK]      (Spain/Italy/Netherlands)
                    |                         |                            |
                    v                         v                            |
         {Launch Smart Form Helper}    {Assigned to Admin Dashboard}      |
         {1-Click Copy Drawer}         {Operator Opens Portal}            |
                    |                         |                            |
                    v                         v                            |
         (User Files & Downloads)     [PORTAL_FILING_IN_PROGRESS]         |
                    |                         |                            |
                    |                         v                            |
                    |                  [OTP_PENDING]                      |
                    |            (In-App Modal + Email Alert)             |
                    |                         |                            |
                    |                         v                            |
                    |                 [PORTAL_SUBMITTED] <-----------------+
                    |                         |
                    |                         v
                    |               [APPOINTMENT_PENDING]
                    |            (Operator Secures VFS Slot)
                    |                         |
                    v                         v
              [COMPLETED] <-------- [APPOINTMENT_BOOKED]
```

## 5. All Permutations, Combinations & Scenario Implementations

### Permutation Set A: Traveler Grouping Scenarios

#### Scenario A1: Solo (1 Traveler)

- Logic: Primary traveler is self-funded or externally sponsored. Single cover letter output.
- Checks: Single bank account statement >= EUR 100/day minimum allowance. Passport valid >3 months beyond return date.

#### Scenario A2: Couple (2 Adults - Married or Unmarried Co-Travelers)

- Logic: Primary applicant + co-traveler.
- Funding permutations:

1. Both independent: Individual bank statements + individual cover letters referencing each other's passport numbers (`Co-traveler: [Name], Passport: [No]`).
2. Joint funding (spouse sponsoring spouse): Primary applicant uploads bank statement + sponsorship declaration + marriage certificate. Engine automatically injects joint sponsorship clauses into both generated cover letters.

#### Scenario A3: Family (Up to 4 Members - Adults + Minors)

- Logic: Primary applicant + spouse + up to 2 minors.
- Minor documentation permutations:

1. Both parents traveling: Generate joint parental consent declaration for VFS. Attach school NOC / bonafide certificate.
2. Single parent traveling with minor: Critical rule. Require upload of non-accompanying parent NOC signed on ₹100 stamp paper or custody court decree. Flag `ACTION_REQUIRED` if missing.

### Permutation Set B: Destination Submission Types

#### Scenario B1: Online Portal Destination (France, Germany / VIDEX, Switzerland)

- Self-Guided route: Generate Smart Form Helper drawer with 1-click copy chips mapped to France-Visas or VIDEX screen numbers.
- Done-For-You route: Status changes to `PORTAL_FILING_IN_PROGRESS`. Human operator logs into portal using client staged data.

#### Scenario B2: Paper / PDF Destination (Spain, Italy, Netherlands, Greece)

- Both tracks: Portal auto-filling is skipped.
- Output: Generate the line-by-line VisaPilot EU Application Worksheet PDF. The user or operator uses this worksheet to transcribe details directly onto the embassy's official flat, fillable PDF or printed paper form.

### Permutation Set C: VIP Exception & OTP Handling Scenarios

#### Scenario C1: Real-Time Portal OTP Challenge

1. Operator clicks Trigger OTP on internal Admin Panel.
2. System updates application status to `OTP_PENDING` and inserts record into `vip_action_requests`.
3. In-app Vault UI pushes a high-priority sticky modal: "Action Required: Your France-Visas portal filing requires a 6-digit verification code sent to your phone/email. Enter code within 04:59."
4. Email trigger dispatches template `VIP_OTP_REQUEST_EMAIL` with direct code input link.
5. User enters code -> WebSocket or polling pushes code to Admin Panel -> status reverts to `PORTAL_FILING_IN_PROGRESS`.

#### Scenario C2: Missing / Unclear Document Re-upload

1. Operator or audit engine flags document (for example, "Bank statement missing official bank seal on page 3").
2. Status transitions to `ACTION_REQUIRED`.
3. Vault renders an Action Card with direct drag-and-drop replacement input for `BANK_STATEMENT`.
4. Automated email dispatched: `ACTION_REQUIRED_DOC_REUPLOAD`.

## 6. Frontend UI Components Specification

### 1. Pricing Page / Track Selector (`/pricing`)

- Component: Dynamic segmented control `[ Self-Guided | Done-For-You ]`.
- Behavior: Switching tracks updates price cards dynamically.
- Self-Guided prices: Solo (₹1,999), Couple (₹3,299), Family (₹5,599).
- Done-For-You prices: Solo (₹5,999), Couple (₹9,999), Family (₹14,999).
- Tax line: Show subtle subtitle: "Prices are inclusive of 18% GST (tax invoice generated at checkout)."

### 2. The Post-Generation Vault (`/dashboard/[id]/vault`)

- Layout: Use a strict CSS Grid layout for the vault dashboard.
- Top row: Status Pipeline spans the full width.
- Second row: Action Center banner spans the full width beneath the pipeline.
- Main content grid: 2-column layout with Print-Ready Visa Packet on the left and Smart Form Helper CTA on the right.
- Status Pipeline header: Render a horizontal stepper component `[1. Audit Complete] -> [2. Official Submission] -> [3. Appointment Booking] -> [4. Ready for VFS]`.
- Dynamic Action Center (top banner):
- If status == `ACTION_REQUIRED`: Red banner listing specific failure items + upload dropzone.
- If status == `OTP_PENDING`: Animated amber banner with numeric code input and countdown timer.
- If track == `APPLY_MYSELF` and status == `BUNDLE_READY`: Primary CTA card `Open Smart Form Helper ->`.
- If track == `VIP_CONCIERGE`: Card displaying assigned operator name, current SLA time, and direct button `Schedule 15-Min Mock Interview Call`.

### 3. Smart Form Helper Drawer Component (`/dashboard/[id]/submission-guide`)

- Layout: Desktop split-view layout.
- Left panel: Target embassy portal step-by-step instructions (for example, France-Visas Screen 3: Accommodation).
- Right panel (sticky drawer): Accordion list of all 37 EU fields with instant Copy chips.
- Field example: `[ Box 31: Hotel Address ] -> [ Hotel Left Bank, Paris... ] -> [ Copy Button ]`
- Action: Clicking Copy writes text to clipboard and renders a visual toast (`Copied Box 31`).

## 7. Email Trigger System Specifications

All transactional emails must be sent via Resend or SendGrid using pre-compiled HTML templates:

1. `ORDER_CONFIRMATION_GST`: Sent immediately upon successful payment. Attaches official GST tax invoice PDF.
2. `BUNDLE_READY_DIY`: Sent when processing completes for Self-Guided track. Direct magic link to Vault and Smart Form Helper.
3. `VIP_ONBOARDING_ALERT`: Sent to VIP clients confirming their dedicated operator assignment and overall timeline.
4. `VIP_ACTION_REQUIRED_OTP`: Urgent email sent during active portal filings containing the 6-digit OTP submission link.
5. `FINAL_HANDOVER_VIP`: Sent when operator finishes filing and slot booking. Includes attached official barcode PDF and VFS appointment receipt.

## 8. Terminal Implementation Prompt for Coding Agent

```text
You are tasked with implementing the complete two-track, multi-tier pricing and execution system for VisaPilot based on the architecture specification above.

EXECUTE THE FOLLOWING STEPS IN ORDER:

1. DATABASE SCHEMA & TYPES:
   - Create a migration file `supabase/migrations/20260904_init_visapilot_schema.sql` containing the PostgreSQL enums and tables: `applications`, `travelers`, `application_documents`, and `vip_action_requests`.
   - Include application appointment tracking fields: `appointment_date`, `vfs_reference_number`, and `vfs_center_location`.
   - Add document retention metadata with `application_documents.expires_at` defaulting to 30 days for DPDP-compliant auto-delete workflows.
   - Implement Row Level Security (RLS) policies ensuring users can only read/write their own records and files under `applicant-documents/${auth.uid()}/...`.

2. PRICING & CHECKOUT ENGINE:
   - Update `/pricing` component to include a track toggle (`APPLY_MYSELF` vs `VIP_CONCIERGE`).
   - Implement the 6 pricing cards (Solo, Couple, Family across both tracks) ensuring exact prices (₹1,999 to ₹14,999) with 18% GST calculation logic included.

3. VAULT & STATUS PIPELINE UI:
   - In `/dashboard/[id]/vault`, build the horizontal Status Pipeline stepper based on `application_status`.
   - Build the dynamic Action Center banner handling three states: `ACTION_REQUIRED` (file re-upload), `OTP_PENDING` (VIP code input modal with countdown timer), and `BUNDLE_READY` (CTA buttons).
  - Use a strict CSS Grid layout for the Vault dashboard. Place the Status Pipeline spanning the top row, the Action Center banner below it, and a 2-column grid for the Print-Ready Visa Packet (left) and Smart Form Helper CTA (right).

4. SMART FORM HELPER MODULE:
   - Create route `/dashboard/[id]/submission-guide`.
   - Build a sticky desktop helper drawer displaying the 37 EU form fields with 1-click clipboard copy functionality and visual toast feedback.

5. SERVER ACTIONS & EMAIL TRIGGERS:
   - Create Server Actions in `lib/actions/vip-actions.ts` for handling OTP inputs, document re-uploads, and status transitions.
   - Set up Resend/SendGrid transactional email helpers for `BUNDLE_READY_DIY`, `VIP_ACTION_REQUIRED_OTP`, and `FINAL_HANDOVER_VIP`.

6. INTERNAL ADMIN DASHBOARD (WIZARD OF OZ):
   - Create a protected route `/admin/applications` accessible only by users with an `admin` role.
   - Build a basic data table to view all VIP applications.
   - Include a Status Override dropdown to manually transition states (for example, move to `OTP_PENDING` or `APPOINTMENT_BOOKED`).
   - Add a Trigger OTP Request button that creates a record in `vip_action_requests` and dispatches the email.

Ensure zero TypeScript errors, clean modular components, and full adherence to the database schema provided.
```