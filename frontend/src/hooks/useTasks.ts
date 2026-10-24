import { useState, useEffect, useCallback, useMemo } from 'react';
import { tasksApi } from '../api/tasks';
import type { Task, CreateTaskRequest, UpdateTaskRequest, TaskStatus } from '../types';

export interface UseTasksOptions {
  projectId: number;
  initialSize?: number;
}

export const useTasks = ({ projectId, initialSize = 10 }: UseTasksOptions) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initialSize);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined);
  const [assigneeFilter, setAssigneeFilter] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await tasksApi.fetchTasks(projectId, {
        status: statusFilter,
        assigneeId: assigneeFilter,
        page,
        size,
      });
      setTasks(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load tasks');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, assigneeFilter, page, size]);

  useEffect(() => {
    let isMounted = true;
    tasksApi
      .fetchTasks(projectId, {
        status: statusFilter,
        assigneeId: assigneeFilter,
        page,
        size,
      })
      .then((res) => {
        if (isMounted) {
          setTasks(res.items);
          setTotal(res.total);
          setTotalPages(res.totalPages);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load tasks');
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
  }, [projectId, statusFilter, assigneeFilter, page, size]);

  const createTask = useCallback(
    async (data: CreateTaskRequest): Promise<Task> => {
      const newTask = await tasksApi.createTask(projectId, data);
      await loadTasks();
      return newTask;
    },
    [projectId, loadTasks]
  );

  const updateTask = useCallback(
    async (taskId: number, data: UpdateTaskRequest): Promise<Task> => {
      try {
        const updated = await tasksApi.updateTask(projectId, taskId, data);
        await loadTasks();
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update task';
        if (msg.includes('409') || msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('modified')) {
          throw new Error('Task was modified by another user. Please refresh and try again.');
        }
        throw new Error(msg);
      }
    },
    [projectId, loadTasks]
  );

  const deleteTask = useCallback(
    async (taskId: number): Promise<void> => {
      await tasksApi.deleteTask(projectId, taskId);
      await loadTasks();
    },
    [projectId, loadTasks]
  );

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  const patchTaskCreated = useCallback((task: Task) => {
    setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev : [task, ...prev]));
    setTotal((prev) => prev + 1);
  }, []);

  const patchTaskUpdated = useCallback((task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }, []);

  const patchTaskDeleted = useCallback((taskId: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    total,
    page,
    size,
    totalPages,
    loading,
    error,
    statusFilter,
    assigneeFilter,
    searchQuery,
    setPage,
    setSize,
    setStatusFilter,
    setAssigneeFilter,
    setSearchQuery,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    patchTaskCreated,
    patchTaskUpdated,
    patchTaskDeleted,
  };
};

export default useTasks;
