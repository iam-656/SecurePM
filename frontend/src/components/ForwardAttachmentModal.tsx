import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Lock,
} from 'lucide-react';
import { libraryApi } from '../api/library';
import type { Attachment, ForwardTarget } from '../types';

interface ForwardAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: Attachment | null;
  projectId: number;
  onForwardSuccess: (count: number) => void;
}

export const ForwardAttachmentModal: React.FC<ForwardAttachmentModalProps> = ({
  isOpen,
  onClose,
  attachment,
  projectId,
  onForwardSuccess,
}) => {
  const [targets, setTargets] = useState<ForwardTarget[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !attachment) {
      setTargets([]);
      setSelectedIds([]);
      setError(null);
      return;
    }

    const loadTargets = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await libraryApi.getForwardTargets(projectId, attachment.id);
        setTargets(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load forward destinations');
      } finally {
        setLoading(false);
      }
    };

    loadTargets();
  }, [isOpen, attachment, projectId]);

  if (!isOpen || !attachment) {
    return null;
  }

  const eligibleTargets = targets.filter((t) => !t.completed && !t.alreadyForwarded);

  const toggleSelect = (targetId: number) => {
    setSelectedIds((prev) =>
      prev.includes(targetId) ? prev.filter((id) => id !== targetId) : [...prev, targetId]
    );
  };

  const selectAll = () => {
    setSelectedIds(eligibleTargets.map((t) => t.id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const handleForward = async () => {
    if (selectedIds.length === 0) return;
    setForwarding(true);
    setError(null);
    try {
      await libraryApi.forwardAttachment(projectId, attachment.id, selectedIds);
      onForwardSuccess(selectedIds.length);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to forward attachment');
    } finally {
      setForwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Forward Attachment</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{attachment.originalName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span>Select Destination Projects:</span>
            {eligibleTargets.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectAll}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Select All ({eligibleTargets.length})
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span>Loading destinations...</span>
            </div>
          ) : targets.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm border border-dashed border-slate-800 rounded-xl">
              No related projects or sub-projects available to forward to.
            </div>
          ) : (
            <div className="space-y-2">
              {targets.map((target) => {
                const isSelected = selectedIds.includes(target.id);
                const isAlready = target.alreadyForwarded;
                const isCompleted = target.completed;
                const isDisabled = isAlready || isCompleted;

                return (
                  <div
                    key={target.id}
                    onClick={() => {
                      if (!isDisabled) toggleSelect(target.id);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isDisabled
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 cursor-pointer shadow-sm'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 text-slate-400">
                        {isDisabled ? (
                          isCompleted ? (
                            <Lock className="w-4 h-4 text-amber-500/70" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
                          )
                        ) : isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200 truncate">
                            {target.name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              target.isSubproject
                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                                : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {target.isSubproject ? 'Sub-project' : 'Main Project'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3">
                      {isAlready ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          Already in Library
                        </span>
                      ) : isCompleted ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          Completed (Locked)
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {selectedIds.length} project{selectedIds.length === 1 ? '' : 's'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={forwarding}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={selectedIds.length === 0 || forwarding}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
            >
              {forwarding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Forwarding...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>
                    Forward to {selectedIds.length > 0 ? `${selectedIds.length} Destinations` : 'Destinations'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
