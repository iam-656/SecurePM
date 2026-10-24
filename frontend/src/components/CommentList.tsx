import React, { useState } from 'react';
import { MessageSquare, Edit2, Trash2, Clock } from 'lucide-react';
import { CommentForm } from './CommentForm';
import type { Comment } from '../types';

export interface CommentListProps {
  comments: Comment[];
  currentUserId?: number;
  isAdmin?: boolean;
  onEditComment?: (commentId: number, content: string) => Promise<unknown> | void;
  onDeleteComment?: (commentId: number) => Promise<unknown> | void;
  loading?: boolean;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  currentUserId,
  isAdmin = false,
  onEditComment,
  onDeleteComment,
  loading = false,
}) => {
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="space-y-3 py-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-full bg-slate-800"></div>
            <div className="flex-1 space-y-2">
              <div className="w-24 h-3 bg-slate-800 rounded"></div>
              <div className="w-3/4 h-3 bg-slate-800/60 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-xs">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p>No comments yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
      {comments.map((comment) => {
        const canModify = (Boolean(onEditComment) || Boolean(onDeleteComment)) && (isAdmin || (currentUserId && comment.authorId === currentUserId));
        const isEditing = editingCommentId === comment.id;

        return (
          <div
            key={comment.id}
            className="group bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs transition-colors hover:border-slate-700/80"
          >
            {isEditing ? (
              <CommentForm
                initialContent={comment.content}
                submitLabel="Save"
                onCancel={() => setEditingCommentId(null)}
                onSubmit={async (newContent) => {
                  if (onEditComment) {
                    await onEditComment(comment.id, newContent);
                  }
                  setEditingCommentId(null);
                }}
              />
            ) : (
              <div>
                {/* Header: Author & Date & Actions */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center border border-emerald-500/30">
                      {(comment.authorName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-200">
                      {comment.authorName || `User #${comment.authorId}`}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatDate(comment.createdAt)}</span>
                    </span>
                  </div>

                  {canModify && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEditComment && (
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(comment.id)}
                          className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                          title="Edit comment"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteComment && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this comment?')) {
                              onDeleteComment(comment.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap pl-8">
                  {comment.content}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CommentList;
