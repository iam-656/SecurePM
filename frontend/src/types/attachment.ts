export interface Attachment {
  id: number;
  projectId: number;
  taskId?: number | null;
  taskTitle?: string | null;
  originalName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy?: number | null;
  uploadedByName?: string | null;
  forwardedBy?: number | null;
  forwardedByName?: string | null;
  forwardedAt?: string | null;
  sourceProjectId?: number | null;
  sourceProjectName?: string | null;
  sourceAttachmentId?: number | null;
  isForwarded?: boolean;
}

export interface ForwardTarget {
  id: number;
  name: string;
  isSubproject: boolean;
  completed: boolean;
  alreadyForwarded: boolean;
}

export interface ForwardAttachmentRequest {
  targetProjectIds: number[];
}

export interface LibraryFilterParams {
  search?: string;
  fileType?: string;
  source?: string;
  sortBy?: string;
}
