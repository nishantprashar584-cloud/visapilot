import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supportingDocumentsBucket } from "@/lib/documents/supportingDocuments";
import type { ApplicationRow } from "@/types";

async function getApplication(applicationId: string): Promise<ApplicationRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("applications")
    .select("id, user_id, application_data")
    .eq("id", applicationId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ApplicationRow;
}

export async function GET(
  _request: Request,
  { params }: { params: { applicationId: string; documentId: string } },
) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in is required to open supporting documents." }, { status: 401 });
    }

    const application = await getApplication(params.applicationId);

    if (!application || application.user_id !== user.id) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const document = application.application_data.supportingDocuments?.find((item) => item.id === params.documentId);

    if (!document) {
      return NextResponse.json({ error: "Supporting document not found." }, { status: 404 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage.from(supportingDocumentsBucket).download(document.storagePath);

    if (error || !data) {
      throw new Error(error?.message ?? "Unable to load supporting document.");
    }

    const bytes = await data.arrayBuffer();

    return new Response(bytes, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.fileName.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to open supporting document.",
      },
      { status: 500 },
    );
  }
}