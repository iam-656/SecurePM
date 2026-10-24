import apiClient from './client';
import type { Comment, CreateCommentRequest, UpdateCommentRequest } from '../types';

export const fetchComments = async (
  taskId: number,
  projectId: number
): Promise<Comment[]> => {
  const response = await apiClient.get<Comment[]>(`/tasks/${taskId}/comments`, {
    params: { projectId },
  });
  return response.data;
};

export const createComment = async (
  taskId: number,
  projectId: number,
  data: CreateCommentRequest
): Promise<Comment> => {
  const response = await apiClient.post<Comment>(`/tasks/${taskId}/comments`, data, {
    params: { projectId },
  });
  return response.data;
};

export const updateComment = async (
  taskId: number,
  commentId: number,
  projectId: number,
  data: UpdateCommentRequest
): Promise<Comment> => {
  const response = await apiClient.put<Comment>(
    `/tasks/${taskId}/comments/${commentId}`,
    data,
    {
      params: { projectId },
    }
  );
  return response.data;
};

export const deleteComment = async (
  taskId: number,
  commentId: number,
  projectId: number
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(
    `/tasks/${taskId}/comments/${commentId}`,
    {
      params: { projectId },
    }
  );
  return response.data;
};

export const commentsApi = {
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
};

export default commentsApi;
