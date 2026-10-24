import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

export interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  initialContent?: string;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  initialContent = '',
  onCancel,
  placeholder = 'Add a comment or update...',
  submitLabel = 'Comment',
}) => {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initialContent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      setError(null);
      await onSubmit(trimmed);
      if (!isEditing) {
        setContent('');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to submit comment');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      <div className="relative">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-xs transition-all resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={!content.trim() || loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-emerald-500/20"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{loading ? 'Submitting...' : submitLabel}</span>
        </button>
      </div>
    </form>
  );
};

export default CommentForm;
