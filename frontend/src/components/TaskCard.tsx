import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Calendar,
  User as UserIcon,
  Edit2,
  Trash2,
  Layers,
} from 'lucide-react';
import type { Task, TaskPriority } from '../types';

export interface TaskCardProps {
  task: Task;
  projectKey?: string;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: number) => void;
  isOverlay?: boolean;
}

const priorityStyles: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  HIGH: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
  MEDIUM: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  LOW: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
  },
};

const checkIfOverdue = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate.slice(0, 10) < today;
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  projectKey,
  onEdit,
  onDelete,
  isOverlay = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityStyle = priorityStyles[task.priority] || priorityStyles.MEDIUM;

  const isOverdue = checkIfOverdue(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-slate-900/90 border rounded-xl p-3.5 select-none transition-all ${
        isDragging
          ? 'opacity-40 border-emerald-500/50 scale-[0.98]'
          : isOverlay
          ? 'border-emerald-500 shadow-2xl shadow-emerald-950/40 rotate-1 scale-105 bg-slate-900 cursor-grabbing'
          : 'border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/40'
      }`}
    >
      {/* Top Bar: Key & Badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-300 p-0.5 rounded transition-colors -ml-1"
            title="Drag to reorder or change status"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-semibold text-slate-400">
            {projectKey ? `${projectKey}-${task.id}` : `#${task.id}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Version badge */}
          <span
            title={`Optimistic lock version ${task.version}`}
            className="inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded"
          >
            <Layers className="w-2.5 h-2.5" />
            <span>v{task.version}</span>
          </span>

          {/* Priority badge */}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
          >
            {task.priority}
          </span>
        </div>
      </div>

      {/* Title */}
      <h4
        onClick={() => onEdit?.(task)}
        className="text-xs font-semibold text-slate-100 hover:text-emerald-300 cursor-pointer transition-colors line-clamp-2 mb-1.5 leading-snug"
      >
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {task.description}
        </p>
      )}

      {/* Footer: Due date, Assignee, Actions */}
      <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
        {/* Due date */}
        <div className="flex items-center gap-1.5">
          {task.dueDate ? (
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                isOverdue
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{task.dueDate}</span>
            </span>
          ) : (
            <span className="text-slate-600 text-[10px]">No due date</span>
          )}
        </div>

        {/* Assignee & Action Buttons */}
        <div className="flex items-center gap-2">
          {task.assigneeName ? (
            <div
              title={`Assigned to ${task.assigneeName}`}
              className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-400 font-bold flex items-center justify-center"
            >
              {task.assigneeName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div
              title="Unassigned"
              className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-500 flex items-center justify-center"
            >
              <UserIcon className="w-3 h-3" />
            </div>
          )}

          {/* Action buttons (revealed on card hover) */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                title="Edit task"
                className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                title="Delete task"
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
