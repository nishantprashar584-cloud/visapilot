import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildSupportingDocumentStoragePath, supportingDocumentsBucket } from "@/lib/documents/supportingDocuments";
import type { SupportingDocument, SupportingDocumentKind } from "@/types";

const deletePayloadSchema = z.object({
  storagePath: z.string().trim().min(1),
});

const uploadDocumentIdSchema = z.string().trim().min(1).optional();

function inferDocumentKind(mimeType: string): SupportingDocumentKind {
  return mimeType === "application/pdf" ? "pdf" : "image";
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in is required to upload supporting documents." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const pageCount = Number(formData.get("pageCount") ?? 1);
    const requestedDocumentId = uploadDocumentIdSchema.parse(formData.get("documentId")?.toString());

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a PDF or image file." }, { status: 400 });
    }

    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Only PDF, PNG, JPG, and WEBP files are supported." }, { status: 400 });
    }

    const documentId = requestedDocumentId ?? crypto.randomUUID();
    const storagePath = buildSupportingDocumentStoragePath(user.id, documentId, file.name);
    const admin = createSupabaseAdminClient();

    const { error } = await admin.storage
      .from(supportingDocumentsBucket)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const document: SupportingDocument = {
      id: documentId,
      fileName: file.name,
      mimeType: file.type,
      kind: inferDocumentKind(file.type),
      pageCount: Number.isFinite(pageCount) && pageCount > 0 ? Math.round(pageCount) : 1,
      sizeBytes: file.size,
      storagePath,
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to upload supporting document.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in is required to remove supporting documents." }, { status: 401 });
    }

    const requestBody = await request.json();
    const parsedPayload = deletePayloadSchema.safeParse(requestBody);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid supporting document removal payload." }, { status: 400 });
    }

    if (!parsedPayload.data.storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "You do not have permission to remove this document." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.storage.from(supportingDocumentsBucket).remove([parsedPayload.data.storagePath]);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to remove supporting document.",
      },
      { status: 500 },
    );
  }
}