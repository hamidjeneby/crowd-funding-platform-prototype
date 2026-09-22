"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateProjectDraft } from "@/app/actions/projects";
import {
  authorizeUploadBatch,
  deleteProjectFile,
  getSignedUrlsForMedia,
  updateMediaOrder,
} from "@/app/actions/upload";
import { Loader2, RefreshCw } from "lucide-react";
import { useUpload } from "@/app/components/wizard/UploadProvider";

export default function Step5Media({
  projectId,
  initialData,
  onNext,
  onPrev,
  disabled,
  onUpdate,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { queueUploads, uploads, retryUpload } = useUpload();

  // Combine cover image and project media into items list for UI sorting
  // Cover image will be fixed at idx 0 if it exists
  const initialItems = [];

  if (initialData?.cover_image_url) {
    initialItems.push({
      media_id: "existing_cover",
      url: initialData.cover_image_url,
      media_type: "image",
      display_order: 0,
      isCover: true,
    });
  }

  if (initialData?.project_media) {
    const sortedMedia = [...initialData.project_media].sort(
      (a, b) => a.display_order - b.display_order,
    );
    initialItems.push(
      ...sortedMedia.map((m) => ({
        ...m,
        media_id: String(m.id || m.media_id),
      })),
    );
  }

  // Inject active background uploads for this project so they aren't lost on navigate-back
  Object.values(uploads).forEach((u) => {
    if (
      u.projectId === projectId &&
      (u.category === "media" || u.category === "cover")
    ) {
      // Prevent duplicates: check tempId OR check if the DB url contains the upload path
      const exists = initialItems.some(
        (i) =>
          i.media_id === u.fileId ||
          (i.url && u.path && i.url.includes(u.path)),
      );
      if (!exists) {
        initialItems.push({
          media_id: u.fileId,
          url: u.file ? URL.createObjectURL(u.file) : "",
          media_type: u.type,
          display_order: u.display_order,
          isCover: u.isCover,
          isStaged: true,
          isUploadingInBg: true, // flag to prevent re-uploading on next save
        });
      }
    }
  });

  const [items, setItems] = useState(initialItems);
  const [signedUrls, setSignedUrls] = useState({});

  // Fetch signed URLs for existing media
  useEffect(() => {
    async function loadSignedUrls() {
      // Only fetch for items that don't have a signed URL yet
      const urlsToSign = items
        .filter(item => !item.isStaged && item.url && !signedUrls[item.url] && !item.isCover)
        .map(item => item.url);
        
      if (urlsToSign.length > 0) {
        try {
          const fetchedUrls = await getSignedUrlsForMedia(urlsToSign);
          setSignedUrls(prev => ({ ...prev, ...fetchedUrls }));
        } catch (e) {
          console.error("Failed to load signed URLs for media", e);
        }
      }
    }
    loadSignedUrls();
  }, [items, signedUrls]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.media_id === active.id);
        const newIndex = items.findIndex((i) => i.media_id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleFileChange = (e, mediaType) => {
    const file = e.target.files[0];
    if (!file) return;

    const newItem = {
      media_id: `staged_${Date.now()}`,
      url: URL.createObjectURL(file),
      media_type: mediaType,
      file,
      isStaged: true,
      isUploadingInBg: false,
    };

    setItems((prev) => [...prev, newItem]);

    // Reset file input
    e.target.value = "";
  };

  const handleReplace = (e, oldItem, idx) => {
    const file = e.target.files[0];
    if (!file) return;

    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const newItem = {
      media_id: `staged_${Date.now()}`,
      url: URL.createObjectURL(file),
      media_type: mediaType,
      file,
      isStaged: true,
      isUploadingInBg: false,
      replaces: oldItem.url, // track what it replaces to delete it later
    };

    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = newItem;
      return copy;
    });

    e.target.value = "";
  };

  const handleRemove = async (itemToRemove, idx) => {
    if (itemToRemove.isStaged) {
      // Just remove from local state
      URL.revokeObjectURL(itemToRemove.url);
      setItems(items.filter((i) => i.media_id !== itemToRemove.media_id));
    } else {
      // Delete from server
      setUploading(true);
      setError(null);
      try {
        const category = itemToRemove.isCover ? "cover" : "media";
        await deleteProjectFile(projectId, itemToRemove.url, category);
        setItems(items.filter((i) => i.media_id !== itemToRemove.media_id));
        await onUpdate();
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSaveAndContinue = async () => {
    setError(null);

    if (items.length === 0) {
      setError("You must select at least one image to act as the cover image.");
      return;
    }

    setUploading(true);
    try {
      const mediaOrderUpdates = [];
      const filePayloads = [];
      const localFileMap = {};
      let nonCoverCounter = 1;

      items.forEach((item, idx) => {
        const isCover = idx === 0;
        const currentDisplayOrder = isCover ? 0 : nonCoverCounter++;

        if (item.isStaged && !item.isUploadingInBg) {
          const ext = item.file.name.split(".").pop();
          filePayloads.push({
            tempId: item.media_id,
            category: "media",
            type: item.media_type,
            ext,
            isCover,
            display_order: currentDisplayOrder,
            replacesUrl: item.replaces,
          });
          localFileMap[item.media_id] = item.file;
        } else if (!item.isStaged && !isCover) {
          mediaOrderUpdates.push({
            id: item.id,
            url: item.url,
            display_order: currentDisplayOrder,
          });
        }
      });

      // Step A: Sync display order for existing database media items
      if (mediaOrderUpdates.length > 0) {
        await updateMediaOrder(projectId, mediaOrderUpdates);
      }

      // Step B: Authorize and queue uploads for new staged media items
      if (filePayloads.length > 0) {
        const authorizedFiles = await authorizeUploadBatch(
          projectId,
          filePayloads,
        );

        // Delete any replaced files immediately
        for (const p of filePayloads) {
          if (p.replacesUrl) {
            try {
              const category = p.isCover ? "cover" : "media";
              await deleteProjectFile(projectId, p.replacesUrl, category);
            } catch (err) {
              console.error("Failed to delete replaced file:", err);
            }
          }
        }

        // Queue uploads
        const uploadConfigs = authorizedFiles.map((authData) => {
          const file = localFileMap[authData.tempId];
          const payload = filePayloads.find(
            (p) => p.tempId === authData.tempId,
          );

          return {
            fileId: authData.tempId,
            projectId,
            file,
            filename: file.name,
            category: payload.category,
            type: payload.type,
            bucket: authData.bucket,
            path: authData.path,
            isCover: authData.isCover,
            display_order: authData.display_order ?? payload.display_order ?? 0,
            upsert: false,
            signedUrl: authData.signedUrl,
          };
        });

        queueUploads(uploadConfigs);

        // Mark them as uploading in bg so multiple clicks don't duplicate
        setItems((prevItems) =>
          prevItems.map((i) => {
            if (localFileMap[i.media_id])
              return { ...i, isUploadingInBg: true };
            return i;
          }),
        );
      }

      // Save step progress in backend and continue immediately
      await updateProjectDraft(projectId, {}, 5);

      await onUpdate();
      onNext();
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Media</h2>
      <p className="text-sm text-gray-500">
        The first image is your Cover Image. You can drag and drop the media
        cards below to rearrange their display order.
      </p>

      {error && (
        <p className="text-red-500 font-medium bg-red-50 p-3 rounded-md">
          {error}
        </p>
      )}

      <div className="p-4 border rounded-md bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="font-medium">Upload New Media</h3>
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <label className="cursor-pointer bg-white py-1 px-3 border rounded shadow-sm text-sm hover:bg-gray-50">
              Add Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "image")}
                disabled={uploading}
              />
            </label>
            <label className="cursor-pointer bg-white py-1 px-3 border rounded shadow-sm text-sm hover:bg-gray-50">
              Add Video
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "video")}
                disabled={uploading}
              />
            </label>
          </div>
        )}
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((i) => i.media_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 mt-4">
            {items.map((item, idx) => {
              const uploadState = item.isStaged ? uploads[item.media_id] : null;
              return (
                <div
                  key={item.media_id}
                  className="flex items-center gap-3 relative"
                >
                  <div className="text-gray-400 font-bold w-6 text-right z-0">
                    {idx + 1}.
                  </div>
                  <div className="flex-1 z-10 relative">
                    <SortableItem
                      item={{
                        ...item,
                        originalUrl: item.url,
                        url: signedUrls[item.url] || item.url, // Use signed URL if available
                        isLoadingUrl: !item.isStaged && !item.isCover && !signedUrls[item.url]
                      }}
                      idx={idx}
                      disabled={disabled}
                      uploading={uploading}
                      onRemove={() => handleRemove(item, idx)}
                      uploadState={uploadState}
                      onRetry={() => retryUpload(item.media_id)}
                      onReplace={(e) => handleReplace(e, item, idx)}
                    />
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="text-gray-500">
                No media uploaded yet. You must upload at least one image to act
                as a cover image.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onPrev}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={disabled ? onNext : handleSaveAndContinue}
          disabled={uploading}
          className="flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#064e3b] hover:bg-[#064e3b]/90 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
            </>
          ) : disabled ? (
            "Next"
          ) : (
            "Save & Continue"
          )}
        </button>
      </div>
    </div>
  );
}

