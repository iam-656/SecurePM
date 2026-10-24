export type WebSocketEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'COMMENT_CREATED'
  | 'COMMENT_UPDATED'
  | 'COMMENT_DELETED'
  | 'ATTACHMENT_CREATED'
  | 'ATTACHMENT_DELETED';

export interface WebSocketMessage {
  type: WebSocketEventType;
  projectId: number;
  taskId: number;
  payload: Record<string, unknown>;
}

export type WebSocketConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';
