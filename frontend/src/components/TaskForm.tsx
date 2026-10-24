import React, { useState } from 'react';
import { X, CheckSquare, Loader2, AlertCircle, Calendar } from 'lucide-react';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../types';

export interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskRequest | (UpdateTaskRequest & { id: number })) => Promise<void>;
  initialTask?: Task | null;
  initialStatus?: TaskStatus;
  members: Array<{ id: number; fullName?: string; username: string }>;
  isBlocked?: boolean;
}

interface TaskFormModalContentProps {
  onClose: () => void;
  onSubmit: (data: CreateTaskRequest | (UpdateTaskRequest & { id: number })) => Promise<void>;
  initialTask?: Task | null;
  initialStatus?: TaskStatus;
  members: Array<{ id: number; fullName?: string; username: string }>;
  isBlocked?: boolean;
}

const TaskFormModalContent: React.FC<TaskFormModalContentProps> = ({
  onClose,
  onSubmit,
  initialTask,
  initialStatus = 'TODO',
  members,
  isBlocked = false,
}) => {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status || initialStatus);
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority || 'MEDIUM');
  const [assigneeId, setAssigneeId] = useState<number | ''>(
    initialTask?.assigneeId !== undefined && initialTask?.assigneeId !== null
      ? initialTask.assigneeId
      : ''
  );
  const [dueDate, setDueDate] = useState(
    initialTask?.dueDate ? initialTask.dueDate.slice(0, 10) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initialTask);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Task title is required.');
      return;
    }

    try {
      setLoading(true);
      if (isEditing && initialTask) {
        await onSubmit({
          id: initialTask.id,
          title: trimmedTitle,
          description: description.trim() || undefined,
          status,
          priority,
          assigneeId: assigneeId !== '' ? Number(assigneeId) : undefined,
          dueDate: dueDate || undefined,
          version: initialTask.version, // Required for optimistic concurrency check
        });
      } else {
        await onSubmit({
          title: trimmedTitle,
          description: description.trim() || undefined,
          status,
          priority,
          assigneeId: assigneeId !== '' ? Number(assigneeId) : undefined,
          dueDate: dueDate || undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save task.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative text-slate-100 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 id="task-form-title" className="text-lg font-bold text-white">
                {isEditing ? 'Edit Task' : 'Create New Task'}
              </h2>
              {isEditing && initialTask && (
                <div className="text-[11px] font-mono text-slate-400">
                  Version: <span className="text-emerald-400 font-bold">v{initialTask.version}</span> (Optimistic Locking)
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Notice: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label htmlFor="taskTitle" className="block font-medium text-slate-300 mb-1.5">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              id="taskTitle"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user session expiration"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-sm transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="taskDesc" className="block font-medium text-slate-300 mb-1.5">
              Description <span className="text-slate-500">(Optional)</span>
            </label>
            <textarea
              id="taskDesc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed acceptance criteria or implementation notes..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-xs transition-all resize-none"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="taskStatus" className="block font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Status</span>
                {isBlocked && (
                  <span className="text-[10px] text-amber-400 font-normal">Locked (Prerequisites)</span>
                )}
              </label>
              <select
                id="taskStatus"
                value={status}
                disabled={isBlocked}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
              {isBlocked && (
                <span className="text-[10px] text-amber-400/90 mt-1 block">
                  Status changes locked while prerequisites are pending.
                </span>
              )}
            </div>

            <div>
              <label htmlFor="taskPriority" className="block font-medium text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                id="taskPriority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          {/* Assignee & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="taskAssignee" className="block font-medium text-slate-300 mb-1.5">
                Assignee
              </label>
              <select
                id="taskAssignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName || m.username} (@{m.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="taskDueDate" className="block font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Due Date</span>
              </label>
              <input
                id="taskDueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const TaskForm: React.FC<TaskFormProps> = (props) => {
  if (!props.isOpen) return null;

  const key = props.initialTask
    ? `edit-${props.initialTask.id}-${props.initialTask.version}`
    : `new-${props.initialStatus || 'TODO'}`;

  return <TaskFormModalContent key={key} {...props} />;
};

export default TaskForm;
