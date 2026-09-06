import { redirect } from "next/navigation";
import { AdminApplicationsTable } from "@/components/dashboard/AdminApplicationsTable";
import { buildAuthRedirectPath, getAuthenticatedAccount } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApplicationRow } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const account = await getAuthenticatedAccount();

  if (!account) {
    redirect(buildAuthRedirectPath("/admin/applications"));
  }

  if (!account.isAdmin) {
    redirect("/dashboard");
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("applications")
    .select("id, applicant_name, applicant_email, destination_country, status, updated_at, appointment_date, vfs_reference_number, vfs_center_location")
    .eq("track", "VIP_CONCIERGE")
    .order("updated_at", { ascending: false });

  const rows = ((data as Array<Pick<ApplicationRow, "id" | "applicant_name" | "applicant_email" | "destination_country" | "status" | "updated_at" | "appointment_date" | "vfs_reference_number" | "vfs_center_location">> | null) ?? []).map((application) => ({
    id: application.id,
    applicantName: application.applicant_name,
    applicantEmail: application.applicant_email,
    destinationCountry: application.destination_country,
    status: application.status,
    updatedAt: application.updated_at,
    appointmentDate: application.appointment_date ?? null,
    vfsReferenceNumber: application.vfs_reference_number ?? null,
    vfsCenterLocation: application.vfs_center_location ?? null,
  }));

  return (
    <section className="w-full space-y-6 px-4 py-4 sm:px-6 lg:px-8">
      <div className="rounded-[1.6rem] border border-white/14 bg-[linear-gradient(180deg,rgba(24,34,58,0.92),rgba(14,22,42,0.96))] p-6 shadow-[0_22px_60px_rgba(5,10,24,0.28)]">
        <p className="eyebrow">Internal admin dashboard</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">VIP applications</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          This operator surface is restricted to the admin allowlist and manages the Wizard-of-Oz flow for VIP filings, OTP requests, and appointment handoffs.
        </p>
      </div>

      <AdminApplicationsTable rows={rows} />
    </section>
  );
}