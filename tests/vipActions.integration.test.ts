import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedAccount } from "../lib/auth/session";
import type { ApplicationRow, AuditLogRow, VipActionRequestRow } from "../types";

type UploadRecord = {
  bucket: string;
  path: string;
  fileName: string;
  contentType: string | undefined;
};

type EmailCall = Record<string, unknown>;

type RawVipActionRequestRow = VipActionRequestRow & {
  otp_code?: string | null;
};

type DatabaseState = {
  applications: ApplicationRow[];
  vip_action_requests: RawVipActionRequestRow[];
  application_documents: Array<Record<string, unknown>>;
  audit_logs: AuditLogRow[];
};

type QueryLog = {
  table: string;
  operation: "select" | "insert" | "update";
  columns?: string;
  payload?: Record<string, unknown>;
};

const testState = vi.hoisted(() => ({
  currentAccount: null as AuthenticatedAccount | null,
  db: null as DatabaseState | null,
  uploads: [] as UploadRecord[],
  otpEmails: [] as EmailCall[],
  finalEmails: [] as EmailCall[],
  revalidatedPaths: [] as string[],
  queryLog: [] as QueryLog[],
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    testState.revalidatedPaths.push(path);
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedAccount: vi.fn(async () => testState.currentAccount),
}));

vi.mock("@/lib/email/vipNotifications", () => ({
  sendVipOtpRequestEmail: vi.fn(async (args: EmailCall) => {
    testState.otpEmails.push(args);
    return { delivered: true, provider: "test", message: "Email delivered." };
  }),
  sendFinalHandoverVipEmail: vi.fn(async (args: EmailCall) => {
    testState.finalEmails.push(args);
    return { delivered: true, provider: "test", message: "Email delivered." };
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createFakeSupabaseClient(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => createFakeSupabaseClient(),
}));

import { previewWizardApplicant } from "../lib/mock/applications";
import { reuploadApplicationDocument, submitVipOtpCode, triggerVipOtpRequest, updateVipApplicationStatus } from "../lib/actions/vip-actions";

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getDatabaseState(): DatabaseState {
  if (!testState.db) {
    throw new Error("Test database state is not initialized.");
  }

  return testState.db;
}

function createFakeSupabaseClient() {
  const db = getDatabaseState();

  return {
    from(table: keyof DatabaseState) {
      return createQueryBuilder(table, db);
    },
    storage: {
      from(bucket: string) {
        return {
          upload: async (path: string, file: File, options?: { contentType?: string }) => {
            testState.uploads.push({
              bucket,
              path,
              fileName: file.name,
              contentType: options?.contentType,
            });

            return { data: { path }, error: null };
          },
        };
      },
    },
  };
}

function createQueryBuilder(table: keyof DatabaseState, db: DatabaseState) {
  const state = {
    filters: [] as Array<{ field: string; value: unknown }>,
    selectedColumns: undefined as string | undefined,
    orderBy: undefined as { field: string; ascending: boolean } | undefined,
    limitCount: undefined as number | undefined,
    pendingUpdate: undefined as Record<string, unknown> | undefined,
  };

  const builder = {
    select(columns: string) {
      state.selectedColumns = columns;
      testState.queryLog.push({ table, operation: "select", columns });
      return builder;
    },
    eq(field: string, value: unknown) {
      state.filters.push({ field, value });

      if (state.pendingUpdate) {
        return executeUpdate();
      }

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
    maybeSingle() {
      return Promise.resolve(executeSelect(false));
    },
    single() {
      return Promise.resolve(executeSelect(true));
    },
    update(payload: Record<string, unknown>) {
      state.pendingUpdate = cloneValue(payload);
      return builder;
    },
    insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
      const rows = Array.isArray(payload) ? payload : [payload];
      const tableRows = db[table] as Array<Record<string, unknown>>;

      for (const row of rows) {
        const clonedRow = cloneValue(row);
        const timestamp = new Date().toISOString();
        const storedRow = {
          id: typeof clonedRow.id === "string" ? clonedRow.id : `${String(table)}-${tableRows.length + 1}`,
          created_at: typeof clonedRow.created_at === "string" ? clonedRow.created_at : timestamp,
          uploaded_at: typeof clonedRow.uploaded_at === "string" ? clonedRow.uploaded_at : timestamp,
          ...clonedRow,
        };

        tableRows.push(storedRow);
        testState.queryLog.push({ table, operation: "insert", payload: cloneValue(storedRow) });
      }

      return Promise.resolve({ data: null, error: null });
    },
  };

  function getFilteredRows() {
    const tableRows = db[table] as Array<Record<string, unknown>>;
    let rows = tableRows.filter((row) => state.filters.every((filter) => row[filter.field] === filter.value));

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

  function projectRow(row: Record<string, unknown>) {
    if (!state.selectedColumns) {
      return cloneValue(row);
    }

    const projection: Record<string, unknown> = {};
    for (const key of state.selectedColumns.split(",").map((item) => item.trim()).filter(Boolean)) {
      projection[key] = row[key];
    }

    return cloneValue(projection);
  }

  function executeSelect(requireSingle: boolean) {
    const rows = getFilteredRows();
    const row = rows[0];

    if (!row) {
      return {
        data: null,
        error: requireSingle ? { message: `${String(table)} row not found.` } : null,
      };
    }

    return {
      data: projectRow(row),
      error: null,
    };
  }

  function executeUpdate() {
    const rows = getFilteredRows();

    for (const row of rows) {
      Object.assign(row, cloneValue(state.pendingUpdate));
    }

    testState.queryLog.push({
      table,
      operation: "update",
      payload: cloneValue(state.pendingUpdate ?? {}),
    });

    return Promise.resolve({ data: null, error: null });
  }

  return builder;
}

function buildApplication(overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    status: "otp_pending",
    user_id: "user-1",
    applicant_id: "applicant-1",
    submission_type: "PORTAL_ONLINE",
    track: "VIP_CONCIERGE",
    tier: "SOLO",
    vfs_reference_number: null,
    vfs_center_location: null,
    appointment_date: null,
    applicant_name: "Rohan Batra",
    applicant_email: "rohan.batra@example.com",
    destination_country: "Germany",
    application_data: cloneValue(previewWizardApplicant),
    cover_letter_markdown: "",
    filled_pdf_base64: "",
    rejected_at: null,
    refusal_reason_code: null,
    recovery_status: "NOT_CLAIMED",
    recovery_claimed_at: null,
    privacy_purge_at: "2026-12-01T00:00:00.000Z",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function seedDatabase(args?: {
  applications?: ApplicationRow[];
  vipActionRequests?: RawVipActionRequestRow[];
}) {
  testState.db = {
    applications: cloneValue(args?.applications ?? [buildApplication()]),
    vip_action_requests: cloneValue(args?.vipActionRequests ?? [
      {
        id: "22222222-2222-4222-8222-222222222222",
        application_id: "11111111-1111-4111-8111-111111111111",
        action_type: "OTP_REQUIRED",
        prompt_message: "Enter the 6-digit code in your vault.",
        status: "PENDING",
        expires_at: "2026-09-04T12:00:00.000Z",
        created_at: "2026-09-04T11:55:00.000Z",
        otp_code: null,
      },
    ]),
    application_documents: [],
    audit_logs: [],
  };
}

function setAccount(account: AuthenticatedAccount | null) {
  testState.currentAccount = account;
}

function buildFormData(entries: Record<string, string | File>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

function findAuditEvent(eventType: string) {
  return getDatabaseState().audit_logs.find((entry) => entry.event_type === eventType) ?? null;
}

function getApplication(applicationId = "11111111-1111-4111-8111-111111111111") {
  const application = getDatabaseState().applications.find((entry) => entry.id === applicationId);

  if (!application) {
    throw new Error("Application not found in test state.");
  }

  return application;
}

function getVipRequest(applicationId = "11111111-1111-4111-8111-111111111111") {
  const request = getDatabaseState().vip_action_requests.find((entry) => entry.application_id === applicationId);

  if (!request) {
    throw new Error("VIP request not found in test state.");
  }

  return request;
}

beforeEach(() => {
  vi.clearAllMocks();
  testState.currentAccount = null;
  testState.db = null;
  testState.uploads = [];
  testState.otpEmails = [];
  testState.finalEmails = [];
  testState.revalidatedPaths = [];
  testState.queryLog = [];
});

describe("VIP server actions", () => {
  it("rejects unauthenticated OTP submissions", async () => {
    seedDatabase();
    setAccount(null);

    const result = await submitVipOtpCode(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      otpCode: "654321",
    }));

    expect(result).toEqual({ success: false, message: "Sign in is required." });
    expect(findAuditEvent("application.vip.otp_submitted")).toBeNull();
  });

  it("rejects OTP submission attempts against another user's application", async () => {
    seedDatabase({
      applications: [buildApplication({ user_id: "user-2" })],
    });
    setAccount({ id: "user-1", email: "owner@example.com", isAdmin: false });

    const result = await submitVipOtpCode(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      otpCode: "654321",
    }));

    expect(result).toEqual({ success: false, message: "Application not found." });
    expect(getApplication().status).toBe("otp_pending");
    expect(findAuditEvent("application.vip.otp_submitted")).toBeNull();
  });

  it("rejects admin-only OTP requests from normal users", async () => {
    seedDatabase({
      applications: [buildApplication({ status: "portal_filing_in_progress" })],
      vipActionRequests: [],
    });
    setAccount({ id: "user-1", email: "user@example.com", isAdmin: false });

    const result = await triggerVipOtpRequest(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      promptMessage: "Portal filing requires a 6-digit code in the next five minutes.",
      expiresInMinutes: "5",
    }));

    expect(result).toEqual({ success: false, message: "Admin access is required." });
    expect(findAuditEvent("application.vip.otp_requested")).toBeNull();
  });

  it("rejects status updates from non-admin operator-like accounts under the current auth model", async () => {
    seedDatabase({
      applications: [buildApplication({ status: "bundle_ready" })],
      vipActionRequests: [],
    });
    setAccount({ id: "operator-1", email: "ops@visapilot.app", isAdmin: false });

    const result = await updateVipApplicationStatus(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      status: "portal_submitted",
    }));

    expect(result).toEqual({ success: false, message: "Admin access is required." });
    expect(getApplication().status).toBe("bundle_ready");
  });

  it("rejects invalid VIP status transitions without mutating the application", async () => {
    seedDatabase({
      applications: [buildApplication({ status: "auditing" })],
      vipActionRequests: [],
    });
    setAccount({ id: "admin-1", email: "admin@example.com", isAdmin: true });

    const before = cloneValue(getApplication());
    const result = await updateVipApplicationStatus(buildFormData({
      applicationId: before.id,
      status: "completed",
    }));

    expect(result).toEqual({
      success: false,
      message: "Invalid VIP status transition from auditing to completed.",
    });
    expect(getApplication()).toEqual(before);
    expect(findAuditEvent("application.vip.status_updated")).toBeNull();
  });

  it("allows a valid non-handoff VIP status transition and records an audit event", async () => {
    seedDatabase({
      applications: [buildApplication({ status: "bundle_ready" })],
      vipActionRequests: [],
    });
    setAccount({ id: "admin-1", email: "admin@example.com", isAdmin: true });

    const result = await updateVipApplicationStatus(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      status: "portal_submitted",
    }));

    expect(result.success).toBe(true);
    expect(getApplication().status).toBe("portal_submitted");
    expect(findAuditEvent("application.vip.status_updated")).toMatchObject({
      actor_user_id: "admin-1",
      entity_id: "11111111-1111-4111-8111-111111111111",
      payload: {
        previousStatus: "bundle_ready",
        nextStatus: "portal_submitted",
        appointmentDate: null,
        vfsReferenceNumber: null,
        vfsCenterLocation: null,
      },
    });
  });

  it("rejects appointment_booked without the required handoff metadata", async () => {
    seedDatabase({
      applications: [buildApplication({ status: "appointment_pending" })],
      vipActionRequests: [],
    });
    setAccount({ id: "admin-1", email: "admin@example.com", isAdmin: true });

    const result = await updateVipApplicationStatus(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      status: "appointment_booked",
    }));

    expect(result).toEqual({
      success: false,
      message: "Appointment date, VFS reference, and VFS center are required before booking or completing handoff.",
    });
    expect(getApplication().status).toBe("appointment_pending");
  });

  it("rejects completed without the required handoff metadata", async () => {
    seedDatabase({
      applications: [buildApplication({ status: "portal_submitted" })],
      vipActionRequests: [],
    });
    setAccount({ id: "admin-1", email: "admin@example.com", isAdmin: true });

    const result = await updateVipApplicationStatus(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      status: "completed",
    }));

    expect(result).toEqual({
      success: false,
      message: "Appointment date, VFS reference, and VFS center are required before booking or completing handoff.",
    });
    expect(getApplication().status).toBe("portal_submitted");
  });

  it("allows a valid appointment handoff transition and sends the final handover email", async () => {
    seedDatabase({
      applications: [buildApplication({ status: "appointment_pending" })],
      vipActionRequests: [],
    });
    setAccount({ id: "admin-1", email: "admin@example.com", isAdmin: true });

    const result = await updateVipApplicationStatus(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      status: "appointment_booked",
      appointmentDate: "2026-09-15T10:30:00.000Z",
      vfsReferenceNumber: "VFS-REF-2026-99",
      vfsCenterLocation: "VFS Bengaluru",
    }));

    expect(result.success).toBe(true);
    expect(getApplication()).toMatchObject({
      status: "appointment_booked",
      appointment_date: "2026-09-15T10:30:00.000Z",
      vfs_reference_number: "VFS-REF-2026-99",
      vfs_center_location: "VFS Bengaluru",
    });
    expect(findAuditEvent("application.vip.status_updated")).toMatchObject({
      payload: {
        previousStatus: "appointment_pending",
        nextStatus: "appointment_booked",
      },
    });
    expect(testState.finalEmails).toHaveLength(1);
  });

  it("creates an OTP request audit trail without persisting or exposing the OTP value", async () => {
    seedDatabase({
      applications: [buildApplication({ status: "portal_filing_in_progress" })],
      vipActionRequests: [],
    });
    setAccount({ id: "admin-1", email: "admin@example.com", isAdmin: true });

    const result = await triggerVipOtpRequest(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      promptMessage: "Portal filing requires a 6-digit code in the next five minutes.",
      expiresInMinutes: "5",
    }));

    const request = getVipRequest();
    const serialized = JSON.stringify({
      result,
      request,
      audit: findAuditEvent("application.vip.otp_requested"),
      queryLog: testState.queryLog,
    });

    expect(result.success).toBe(true);
    expect(getApplication().status).toBe("otp_pending");
    expect(request).toMatchObject({
      application_id: "11111111-1111-4111-8111-111111111111",
      action_type: "OTP_REQUIRED",
      status: "PENDING",
    });
    expect(request.otp_code ?? null).toBeNull();
    expect(findAuditEvent("application.vip.otp_requested")).toMatchObject({
      actor_user_id: "admin-1",
      payload: {
        promptMessage: "Portal filing requires a 6-digit code in the next five minutes.",
      },
    });
    expect(serialized).not.toContain("654321");
    expect(serialized).not.toContain("otp_code\":\"654321\"");
  });

  it("records OTP submission without persisting or leaking the submitted code", async () => {
    seedDatabase({
      applications: [buildApplication({ status: "otp_pending" })],
    });
    setAccount({ id: "user-1", email: "owner@example.com", isAdmin: false });

    const result = await submitVipOtpCode(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      otpCode: "654321",
    }));

    const request = getVipRequest();
    const serialized = JSON.stringify({
      result,
      request,
      audit: findAuditEvent("application.vip.otp_submitted"),
      queryLog: testState.queryLog,
    });

    expect(result.success).toBe(true);
    expect(getApplication().status).toBe("portal_filing_in_progress");
    expect(request.status).toBe("RESOLVED");
    expect(request.otp_code ?? null).toBeNull();
    expect(findAuditEvent("application.vip.otp_submitted")).toMatchObject({
      actor_user_id: "user-1",
      payload: {
        requestId: "22222222-2222-4222-8222-222222222222",
        resumedStatus: "portal_filing_in_progress",
      },
    });
    expect(serialized).not.toContain("654321");
    expect(serialized).not.toContain("otp_code\":\"654321\"");
    expect(serialized).not.toContain("otpCode");
  });

  it("rejects unauthorized supporting-document replacement attempts", async () => {
    seedDatabase({
      applications: [buildApplication({ user_id: "user-2", status: "action_required" })],
      vipActionRequests: [],
    });
    setAccount({ id: "user-1", email: "owner@example.com", isAdmin: false });

    const result = await reuploadApplicationDocument(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      documentType: "BANK_STATEMENT",
      file: new File(["replacement"], "bank-proof.pdf", { type: "application/pdf" }),
    }));

    expect(result).toEqual({ success: false, message: "Application not found." });
    expect(testState.uploads).toHaveLength(0);
    expect(findAuditEvent("application.supporting_document.reuploaded")).toBeNull();
  });

  it("reuploads an authorized replacement document and records the audit event", async () => {
    seedDatabase({
      applications: [buildApplication({
        status: "action_required",
        application_data: {
          ...cloneValue(previewWizardApplicant),
          supportingDocuments: [],
        },
      })],
      vipActionRequests: [],
    });
    setAccount({ id: "user-1", email: "owner@example.com", isAdmin: false });

    const result = await reuploadApplicationDocument(buildFormData({
      applicationId: "11111111-1111-4111-8111-111111111111",
      documentType: "BANK_STATEMENT",
      file: new File(["replacement"], "bank-proof.pdf", { type: "application/pdf" }),
    }));

    expect(result.success).toBe(true);
    expect(testState.uploads).toHaveLength(1);
    expect(getDatabaseState().application_documents).toHaveLength(1);
    expect(getApplication().status).toBe("auditing");
    expect(findAuditEvent("application.supporting_document.reuploaded")).toMatchObject({
      actor_user_id: "user-1",
      payload: {
        documentType: "BANK_STATEMENT",
        fileName: "bank-proof.pdf",
        nextStatus: "auditing",
      },
    });
  });
});