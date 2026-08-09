"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { recordSuccessfulUploads } from "@/app/actions/upload";

const UploadContext = createContext(null);

export function UploadProvider({ children }) {
  // uploads state tracks: { [fileId]: { file, filename, status, progress_percent, bucket, path, isCover, display_order, type, tusUpload } }
  // statuses: "pending", "uploading", "success", "error"
  const [uploads, setUploads] = useState({});

  const activeUploadsCount = useRef(0);
  const queue = useRef([]); // holds fileIds waiting to start

  const processQueue = async () => {
    if (activeUploadsCount.current >= 3 || queue.current.length === 0) return;

    const fileId = queue.current.shift();
    if (!fileId) return;

    activeUploadsCount.current++;

    try {
      const uploadData = uploads[fileId];
      if (!uploadData) {
        activeUploadsCount.current--;
        processQueue();
        return;
      }

      // Check file size limit (max 6MB)
      if (uploadData.file.size > 6 * 1024 * 1024) {
        throw new Error("File is too large (max 6MB)");
      }

      setUploads((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: "uploading",
          progress_percent: 0,
        },
      }));

      // Use XMLHttpRequest to upload to the signed URL and track progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadData.signedUrl, true);
        xhr.setRequestHeader("Content-Type", uploadData.file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = ((event.loaded / event.total) * 100).toFixed(2);
            setUploads((prev) => ({
              ...prev,
              [fileId]: {
                ...prev[fileId],
                status: "uploading",
                progress_percent: Number(percentage),
              },
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network Error or CORS failure"));
        xhr.send(uploadData.file);
      });

      await recordSuccessfulUploads(uploadData.projectId, [
        {
          category: uploadData.category,
          type: uploadData.type,
          bucket: uploadData.bucket,
          path: uploadData.path,
          isCover: !!uploadData.isCover,
          display_order: uploadData.display_order,
        },
      ]);

      setUploads((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: "success",
          progress_percent: 100,
        },
      }));
    } catch (err) {
      console.error(err);
      setUploads((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: "error",
          errorMessage: err.message || "Failed to record upload in DB",
        },
      }));
    }

    // Fallback queue processing if not using TUS or if synchronous error
    activeUploadsCount.current--;
    processQueue();
  };

  useEffect(() => {
    // Whenever uploads state changes, maybe process queue (e.g. if we added new files to pending)
    const pendingIds = Object.keys(uploads).filter(
      (id) => uploads[id].status === "pending" && !queue.current.includes(id),
    );
    if (pendingIds.length > 0) {
      queue.current.push(...pendingIds);
      processQueue();
    }
  }, [uploads]);

  // Prevent user from closing tab while uploads are active
  useEffect(() => {
    const hasUploading = Object.values(uploads).some(
      (u) => u.status === "uploading" || u.status === "pending",
    );

    const handleBeforeUnload = (e) => {
      if (hasUploading) {
        e.preventDefault();
        e.returnValue =
          "You have active uploads. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploads]);

  const queueUploads = (fileConfigs) => {
    const newUploads = {};
    fileConfigs.forEach((conf) => {
      newUploads[conf.fileId] = {
        ...conf,
        status: "pending",
        progress_percent: 0,
      };
    });

    setUploads((prev) => ({ ...prev, ...newUploads }));
  };

  const retryUpload = (fileId) => {
    setUploads((prev) => {
      if (!prev[fileId]) return prev;
      return {
        ...prev,
        [fileId]: { ...prev[fileId], status: "pending", progress_percent: 0 },
      };
    });
  };

  const clearUpload = (fileId) => {
    setUploads((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  };

  const hasActiveUploads = Object.values(uploads).some(
    (u) => u.status === "uploading" || u.status === "pending",
  );
  const uploadingCount = Object.values(uploads).filter(
    (u) => u.status === "uploading" || u.status === "pending",
  ).length;
  const hasFinishedUploads = Object.values(uploads).some(
    (u) => u.status === "success",
  );

  return (
    <UploadContext.Provider
      value={{
        uploads,
        queueUploads,
        retryUpload,
        clearUpload,
        hasActiveUploads,
        uploadingCount,
        hasFinishedUploads,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}
