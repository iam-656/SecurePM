import apiClient from './client';
import type { ProjectInvitation } from '../types';

export const invitationsApi = {
  async createInvitation(projectId: number, userId: number): Promise<ProjectInvitation> {
    const response = await apiClient.post<ProjectInvitation>(`/projects/${projectId}/invitations`, {
      userId,
    });
    return response.data;
  },

  async getProjectInvitations(projectId: number): Promise<ProjectInvitation[]> {
    const response = await apiClient.get<ProjectInvitation[]>(`/projects/${projectId}/invitations`);
    return response.data;
  },

  async cancelInvitation(projectId: number, invitationId: number): Promise<ProjectInvitation> {
    const response = await apiClient.delete<ProjectInvitation>(
      `/projects/${projectId}/invitations/${invitationId}`
    );
    return response.data;
  },

  async acceptInvitation(invitationId: number): Promise<ProjectInvitation> {
    const response = await apiClient.post<ProjectInvitation>(`/invitations/${invitationId}/accept`);
    return response.data;
  },

  async declineInvitation(invitationId: number): Promise<ProjectInvitation> {
    const response = await apiClient.post<ProjectInvitation>(`/invitations/${invitationId}/decline`);
    return response.data;
  },
};
