import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeApplicationRecord = Record<string, unknown>;

const testState = vi.hoisted(() => ({
  user: { id: "user-1", email: "rhea@example.com" } as { id: string; email: string } | null,
  applications: [] as FakeApplicationRecord[],
  users: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/openai/generateCoverLetter", () => ({
  generateCoverLetterMarkdown: vi.fn(async () => "Generated cover letter"),
}));

vi.mock("@/lib/pdf/generateFilledApplicationPdf", () => ({
  generateFilledApplicationPdf: vi.fn(async () => Buffer.from("pdf-binary")),
}));

vi.mock("@/lib/security/identityLock", () => ({
  lockApplicantIdentity: vi.fn(async () => "locked-applicant-1"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => createFakeSupabaseClient(),
}));

import { POST } from "../app/api/application-package/route";
import { mergeApplicantDraft } from "../lib/applications/schema";
import { buildApplicantDraftFromReadiness, createPreviewReadinessDraft } from "../lib/case-intelligence/readiness";

function createFakeSupabaseClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: testState.user } }),
    },
    from(table: "applications" | "users") {
      return createQueryBuilder(table);
    },
  };
}

function createQueryBuilder(table: "applications" | "users") {
  const state = {
    filters: [] as Array<{ field: string; value: unknown }>,
    selectedColumns: undefined as string | undefined,
    orderBy: undefined as { field: string; ascending: boolean } | undefined,
    limitCount: undefined as number | undefined,
    insertedRow: null as FakeApplicationRecord | null,
  };

  const builder = {
    select(columns: string) {
      state.selectedColumns = columns;
      return builder;
    },
    eq(field: string, value: unknown) {
      state.filters.push({ field, value });
      return builder;
    },
    order(field: string, options: { ascending: boolean }) {
      state.orderBy = { field, ascending: options.ascending };
      return builder;
    },
    limit(count: number) {
      state.limitCount = count;
      return builder;
    },
    then(resolve: (value: { data: FakeApplicationRecord[]; error: null }) => unknown) {
      resolve(executeSelect());
      return Promise.resolve();
    },
    upsert: async (payload: Record<string, unknown>) => {
      testState.users.push(payload);
      return { data: null, error: null };
    },
    insert(payload: Record<string, unknown>) {
      const timestamp = new Date().toISOString();
      const row = {
        id: `application-${testState.applications.length + 1}`,
        created_at: timestamp,
        updated_at: timestamp,
        vfs_reference_number: null,
        vfs_center_location: null,
        appointment_date: null,
        rejected_at: null,
        refusal_reason_code: null,
        recovery_status: "NOT_CLAIMED",
        recovery_claimed_at: null,
        privacy_purge_at: "2026-12-31T00:00:00.000Z",
        ...payload,
      };

      testState.applications.push(row);
      state.insertedRow = row;

      return {
        select(columns: string) {
          state.selectedColumns = columns;
          return {
            single: async () => ({ data: projectRow(state.insertedRow as FakeApplicationRecord), error: null }),
          };
        },
      };
    },
  };

  function getRows() {
    let rows = (table === "applications" ? testState.applications : testState.users).filter((row) =>
      state.filters.every((filter) => row[filter.field] === filter.value),
    );

    if (state.orderBy) {
      const direction = state.orderBy.ascending ? 1 : -1;
      rows = [...rows].sort((left, right) => {
        const leftValue = left[state.orderBy!.field];
        const rightValue = right[state.orderBy!.field];

        if (leftValue === rightValue) {
          return 0;
        }

        return leftValue! > rightValue! ? direction : -direction;
      });
    }

    if (typeof state.limitCount === "number") {
      rows = rows.slice(0, state.limitCount);
    }

    return rows;
  }

  function projectRow(row: FakeApplicationRecord) {
    if (!state.selectedColumns) {
      return row;
    }

    return state.selectedColumns
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean)
      .reduce<Record<string, unknown>>((result, column) => {
        result[column] = row[column];
        return result;
      }, {});
  }

  function executeSelect() {
    return {
      data: getRows().map((row) => projectRow(row)),
      error: null,
    };
  }

  return builder;
}

function buildValidApplicantPayload() {
  const readinessDraft = createPreviewReadinessDraft("couple");
  const applicant = mergeApplicantDraft(buildApplicantDraftFromReadiness(readinessDraft));

  applicant.personal.dateOfBirth = "1990-01-01";
  applicant.personal.placeOfBirth = "Delhi";
  applicant.contact.email = "rhea@example.com";
  applicant.contact.phone = "+919999999999";
  applicant.contact.addressLine1 = "12 Park Street";
  applicant.contact.city = "Delhi";
  applicant.contact.postalCode = "110001";
  applicant.passport.number = "P1234567";
  applicant.passport.dateOfIssue = "2022-01-01";
  applicant.passport.dateOfExpiry = "2032-01-01";
  applicant.passport.issuedBy = "India";
  applicant.trip.portOfEntry = "Paris";
  applicant.trip.accommodations = "Hotel booking confirmed for the full stay.";
  applicant.trip.hotelBookingReference = "FR-12345";
  applicant.trip.previousSchengenVisas = [
    {
      validFrom: "2025-05-10",
      validTo: "2025-05-21",
      visaNumber: "FR-2025-1182",
    },
  ];
  applicant.homeTies.returnIntentEvidence = "Continuing employment and family commitments in India.";
  applicant.application.placeOfApplication = "New Delhi";

  return applicant;
}

describe("application-package route", () => {
  beforeEach(() => {
    testState.user = { id: "user-1", email: "rhea@example.com" };
    testState.applications = [];
    testState.users = [];
  });

  it("reuses the same application for an identical readiness handoff instead of creating a duplicate", async () => {
    const applicant = buildValidApplicantPayload();
    const requestBody = {
      applicant,
      track: "APPLY_MYSELF",
      tier: "couple",
    };

    const firstResponse = await POST(new Request("http://localhost/api/application-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }));
    const firstPayload = await firstResponse.json() as { applicationId: string; readinessHandoffKey: string | null };

    const secondResponse = await POST(new Request("http://localhost/api/application-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }));
    const secondPayload = await secondResponse.json() as { applicationId: string; readinessHandoffKey: string | null };

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstPayload.applicationId).toBe(secondPayload.applicationId);
    expect(firstPayload.readinessHandoffKey).toBeTruthy();
    expect(secondPayload.readinessHandoffKey).toBe(firstPayload.readinessHandoffKey);
    expect(testState.applications).toHaveLength(1);
    expect(testState.applications[0].application_data).toMatchObject({
      caseContext: {
        handoffKey: firstPayload.readinessHandoffKey,
        readinessSource: "FREE_READINESS",
      },
    });
  });
});