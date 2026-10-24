import apiClient from './client';
import type { Attachment } from '../types';

export const listAttachments = async (
  taskId: number,
  projectId: number
): Promise<Attachment[]> => {
  const response = await apiClient.get<Attachment[]>(`/tasks/${taskId}/attachments`, {
    params: { projectId },
  });
  return response.data;
};

export const uploadAttachment = async (
  taskId: number,
  projectId: number,
  file: File
): Promise<Attachment> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<Attachment>(
    `/tasks/${taskId}/attachments`,
    formData,
    {
      params: { projectId },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const downloadAttachment = async (
  taskId: number,
  attachmentId: number,
  projectId: number
): Promise<Blob> => {
  const response = await apiClient.get<Blob>(
    `/tasks/${taskId}/attachments/${attachmentId}`,
    {
      params: { projectId },
      responseType: 'blob',
    }
  );
  return response.data;
};

export const deleteAttachment = async (
  taskId: number,
  attachmentId: number,
  projectId: number
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(
    `/tasks/${taskId}/attachments/${attachmentId}`,
    {
      params: { projectId },
    }
  );
  return response.data;
};

export const attachmentsApi = {
  listAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
};

export default attachmentsApi;
