import type { Role } from './auth';

export interface UserSummary {
  id: number;
  username: string;
  fullName: string;
  role?: Role | string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  projectKey: string;
  createdBy: number;
  createdByName?: string;
  leadId?: number;
  leadName?: string;
  pendingLeadId?: number | null;
  pendingLeadName?: string | null;
  parentProjectId?: number | null;
  parentProjectName?: string | null;
  parentProjectKey?: string | null;
  parentProjectCreatedBy?: number | null;
  isSubproject?: boolean;
  subprojectCount?: number;
  memberSummaries?: UserSummary[];
  inheritedMemberSummaries?: UserSummary[];
  members?: UserSummary[];
  archived: boolean;
  completed: boolean;
  completedAt?: string | null;
  completedBy?: number | null;
  completedByName?: string | null;
  dependencyType?: string;
  prerequisiteIds?: number[];
  prerequisiteNames?: string[];
  isBlocked?: boolean;
  blockingPrerequisiteNames?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  projectKey: string;
  parentProjectId?: number | null;
  leadId?: number | null;
  dependencyType?: string;
  prerequisiteIds?: number[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  archived?: boolean;
  leadId?: number | null;
  dependencyType?: string;
  prerequisiteIds?: number[];
}
