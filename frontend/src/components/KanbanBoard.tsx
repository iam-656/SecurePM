import React, { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '../types';

export interface KanbanBoardProps {
  board: Record<TaskStatus, Task[]>;
  projectKey?: string;
  isCompleted?: boolean;
  onMoveTask: (taskId: number, newStatus: TaskStatus) => Promise<void>;
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
}

const columnTitles: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'In Review',
  DONE: 'Done',
};

const columnOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  projectKey,
  isCompleted = false,
  onMoveTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px drag to initiate to preserve clickability
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (isCompleted) return;
    if (!over) return;

    const taskId = Number(active.id);
    let targetStatus: TaskStatus | undefined;

    // Determine target column status
    if (over.data.current?.type === 'Column') {
      targetStatus = over.data.current.status as TaskStatus;
    } else if (over.data.current?.type === 'Task') {
      targetStatus = over.data.current.task?.status as TaskStatus;
    }

    if (!targetStatus) return;

    // Find current task status
    const currentTask = active.data.current?.task as Task | undefined;
    if (currentTask && currentTask.status !== targetStatus) {
      await onMoveTask(taskId, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={isCompleted ? undefined : handleDragStart}
      onDragEnd={isCompleted ? undefined : handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row items-stretch gap-4 overflow-x-auto pb-4">
        {columnOrder.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            title={columnTitles[status]}
            tasks={board[status] || []}
            projectKey={projectKey}
            onAddTask={isCompleted ? undefined : onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={isCompleted ? undefined : onDeleteTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-[300px]">
            <TaskCard task={activeTask} projectKey={projectKey} isOverlay={true} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
