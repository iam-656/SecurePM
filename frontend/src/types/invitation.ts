export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' | 'EXPIRED';

export interface ProjectInvitation {
  id: number;
  projectId: number;
  projectName?: string;
  projectKey?: string;
  invitedUserId: number;
  invitedUsername?: string;
  invitedUserFullName?: string;
  invitedBy: number;
  invitedByUsername?: string;
  status: InvitationStatus;
  expiresAt: string;
  expired: boolean;
  createdAt: string;
}

export interface CreateInvitationRequest {
  userId: number;
}
