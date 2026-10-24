export interface Comment {
  id: number;
  taskId: number;
  authorId: number;
  authorName?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}
