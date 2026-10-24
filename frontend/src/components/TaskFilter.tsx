import React from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import type { TaskStatus } from '../types';

export interface TaskFilterProps {
  status?: TaskStatus;
  onStatusChange: (status: TaskStatus | undefined) => void;
  assigneeId?: number;
  onAssigneeChange: (assigneeId: number | undefined) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  members: Array<{ id: number; fullName?: string; username: string }>;
  onReset?: () => void;
}

export const TaskFilter: React.FC<TaskFilterProps> = ({
  status,
  onStatusChange,
  assigneeId,
  onAssigneeChange,
  searchQuery,
  onSearchChange,
  members,
  onReset,
}) => {
  const hasActiveFilters = Boolean(status || assigneeId !== undefined || searchQuery);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter tasks by title or assignee..."
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors text-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Select Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
        </div>

        {/* Status Filter */}
        <select
          value={status || ''}
          onChange={(e) => onStatusChange(e.target.value ? (e.target.value as TaskStatus) : undefined)}
          className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeId !== undefined ? assigneeId : ''}
          onChange={(e) => onAssigneeChange(e.target.value ? Number(e.target.value) : undefined)}
          className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs cursor-pointer"
        >
          <option value="">All Assignees</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName || m.username}
            </option>
          ))}
        </select>

        {/* Reset button */}
        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Reset filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskFilter;
