import { useState, useEffect, useCallback } from 'react';
import { tasksApi } from '../api/tasks';
import type { Task, TaskStatus, CreateTaskRequest, UpdateTaskRequest } from '../types';

export const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

const initialBoard: Record<TaskStatus, Task[]> = {
  TODO: [],
  IN_PROGRESS: [],
  REVIEW: [],
  DONE: [],
};

export const useKanban = (projectId: number) => {
  const [board, setBoard] = useState<Record<TaskStatus, Task[]>>(initialBoard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupTasks = (tasks: Task[]): Record<TaskStatus, Task[]> => {
    const grouped: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        grouped.TODO.push(task);
      }
    });

    return grouped;
  };

  const loadKanban = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const tasks = await tasksApi.fetchKanban(projectId);
      setBoard(groupTasks(tasks));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load kanban tasks');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let isMounted = true;

    tasksApi
      .fetchKanban(projectId)
      .then((tasks) => {
        if (isMounted) {
          setBoard(groupTasks(tasks));
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load kanban tasks');
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
  }, [projectId]);

  const moveTask = useCallback(
    async (taskId: number, newStatus: TaskStatus): Promise<void> => {
      let targetTask: Task | undefined;
      let prevStatus: TaskStatus | undefined;

      // Find task and previous status
      for (const col of COLUMNS) {
        const found = board[col].find((t) => t.id === taskId);
        if (found) {
          targetTask = found;
          prevStatus = col;
          break;
        }
      }

      if (!targetTask || !prevStatus || prevStatus === newStatus) {
        return;
      }

      const previousBoard = board;

      // Optimistic update
      setBoard((prev) => {
        const updatedSource = prev[prevStatus!].filter((t) => t.id !== taskId);
        const updatedTarget = [{ ...targetTask!, status: newStatus }, ...prev[newStatus]];

        return {
          ...prev,
          [prevStatus!]: updatedSource,
          [newStatus]: updatedTarget,
        };
      });

      try {
        const updated = await tasksApi.updateTask(projectId, taskId, {
          title: targetTask.title,
          description: targetTask.description,
          status: newStatus,
          priority: targetTask.priority,
          assigneeId: targetTask.assigneeId,
          dueDate: targetTask.dueDate,
          version: targetTask.version,
        });

        // Update task version in state
        setBoard((prev) => ({
          ...prev,
          [newStatus]: prev[newStatus].map((t) => (t.id === taskId ? updated : t)),
        }));
      } catch (err: unknown) {
        // Revert optimistic update
        setBoard(previousBoard);
        const msg = err instanceof Error ? err.message : 'Move failed';
        if (msg.includes('409') || msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('modified')) {
          setError('Task was modified by another user. Reloading board...');
          await loadKanban();
          throw new Error('Task was modified by another user. Board refreshed.');
        }
        setError(msg);
        throw err;
      }
    },
    [board, projectId, loadKanban]
  );

  const createTask = useCallback(
    async (data: CreateTaskRequest): Promise<Task> => {
      const created = await tasksApi.createTask(projectId, data);
      await loadKanban();
      return created;
    },
    [projectId, loadKanban]
  );

  const updateTask = useCallback(
    async (taskId: number, data: UpdateTaskRequest): Promise<Task> => {
      try {
        const updated = await tasksApi.updateTask(projectId, taskId, data);
        await loadKanban();
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Update failed';
        if (msg.includes('409') || msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('modified')) {
          await loadKanban();
          throw new Error('Task was modified by another user. Reloading latest task state...');
        }
        throw err;
      }
    },
    [projectId, loadKanban]
  );

  const deleteTask = useCallback(
    async (taskId: number): Promise<void> => {
      await tasksApi.deleteTask(projectId, taskId);
      await loadKanban();
    },
    [projectId, loadKanban]
  );

  const patchTaskCreated = useCallback((task: Task) => {
    setBoard((prev) => {
      const nextBoard: Record<TaskStatus, Task[]> = {
        TODO: prev.TODO.filter((t) => t.id !== task.id),
        IN_PROGRESS: prev.IN_PROGRESS.filter((t) => t.id !== task.id),
        REVIEW: prev.REVIEW.filter((t) => t.id !== task.id),
        DONE: prev.DONE.filter((t) => t.id !== task.id),
      };
      const col = nextBoard[task.status] ? task.status : 'TODO';
      nextBoard[col] = [task, ...nextBoard[col]];
      return nextBoard;
    });
  }, []);

  const patchTaskUpdated = useCallback((task: Task) => {
    setBoard((prev) => {
      const nextBoard: Record<TaskStatus, Task[]> = {
        TODO: prev.TODO.filter((t) => t.id !== task.id),
        IN_PROGRESS: prev.IN_PROGRESS.filter((t) => t.id !== task.id),
        REVIEW: prev.REVIEW.filter((t) => t.id !== task.id),
        DONE: prev.DONE.filter((t) => t.id !== task.id),
      };
      const col = nextBoard[task.status] ? task.status : 'TODO';
      nextBoard[col] = [task, ...nextBoard[col]];
      return nextBoard;
    });
  }, []);

  const patchTaskDeleted = useCallback((taskId: number) => {
    setBoard((prev) => ({
      TODO: prev.TODO.filter((t) => t.id !== taskId),
      IN_PROGRESS: prev.IN_PROGRESS.filter((t) => t.id !== taskId),
      REVIEW: prev.REVIEW.filter((t) => t.id !== taskId),
      DONE: prev.DONE.filter((t) => t.id !== taskId),
    }));
  }, []);

  return {
    board,
    loading,
    error,
    loadKanban,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    patchTaskCreated,
    patchTaskUpdated,
    patchTaskDeleted,
  };
};

export default useKanban;
