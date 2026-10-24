import { useState, useEffect, useCallback } from 'react';
import { commentsApi } from '../api/comments';
import type { Comment } from '../types';

export interface UseCommentsOptions {
  taskId: number;
  projectId: number;
}

export const useComments = ({ taskId, projectId }: UseCommentsOptions) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!taskId || !projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await commentsApi.fetchComments(taskId, projectId);
      setComments(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load comments');
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId]);

  useEffect(() => {
    if (!taskId || !projectId) return;
    let isMounted = true;

    commentsApi
      .fetchComments(taskId, projectId)
      .then((data) => {
        if (isMounted) {
          setComments(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load comments');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [taskId, projectId]);

  const addComment = useCallback(
    async (content: string): Promise<Comment> => {
      const newComment = await commentsApi.createComment(taskId, projectId, { content });
      setComments((prev) => [...prev, newComment]);
      return newComment;
    },
    [taskId, projectId]
  );

  const editComment = useCallback(
    async (commentId: number, content: string): Promise<Comment> => {
      const updated = await commentsApi.updateComment(taskId, commentId, projectId, { content });
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      return updated;
    },
    [taskId, projectId]
  );

  const deleteComment = useCallback(
    async (commentId: number): Promise<void> => {
      await commentsApi.deleteComment(taskId, commentId, projectId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [taskId, projectId]
  );

  const patchCommentCreated = useCallback((comment: Comment) => {
    setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
  }, []);

  const patchCommentUpdated = useCallback((comment: Comment) => {
    setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
  }, []);

  const patchCommentDeleted = useCallback((commentId: number) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  return {
    comments,
    loading,
    error,
    loadComments,
    addComment,
    editComment,
    deleteComment,
    patchCommentCreated,
    patchCommentUpdated,
    patchCommentDeleted,
  };
};

export default useComments;
