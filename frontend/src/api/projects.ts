import apiClient from './client';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '../types';

export const fetchProjects = async (includeSubprojects?: boolean): Promise<Project[]> => {
  const params = includeSubprojects !== undefined ? { includeSubprojects } : undefined;
  const response = await apiClient.get<Project[]>('/projects', { params });
  return response.data;
};

export const fetchProject = async (id: number): Promise<Project> => {
  const response = await apiClient.get<Project>(`/projects/${id}`);
  return response.data;
};

export const createProject = async (data: CreateProjectRequest): Promise<Project> => {
  const response = await apiClient.post<Project>('/projects', data);
  return response.data;
};

export const updateProject = async (id: number, data: UpdateProjectRequest): Promise<Project> => {
  const response = await apiClient.put<Project>(`/projects/${id}`, data);
  return response.data;
};

export const archiveProject = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/projects/${id}`);
  return response.data;
};

export const addMember = async (projectId: number, userId: number): Promise<Project> => {
  const response = await apiClient.post<Project>(`/projects/${projectId}/members/${userId}`);
  return response.data;
};

export const removeMember = async (projectId: number, userId: number): Promise<Project> => {
  const response = await apiClient.delete<Project>(`/projects/${projectId}/members/${userId}`);
  return response.data;
};

export const fetchSubprojects = async (id: number): Promise<Project[]> => {
  const response = await apiClient.get<Project[]>(`/projects/${id}/subprojects`);
  return response.data;
};

export const completeProject = async (id: number): Promise<Project> => {
  const response = await apiClient.post<Project>(`/projects/${id}/complete`);
  return response.data;
};

export const reopenProject = async (id: number): Promise<Project> => {
  const response = await apiClient.post<Project>(`/projects/${id}/reopen`);
  return response.data;
};

export const projectsApi = {
  fetchProjects,
  fetchProject,
  fetchSubprojects,
  completeProject,
  reopenProject,
  createProject,
  updateProject,
  archiveProject,
  addMember,
  removeMember,
};

export default projectsApi;
