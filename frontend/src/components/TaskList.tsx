import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '../types';

export interface TaskListProps {
  tasks: Task[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  loading: boolean;
  projectKey?: string;
  onPageChange: (newPage: number) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: number) => void;
}

const statusBadges: Record<TaskStatus, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  TODO: {
    label: 'To Do',
    bg: 'bg-slate-800 text-slate-300 border-slate-700',
    text: 'text-slate-300',
    icon: HelpCircle,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    text: 'text-sky-400',
    icon: Clock,
  },
  REVIEW: {
    label: 'In Review',
    bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    text: 'text-purple-400',
    icon: AlertCircle,
  },
  DONE: {
    label: 'Done',
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    text: 'text-emerald-400',
    icon: CheckCircle2,
  },
};

const priorityBadges: Record<TaskPriority, { bg: string; text: string; border: string }> = {
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

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  total,
  page,
  size,
  totalPages,
  loading,
  projectKey,
  onPageChange,
  onEditTask,
  onDeleteTask,
}) => {
  const startIdx = page * size + 1;
  const endIdx = Math.min((page + 1) * size, total);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3">Task ID</th>
              <th scope="col" className="px-4 py-3">Title</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Priority</th>
              <th scope="col" className="px-4 py-3">Assignee</th>
              <th scope="col" className="px-4 py-3">Due Date</th>
              <th scope="col" className="px-4 py-3 text-center">Version</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3.5"><div className="w-12 h-4 bg-slate-800 rounded"></div></td>
                  <td className="px-4 py-3.5"><div className="w-48 h-4 bg-slate-800 rounded"></div></td>
                  <td className="px-4 py-3.5"><div className="w-20 h-4 bg-slate-800 rounded"></div></td>
                  <td className="px-4 py-3.5"><div className="w-16 h-4 bg-slate-800 rounded"></div></td>
                  <td className="px-4 py-3.5"><div className="w-24 h-4 bg-slate-800 rounded"></div></td>
                  <td className="px-4 py-3.5"><div className="w-20 h-4 bg-slate-800 rounded"></div></td>
                  <td className="px-4 py-3.5"><div className="w-10 h-4 bg-slate-800 rounded mx-auto"></div></td>
                  <td className="px-4 py-3.5"><div className="w-12 h-4 bg-slate-800 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  No tasks found matching your filters.
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const statusInfo = statusBadges[task.status] || statusBadges.TODO;
                const priorityInfo = priorityBadges[task.priority] || priorityBadges.MEDIUM;
                const StatusIcon = statusInfo.icon;
                const isOverdue = checkIfOverdue(task.dueDate);

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onEditTask?.(task)}
                  >
                    {/* ID / Key */}
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-400 whitespace-nowrap">
                      {projectKey ? `${projectKey}-${task.id}` : `#${task.id}`}
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors truncate">
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {task.description}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.bg}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${priorityInfo.bg} ${priorityInfo.text} ${priorityInfo.border}`}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {task.assigneeName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                            {task.assigneeName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-300 font-medium">{task.assigneeName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">Unassigned</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {task.dueDate ? (
                        <span className={`inline-flex items-center gap-1 text-[11px] ${isOverdue ? 'text-rose-400' : 'text-slate-400'}`}>
                          <Calendar className="w-3 h-3" />
                          <span>{task.dueDate}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Version */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span
                        title={`Optimistic Concurrency Lock Version: ${task.version}`}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        <span>v{task.version}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        {onEditTask && (
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                            title="Edit task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteTask && (
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          {total > 0 ? (
            <span>
              Showing <span className="font-semibold text-slate-200">{startIdx}</span> to{' '}
              <span className="font-semibold text-slate-200">{endIdx}</span> of{' '}
              <span className="font-semibold text-slate-200">{total}</span> tasks
            </span>
          ) : (
            <span>0 tasks</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 mr-2">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 0 || loading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page + 1 >= totalPages || loading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskList;
