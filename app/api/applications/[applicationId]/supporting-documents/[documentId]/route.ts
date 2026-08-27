import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supportingDocumentsBucket } from "@/lib/documents/supportingDocuments";
import type { ApplicationRow } from "@/types";

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

    const { data: applicationData, error: applicationError } = await supabase
      .from("applications")
      .select("id, user_id, application_data")
      .eq("id", params.applicationId)
      .single();

    const application = !applicationError && applicationData ? applicationData as ApplicationRow : null;

    if (!application || application.user_id !== user.id) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const document = application.application_data.supportingDocuments?.find((item) => item.id === params.documentId);

    if (!document) {
      return NextResponse.json({ error: "Supporting document not found." }, { status: 404 });
    }

    const { data, error } = await supabase.storage.from(supportingDocumentsBucket).download(document.storagePath);

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