import apiClient from './client';
import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatus,
  PageResponse,
} from '../types';

export interface TaskFilterParams {
  status?: TaskStatus;
  assigneeId?: number;
  page?: number;
  size?: number;
}

export const createTask = async (projectId: number, data: CreateTaskRequest): Promise<Task> => {
  const response = await apiClient.post<Task>(`/projects/${projectId}/tasks`, data);
  return response.data;
};

export const fetchTasks = async (
  projectId: number,
  params?: TaskFilterParams
): Promise<PageResponse<Task>> => {
  const response = await apiClient.get<PageResponse<Task>>(`/projects/${projectId}/tasks`, {
    params,
  });
  return response.data;
};

export const fetchKanban = async (projectId: number): Promise<Task[]> => {
  const response = await apiClient.get<Task[]>(`/projects/${projectId}/tasks/kanban`);
  return response.data;
};

export const fetchTask = async (projectId: number, taskId: number): Promise<Task> => {
  const response = await apiClient.get<Task>(`/projects/${projectId}/tasks/${taskId}`);
  return response.data;
};

export const updateTask = async (
  projectId: number,
  taskId: number,
  data: UpdateTaskRequest
): Promise<Task> => {
  const response = await apiClient.put<Task>(`/projects/${projectId}/tasks/${taskId}`, data);
  return response.data;
};

export const deleteTask = async (
  projectId: number,
  taskId: number
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(
    `/projects/${projectId}/tasks/${taskId}`
  );
  return response.data;
};

export const tasksApi = {
  createTask,
  fetchTasks,
  fetchKanban,
  fetchTask,
  updateTask,
  deleteTask,
};

export default tasksApi;