function SortableItem({
  item,
  idx,
  disabled,
  uploading,
  onRemove,
  uploadState,
  onRetry,
  onReplace,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.media_id, disabled: disabled || idx === 0 });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 border rounded-md flex justify-between items-center bg-white ${
        idx === 0 ? "border-[#064e3b] bg-[#064e3b]/5" : ""
      }`}
    >
      <div className="flex items-center space-x-4 flex-1 mr-4">
        {!disabled && idx !== 0 && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400"
          >
            &#x2630;
          </div>
        )}
        {item.isLoadingUrl ? (
          <div className="h-12 w-12 bg-gray-200 animate-pulse rounded flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        ) : item.media_type === "image" ? (
          <img src={item.url} alt="media" className="h-12 w-12 object-cover rounded" />
        ) : (
          <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-xs">Video</div>
        )}

        {uploadState ? (
          <div className="flex-1 max-w-xs ml-2 mt-1">
            <span
              className={`text-sm font-medium ${uploadState.status === "error" ? "text-red-600" : uploadState.status === "success" ? "text-green-600" : "text-blue-600"}`}
            >
              {uploadState.status === "error"
                ? "Upload Failed"
                : uploadState.status === "success"
                  ? "Uploaded Successfully"
                  : "Uploading in background..."}
            </span>
            {uploadState.status === "error" && (
              <span className="text-xs text-red-500 block">
                {uploadState.errorMessage || uploadState.filename}
              </span>
            )}
            {idx === 0 && (
              <span className="text-[#064e3b] font-bold text-xs mt-1 block">
                Cover Image
              </span>
            )}
          </div>
        ) : (
          <div className="text-sm font-medium flex flex-col ml-2">
            <div className="flex items-center gap-2">
              {idx === 0 && (
                <span className="text-[#064e3b] font-bold">Cover Image</span>
              )}
              <span className="text-gray-700">
                {item.media_type.toUpperCase()}
              </span>
            </div>
            {item.isStaged && (
              <span className="text-xs text-gray-500 mt-0.5">
                Staged for upload
              </span>
            )}
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex gap-2 items-center">
          {uploadState?.status === "error" && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs flex items-center text-blue-600 hover:text-blue-800 px-2 py-1"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Retry
            </button>
          )}
          {!uploadState && (
            <>
              <label className="cursor-pointer text-xs text-gray-700 border border-gray-300 bg-white px-2 py-1 rounded hover:bg-gray-50">
                Replace
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={onReplace}
                  disabled={uploading}
                />
              </label>
              <button
                type="button"
                onClick={onRemove}
                disabled={uploading}
                className="text-xs text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded hover:bg-red-100"
              >
                Remove
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
