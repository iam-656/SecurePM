import apiClient from './client';
import type { Attachment, ForwardTarget, LibraryFilterParams } from '../types';

export const listLibraryFiles = async (
  projectId: number,
  params?: LibraryFilterParams
): Promise<Attachment[]> => {
  const response = await apiClient.get<Attachment[]>(`/projects/${projectId}/library`, {
    params,
  });
  return response.data;
};

export const uploadLibraryFile = async (
  projectId: number,
  file: File
): Promise<Attachment> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<Attachment>(
    `/projects/${projectId}/library`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const downloadLibraryFile = async (
  projectId: number,
  attachmentId: number
): Promise<Blob> => {
  const response = await apiClient.get<Blob>(
    `/projects/${projectId}/library/${attachmentId}/download`,
    {
      responseType: 'blob',
    }
  );
  return response.data;
};

export const getForwardTargets = async (
  projectId: number,
  attachmentId: number
): Promise<ForwardTarget[]> => {
  const response = await apiClient.get<ForwardTarget[]>(
    `/projects/${projectId}/library/${attachmentId}/targets`
  );
  return response.data;
};

export const forwardAttachment = async (
  projectId: number,
  attachmentId: number,
  targetProjectIds: number[]
): Promise<Attachment[]> => {
  const response = await apiClient.post<Attachment[]>(
    `/projects/${projectId}/library/${attachmentId}/forward`,
    { targetProjectIds }
  );
  return response.data;
};

export const deleteLibraryFile = async (
  projectId: number,
  attachmentId: number
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(
    `/projects/${projectId}/library/${attachmentId}`
  );
  return response.data;
};

export const libraryApi = {
  listLibraryFiles,
  uploadLibraryFile,
  downloadLibraryFile,
  getForwardTargets,
  forwardAttachment,
  deleteLibraryFile,
};

export default libraryApi;
