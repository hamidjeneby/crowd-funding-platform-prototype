"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Ensures the user is authorized to edit the project draft.
 */
async function verifyProjectAccess(projectId) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("issuer_id, status")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("Project not found");
  }
  if (project.issuer_id !== userId) {
    throw new Error("Unauthorized: Project ownership mismatch");
  }
  if (project.status !== "draft") {
    throw new Error("Cannot modify files: Project is not in draft status");
  }

  return { userId };
}

/**
 * Step A: Authorizes a batch upload and returns storage paths.
 * For cover images, returns a standard signed URL. For TUS uploads (docs/media), returns the authorized path.
 * @param {string} projectId 
 * @param {Array} files - Array of { tempId, category ('document'|'media'), type, ext, isCover }
 */
export async function authorizeUploadBatch(projectId, files) {
  await verifyProjectAccess(projectId);

  const results = [];

  for (const file of files) {
    let bucket = "";
    let path = "";

    if (file.category === "document") {
      bucket = "project_docs";
      if (file.type === "other") {
        path = `${projectId}/other_${crypto.randomUUID()}.${file.ext}`;
      } else {
        path = `${projectId}/${file.type}_${crypto.randomUUID()}.${file.ext}`;
      }
    } else if (file.category === "media") {
      if (file.isCover) {
        bucket = "cover_img";
        path = `${crypto.randomUUID()}.${file.ext}`; // No project folder for public cover_img
      } else {
        bucket = "project_media";
        path = `${projectId}/${crypto.randomUUID()}.${file.ext}`;
      }
    } else {
      throw new Error(`Invalid file category: ${file.category}`);
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      console.error(`Error creating signed upload URL for bucket ${bucket}:`, error);
      throw new Error(`Failed to generate upload URL for ${file.category}`);
    }

    results.push({
      tempId: file.tempId,
      signedUrl: data.signedUrl,
      path: data.path || path,
      bucket,
      isCover: !!file.isCover,
    });
  }

  return results;
}

/**
 * Step C: Records successful uploads in the database.
 * @param {string} projectId 
 * @param {Array} uploadedFiles - Array of { category, type, bucket, path, display_order, isCover }
 */
export async function recordSuccessfulUploads(projectId, uploadedFiles) {
  const { userId } = await verifyProjectAccess(projectId);
  const results = { documents: 0, media: 0, cover: false };

  for (const file of uploadedFiles) {
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(file.bucket)
      .getPublicUrl(file.path);

    if (file.category === "document") {
      if (file.type === "other") {
        // Always insert for 'other'
        await supabaseAdmin.from("project_docs").insert({
          project_id: projectId,
          issuer_id: userId,
          doc_type: "other",
          file_url: publicUrl,
          uploaded_by: userId,
          uploaded_at: new Date().toISOString(),
        });
      } else {
        // Delete old slot if it exists, then insert to avoid unique constraint errors on upsert
        await supabaseAdmin.from("project_docs").delete().match({ project_id: projectId, doc_type: file.type });
        
        await supabaseAdmin.from("project_docs").insert({
          project_id: projectId,
          issuer_id: userId,
          doc_type: file.type,
          file_url: publicUrl,
          uploaded_by: userId,
          uploaded_at: new Date().toISOString(),
        });
      }
      results.documents++;
    } else if (file.category === "media") {
      if (file.isCover) {
        // Update cover_image_url in projects table
        await supabaseAdmin.from("projects").update({
          cover_image_url: publicUrl,
        }).eq("id", projectId);
        results.cover = true;
      } else {
        // Insert into project_media
        await supabaseAdmin.from("project_media").insert({
          project_id: projectId,
          issuer_id: userId,
          media_type: file.type,
          url: publicUrl,
          display_order: file.display_order || 0,
        });
        results.media++;
      }
    }
  }

  return results;
}

/**
 * Removes a file from storage and database.
 */
export async function deleteProjectFile(projectId, fileUrl, category) {
  const { userId } = await verifyProjectAccess(projectId);

  if (category === "document") {
    const urlParts = fileUrl.split("/project_docs/");
    if (urlParts.length === 2) {
      await supabaseAdmin.storage.from("project_docs").remove([urlParts[1]]);
      await supabaseAdmin.from("project_docs").delete().eq("file_url", fileUrl).eq("issuer_id", userId);
    }
  } else if (category === "media") {
    const urlParts = fileUrl.split("/project_media/");
    if (urlParts.length === 2) {
      await supabaseAdmin.storage.from("project_media").remove([urlParts[1]]);
      await supabaseAdmin.from("project_media").delete().eq("url", fileUrl).eq("issuer_id", userId);
    }
  } else if (category === "cover") {
    const urlParts = fileUrl.split("/cover_img/");
    if (urlParts.length === 2) {
      await supabaseAdmin.storage.from("cover_img").remove([urlParts[1]]);
      await supabaseAdmin.from("projects").update({ cover_image_url: null }).eq("id", projectId);
    }
  }

  return { success: true };
}

export async function getSignedUrlsForMedia(urls) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  const signedUrls = {};
  for (const url of urls) {
    let bucket = "project_media";
    if (url.includes("/cover_images/")) bucket = "cover_images";
    else if (url.includes("/project_docs/")) bucket = "project_docs";
    
    const urlParts = url.split(`/${bucket}/`);
    if (urlParts.length === 2) {
      const path = urlParts[1];
      const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        signedUrls[url] = data.signedUrl;
      }
    }
  }
  return signedUrls;
}
