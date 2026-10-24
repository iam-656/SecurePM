import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '../types';

export interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  projectKey?: string;
  onAddTask?: (status: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: number) => void;
}

const statusColorStyles: Record<TaskStatus, { dot: string; count: string; border: string }> = {
  TODO: {
    dot: 'bg-slate-400',
    count: 'bg-slate-800 text-slate-300',
    border: 'border-slate-800/80',
  },
  IN_PROGRESS: {
    dot: 'bg-sky-400',
    count: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    border: 'border-sky-500/20',
  },
  REVIEW: {
    dot: 'bg-purple-400',
    count: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    border: 'border-purple-500/20',
  },
  DONE: {
    dot: 'bg-emerald-400',
    count: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    border: 'border-emerald-500/20',
  },
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  projectKey,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'Column',
      status,
    },
  });

  const colorStyle = statusColorStyles[status] || statusColorStyles.TODO;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-slate-900/60 border rounded-2xl p-3 min-w-[280px] max-w-[340px] flex-1 transition-colors ${
        isOver
          ? 'border-emerald-500/60 bg-slate-900/90 shadow-xl shadow-emerald-950/20 ring-1 ring-emerald-500/30'
          : colorStyle.border
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colorStyle.dot}`}></span>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${colorStyle.count}`}>
            {tasks.length}
          </span>
        </div>

        {onAddTask && (
          <button
            type="button"
            onClick={() => onAddTask(status)}
            className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
            title={`Add task to ${title}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[160px] max-h-[calc(100vh-280px)] pr-0.5">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectKey={projectKey}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="h-28 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-slate-500 text-[11px]">
            <span>Drop tasks here</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
