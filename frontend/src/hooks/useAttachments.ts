import { useState, useEffect, useCallback } from 'react';
import { attachmentsApi } from '../api/attachments';
import type { Attachment } from '../types';

export interface UseAttachmentsOptions {
  taskId: number;
  projectId: number;
}

export const useAttachments = ({ taskId, projectId }: UseAttachmentsOptions) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    if (!taskId || !projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await attachmentsApi.listAttachments(taskId, projectId);
      setAttachments(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load attachments');
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId]);

  useEffect(() => {
    if (!taskId || !projectId) return;
    let isMounted = true;

    attachmentsApi
      .listAttachments(taskId, projectId)
      .then((data) => {
        if (isMounted) {
          setAttachments(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load attachments');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [taskId, projectId]);

  const uploadAttachment = useCallback(
    async (file: File): Promise<Attachment> => {
      try {
        setUploading(true);
        setError(null);
        const newAttachment = await attachmentsApi.uploadAttachment(taskId, projectId, file);
        setAttachments((prev) => [...prev, newAttachment]);
        return newAttachment;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to upload attachment';
        setError(msg);
        throw new Error(msg);
      } finally {
        setUploading(false);
      }
    },
    [taskId, projectId]
  );

  const downloadAttachment = useCallback(
    async (attachmentId: number, originalName: string): Promise<void> => {
      try {
        setError(null);
        const blob = await attachmentsApi.downloadAttachment(taskId, attachmentId, projectId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to download attachment';
        setError(msg);
        throw new Error(msg);
      }
    },
    [taskId, projectId]
  );

  const deleteAttachment = useCallback(
    async (attachmentId: number): Promise<void> => {
      try {
        setError(null);
        await attachmentsApi.deleteAttachment(taskId, attachmentId, projectId);
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete attachment';
        setError(msg);
        throw new Error(msg);
      }
    },
    [taskId, projectId]
  );

  const patchAttachmentCreated = useCallback((attachment: Attachment) => {
    setAttachments((prev) => (prev.some((a) => a.id === attachment.id) ? prev : [attachment, ...prev]));
  }, []);

  const patchAttachmentDeleted = useCallback((attachmentId: number) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

  return {
    attachments,
    loading,
    uploading,
    error,
    loadAttachments,
    uploadAttachment,
    downloadAttachment,
    deleteAttachment,
    patchAttachmentCreated,
    patchAttachmentDeleted,
  };
};

export default useAttachments;
