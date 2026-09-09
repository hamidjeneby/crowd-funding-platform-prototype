import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized: Organization workspace required" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const projectId = formData.get("projectId");
    const docType = formData.get("docType"); // For documents
    const mediaType = formData.get("mediaType"); // For media
    const bucket = formData.get("bucket"); // "project_docs" or "project_media"
    const oldFileUrl = formData.get("oldFileUrl"); // For replacement

    if (!file || !projectId || !bucket) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify project ownership and draft status
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("issuer_id, status")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Upload error - Project lookup failed. projectId:", projectId, "error:", projectError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.issuer_id !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized: Project ownership mismatch" },
        { status: 403 },
      );
    }
    if (project.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot modify files: Project is not in draft status" },
        { status: 403 },
      );
    }

    // Delete old file if requested
    if (oldFileUrl) {
      // Extract file path from URL
      const urlParts = oldFileUrl.split(`/${bucket}/`);
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        await supabaseAdmin.storage.from(bucket).remove([filePath]);

        // Remove DB entry as well
        if (bucket === "project_docs") {
          await supabaseAdmin
            .from("project_docs")
            .delete()
            .eq("file_url", oldFileUrl)
            .eq("issuer_id", orgId);
        } else if (bucket === "project_media") {
          await supabaseAdmin
            .from("project_media")
            .delete()
            .eq("url", oldFileUrl)
            .eq("issuer_id", orgId);
        }
      }
    }

    // Upload new file
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${orgId}/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 },
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);

    // Save to DB
    let dbRecord = null;
    if (bucket === "project_docs" && docType) {
      const { data, error } = await supabaseAdmin
        .from("project_docs")
        .insert({
          project_id: projectId,
          issuer_id: orgId,
          doc_type: docType,
          file_url: publicUrl,
          uploaded_by: userId,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      dbRecord = data;
    } else if (bucket === "project_media" && mediaType) {
      // Get current max display_order
      const { data: existingMedia } = await supabaseAdmin
        .from("project_media")
        .select("display_order")
        .eq("project_id", projectId)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder =
        existingMedia && existingMedia.length > 0
          ? existingMedia[0].display_order + 1
          : 0;

      const { data, error } = await supabaseAdmin
        .from("project_media")
        .insert({
          project_id: projectId,
          issuer_id: orgId,
          media_type: mediaType,
          url: publicUrl,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      dbRecord = data;
    }

    return NextResponse.json({ url: publicUrl, record: dbRecord });
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
