import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Settings,
  Kanban,
  ListTodo,
  Users,
  AlertCircle,
  Clock,
  Plus,
  GitBranch,
  ArrowRight,
  FolderKanban,
  CheckCircle2,
  RefreshCw,
  Loader2,
  FolderArchive,
} from 'lucide-react';
import { TaskFilter } from '../components/TaskFilter';
import { TaskForm } from '../components/TaskForm';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { KanbanBoard } from '../components/KanbanBoard';
import { TaskList } from '../components/TaskList';
import { ProjectLibrary } from '../components/ProjectLibrary';
import { projectsApi } from '../api/projects';
import { useAuth } from '../stores/auth';
import { useTasks } from '../hooks/useTasks';
import { useKanban } from '../hooks/useKanban';
import { useTaskView } from '../hooks/useTaskView';
import { useWebSocket } from '../hooks/useWebSocket';
import type {
  Project,
  Task,
  TaskStatus,
  CreateTaskRequest,
  UpdateTaskRequest,
  WebSocketMessage,
} from '../types';

export const ProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Subprojects State
  const [subprojects, setSubprojects] = useState<Project[]>([]);
  const [subprojectsLoading, setSubprojectsLoading] = useState(false);
  const [isSubprojectModalOpen, setIsSubprojectModalOpen] = useState(false);

  // Modals State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalDefaultStatus, setModalDefaultStatus] = useState<TaskStatus>('TODO');
  const [actionError, setActionError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  // Task & View Hooks
  const { viewMode, setViewMode } = useTaskView('kanban');

  // Reset viewMode to 'kanban' whenever navigating between projects
  useEffect(() => {
    setViewMode('kanban');
  }, [projectId, setViewMode]);

  // Ensure sub-projects never remain in 'subprojects' view
  useEffect(() => {
    if (project?.isSubproject && viewMode === 'subprojects') {
      setViewMode('kanban');
    }
  }, [project?.isSubproject, viewMode, setViewMode]);

  const tasksState = useTasks({ projectId, initialSize: 10 });
  const kanbanState = useKanban(projectId);

  // Refs to allow WebSocket message handler to access current modal state
  const selectedTaskRef = useRef<Task | null>(selectedTask);
  useEffect(() => {
    selectedTaskRef.current = selectedTask;
  }, [selectedTask]);

  const isTaskModalOpenRef = useRef<boolean>(isTaskModalOpen);
  useEffect(() => {
    isTaskModalOpenRef.current = isTaskModalOpen;
  }, [isTaskModalOpen]);

  const {
    patchTaskCreated: patchTaskCreatedList,
    patchTaskUpdated: patchTaskUpdatedList,
    patchTaskDeleted: patchTaskDeletedList,
    loadTasks,
  } = tasksState;

  const {
    patchTaskCreated: patchTaskCreatedKanban,
    patchTaskUpdated: patchTaskUpdatedKanban,
    patchTaskDeleted: patchTaskDeletedKanban,
    loadKanban,
  } = kanbanState;

  // Real-time WebSocket connection
  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'TASK_CREATED': {
          if (message.payload?.task) {
            const task = message.payload.task as Task;
            patchTaskCreatedList(task);
            patchTaskCreatedKanban(task);
          }
          break;
        }
        case 'TASK_UPDATED': {
          if (message.payload?.task) {
            const task = message.payload.task as Task;
            patchTaskUpdatedList(task);
            patchTaskUpdatedKanban(task);

            if (selectedTaskRef.current && selectedTaskRef.current.id === task.id) {
              setSelectedTask(task);
              if (isTaskModalOpenRef.current) {
                setActionError('Notice: This task was modified by another user.');
              }
            }
          }
          break;
        }
        case 'TASK_DELETED': {
          const taskId = message.taskId;
          patchTaskDeletedList(taskId);
          patchTaskDeletedKanban(taskId);

          if (selectedTaskRef.current && selectedTaskRef.current.id === taskId) {
            setIsTaskModalOpen(false);
            setIsDetailModalOpen(false);
            setSelectedTask(null);
            setActionError('Notice: The task you were viewing was deleted by another user.');
          }
          break;
        }
        default:
          break;
      }
    },
    [
      patchTaskCreatedList,
      patchTaskCreatedKanban,
      patchTaskUpdatedList,
      patchTaskUpdatedKanban,
      patchTaskDeletedList,
      patchTaskDeletedKanban,
    ]
  );

  const handleWebSocketReconnect = useCallback(() => {
    loadTasks();
    loadKanban();
  }, [loadTasks, loadKanban]);

  const { isConnected, status: wsStatus, lastMessage, reconnect: wsReconnect } = useWebSocket({
    projectId: projectId || null,
    onMessage: handleWebSocketMessage,
    onReconnect: handleWebSocketReconnect,
  });

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    try {
      setProjectLoading(true);
      setProjectError(null);
      const data = await projectsApi.fetchProject(projectId);
      setProject(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setProjectError(err.message);
      } else {
        setProjectError('Failed to load project');
      }
    } finally {
      setProjectLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let isMounted = true;

    projectsApi
      .fetchProject(projectId)
      .then((data) => {
        if (isMounted) {
          setProject(data);
          setProjectError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setProjectError(err instanceof Error ? err.message : 'Failed to load project');
        }
      })
      .finally(() => {
        if (isMounted) {
          setProjectLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const loadSubprojects = useCallback(async () => {
    if (!projectId) return;
    try {
      setSubprojectsLoading(true);
      const data = await projectsApi.fetchSubprojects(projectId);
      setSubprojects(data);
    } catch (err) {
      console.error('Failed to load subprojects', err);
    } finally {
      setSubprojectsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (project && !project.isSubproject) {
      loadSubprojects();
    }
  }, [project, loadSubprojects]);

  const handleSubprojectCreated = (newSub: Project) => {
    setSubprojects((prev) => [newSub, ...prev]);
    setProject((prev) => (prev ? { ...prev, subprojectCount: (prev.subprojectCount || 0) + 1 } : prev));
  };

  // Modal handlers
  const handleOpenCreateTask = (status: TaskStatus = 'TODO') => {
    setSelectedTask(null);
    setModalDefaultStatus(status);
    setActionError(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setSelectedTask(task);
    setModalDefaultStatus(task.status);
    setActionError(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenDetailTask = (task: Task) => {
    setSelectedTask(task);
    setActionError(null);
    setIsDetailModalOpen(true);
  };

  const handleTaskSubmit = async (
    data: CreateTaskRequest | (UpdateTaskRequest & { id: number })
  ) => {
    setActionError(null);
    try {
      if ('id' in data) {
        // Edit Task
        const updated = await tasksState.updateTask(data.id, data);
        await kanbanState.loadKanban();
        // Update selected task in detail modal if open
        if (selectedTask && selectedTask.id === data.id) {
          setSelectedTask(updated);
        }
      } else {
        // Create Task
        await tasksState.createTask(data);
        await kanbanState.loadKanban();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Task submission failed';
      setActionError(msg);
      throw err;
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksState.deleteTask(taskId);
      await kanbanState.loadKanban();
      if (selectedTask && selectedTask.id === taskId) {
        setIsDetailModalOpen(false);
        setSelectedTask(null);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleKanbanMove = async (taskId: number, newStatus: TaskStatus) => {
    try {
      await kanbanState.moveTask(taskId, newStatus);
      await tasksState.loadTasks();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Move failed');
    }
  };

  const canComplete = Boolean(
    project && !project.completed && (
      isAdmin ||
      (project.isSubproject
        ? (project.leadId === user?.id || project.parentProjectCreatedBy === user?.id || project.createdBy === user?.id)
        : project.createdBy === user?.id)
    )
  );

  const canReopen = Boolean(
    project && project.completed && (
      isAdmin ||
      (project.isSubproject
        ? project.parentProjectCreatedBy === user?.id
        : project.createdBy === user?.id)
    )
  );

  const handleCompleteProject = async () => {
    if (!project) return;
    if (!window.confirm(`Are you sure you want to mark "${project.name}" as completed? All tasks and child sub-projects must be finished.`)) {
      return;
    }
    setCompleting(true);
    setActionError(null);
    try {
      const updated = await projectsApi.completeProject(project.id);
      setProject(updated);
      await Promise.all([tasksState.loadTasks(), kanbanState.loadKanban()]);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error || (err instanceof Error ? err.message : 'Failed to mark project as completed');
      setActionError(msg);
    } finally {
      setCompleting(false);
    }
  };

  const handleReopenProject = async () => {
    if (!project) return;
    if (!window.confirm(`Reopen "${project.name}" and restore read-write capability?`)) {
      return;
    }
    setReopening(true);
    setActionError(null);
    try {
      const updated = await projectsApi.reopenProject(project.id);
      setProject(updated);
      await Promise.all([tasksState.loadTasks(), kanbanState.loadKanban()]);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error || (err instanceof Error ? err.message : 'Failed to reopen project');
      setActionError(msg);
    } finally {
      setReopening(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
        <div className="w-32 h-4 bg-slate-800 rounded"></div>
        <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl"></div>
        <div className="h-96 bg-slate-900/50 border border-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="max-w-md mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Project Not Available</h2>
          <p className="text-sm text-slate-400 mb-6">{projectError || 'Project not found.'}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={loadProject}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const members = project.memberSummaries || project.members || [];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb navigation */}
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
          <Link to="/projects" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Projects</span>
          </Link>
          {project.isSubproject && project.parentProjectId && (
            <>
              <span className="text-slate-600">/</span>
              <Link
                to={`/projects/${project.parentProjectId}`}
                className="hover:text-emerald-400 transition-colors font-medium text-slate-300"
              >
                {project.parentProjectName || project.parentProjectKey}
              </Link>
            </>
          )}
          <span className="text-slate-600">/</span>
          <span className="text-slate-200 font-medium">{project.name}</span>
        </div>

        {/* Action Error Alert */}
        {actionError && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-400 hover:text-rose-200 text-xs font-semibold px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Completed Project Snapshot Banner */}
        {project.completed && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-emerald-950/20">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Project Completed</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    View-Only Snapshot
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Marked as completed by <strong className="text-slate-200">{project.completedByName || 'Lead'}</strong>
                  {project.completedAt ? ` on ${new Date(project.completedAt).toLocaleDateString()}` : ''}.
                  Tasks, comments, and members are frozen. Existing attachments can still be downloaded.
                </p>
              </div>
            </div>

            {canReopen && (
              <button
                type="button"
                onClick={handleReopenProject}
                disabled={reopening}
                className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all"
              >
                {reopening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Reopen Project</span>
              </button>
            )}
          </div>
        )}

        {/* Blocked Sub-project Prerequisite Milestone Pending Banner */}
        {project.isBlocked && !project.completed && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/25 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-amber-950/20">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Prerequisite Milestone Pending</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Execution Locked
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Task creation and task status changes are locked until prerequisite sub-project(s){' '}
                  <strong className="text-amber-300 font-semibold">
                    {project.blockingPrerequisiteNames && project.blockingPrerequisiteNames.length > 0
                      ? project.blockingPrerequisiteNames.join(', ')
                      : 'prerequisites'}
                  </strong>{' '}
                  are completed. Member management, direct library uploads, and file forwarding remain active.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Project Header Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 mb-6 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {project.projectKey}
                </span>

                {project.completed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </span>
                )}

                {project.isSubproject && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Sub-project of {project.parentProjectKey || project.parentProjectName}</span>
                  </span>
                )}

                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                <button
                  type="button"
                  title={
                    isConnected
                      ? 'Live real-time updates active'
                      : wsStatus === 'CONNECTING'
                      ? 'Connecting to real-time server...'
                      : 'Real-time updates disconnected. Click to reconnect.'
                  }
                  onClick={() => {
                    if (!isConnected) wsReconnect();
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : wsStatus === 'CONNECTING'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected
                        ? 'bg-emerald-400 animate-pulse'
                        : wsStatus === 'CONNECTING'
                        ? 'bg-amber-400'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span>{isConnected ? 'Live' : wsStatus === 'CONNECTING' ? 'Connecting...' : 'Offline'}</span>
                </button>
              </div>

              <p className="text-sm text-slate-400 max-w-2xl">
                {project.description || 'No description provided for this project.'}
              </p>

              {project.leadName && (
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                  <span>{project.isSubproject ? 'Sub-project Lead: ' : 'Project Lead: '}</span>
                  <span className="text-slate-200 font-semibold">{project.leadName}</span>
                  {project.pendingLeadName && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[10px] font-semibold">
                      Pending Invite: @{project.pendingLeadName}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!project.completed && (
                <button
                  type="button"
                  id="new-task-btn"
                  onClick={() => handleOpenCreateTask('TODO')}
                  disabled={project.isBlocked}
                  title={project.isBlocked ? 'Task creation is locked until prerequisite sub-projects are completed' : undefined}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
                    project.isBlocked
                      ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 shadow-md shadow-emerald-500/20'
                  } transition-all`}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>New Task</span>
                </button>
              )}

              {canComplete && (
                <button
                  type="button"
                  onClick={handleCompleteProject}
                  disabled={completing || project.isBlocked}
                  title={project.isBlocked ? `Cannot complete: prerequisite sub-projects are incomplete (${project.blockingPrerequisiteNames?.join(', ') || ''})` : undefined}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold ${
                    project.isBlocked
                      ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 active:scale-95'
                  } transition-all`}
                >
                  {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Mark as Completed</span>
                </button>
              )}

              {canReopen && (
                <button
                  type="button"
                  onClick={handleReopenProject}
                  disabled={reopening}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all"
                >
                  {reopening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Reopen Project</span>
                </button>
              )}

              {(isAdmin || project.createdBy === user?.id || project.leadId === user?.id || (project.isSubproject && project.parentProjectCreatedBy === user?.id)) && (
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${project.id}/settings`)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Project Settings</span>
                </button>
              )}
            </div>
          </div>

          {/* Members Bar */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-300">
                {project.isSubproject ? 'Direct Members' : 'Team Members'} ({members.length}):
              </span>
              <div className="flex items-center -space-x-1.5 ml-1">
                {members.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    title={`${m.fullName} (${m.username})`}
                    className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-emerald-400 flex items-center justify-center font-bold"
                  >
                    {m.fullName?.charAt(0) || m.username.charAt(0)}
                  </div>
                ))}
                {members.length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-400 flex items-center justify-center font-medium">
                    +{members.length - 5}
                  </div>
                )}
              </div>

              {project.isSubproject && project.inheritedMemberSummaries && project.inheritedMemberSummaries.length > 0 && (
                <span className="ml-2 text-[11px] text-slate-500">
                  (+{project.inheritedMemberSummaries.length} inherited from parent)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-slate-500 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Created by <strong className="text-slate-300 font-medium">{project.createdByName || 'Unknown'}</strong> • {new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
              {project.completed && project.completedByName && (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Done by {project.completedByName}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* View Mode Toggle Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Task List</span>
            </button>

            {!project.isSubproject && (
              <button
                type="button"
                onClick={() => setViewMode('subprojects')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'subprojects'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Sub-projects</span>
                {subprojects.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-emerald-400 font-bold border border-slate-700">
                    {subprojects.length}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode('library')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'library'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Library</span>
            </button>
          </div>
        </div>

        {/* View Content */}
        {viewMode === 'library' ? (
          <ProjectLibrary
            projectId={projectId}
            project={project}
            isCompleted={project.completed}
            lastWsMessage={lastMessage}
          />
        ) : viewMode === 'subprojects' && !project.isSubproject ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-emerald-400" />
                  <span>Sub-projects ({subprojects.length})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scoped child workspaces with separate task boards. Members of this parent project automatically inherit member access.
                </p>
              </div>

              {(isAdmin || project.createdBy === user?.id || project.leadId === user?.id) && !project.completed && (
                <button
                  type="button"
                  onClick={() => setIsSubprojectModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Sub-project</span>
                </button>
              )}
            </div>

            {subprojectsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 bg-slate-900/60 border border-slate-800 rounded-2xl p-5" />
                ))}
              </div>
            ) : subprojects.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                <FolderKanban className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h3 className="text-base font-semibold text-white">No sub-projects created yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Divide this parent project into dedicated workstreams for different modules, platforms, or teams.
                </p>
                {(isAdmin || project.createdBy === user?.id || project.leadId === user?.id) && (
                  <button
                    type="button"
                    onClick={() => setIsSubprojectModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Create Sub-project</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subprojects.map((sub) => {
                  const mCount = sub.memberSummaries?.length ?? sub.members?.length ?? 1;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => navigate(`/projects/${sub.id}`)}
                      className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                              {sub.projectKey}
                            </span>
                            {sub.completed ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed</span>
                              </span>
                            ) : sub.isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3" />
                                <span>Blocked</span>
                              </span>
                            ) : sub.dependencyType === 'START_AFTER' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Prerequisites Met</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                Independent
                              </span>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                          {sub.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {sub.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>Lead: <strong className="text-slate-200">{sub.leadName || 'Unassigned'}</strong></span>
                            {sub.pendingLeadName && (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[10px] font-semibold">
                                Pending: @{sub.pendingLeadName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-500" />
                            <span>{mCount} direct</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 border-t border-slate-800/40 pt-2 flex items-center justify-between">
                          <span>Created by <span className="text-slate-300 font-medium">{sub.createdByName || 'Unknown'}</span></span>
                          {sub.completed && sub.completedByName && (
                            <span className="text-[10px] text-emerald-400/80">Done by {sub.completedByName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : viewMode === 'kanban' ? (
          <div>
            <KanbanBoard
              board={kanbanState.board}
              projectKey={project.projectKey}
              isCompleted={project.completed || project.isBlocked}
              onMoveTask={handleKanbanMove}
              onAddTask={handleOpenCreateTask}
              onEditTask={handleOpenDetailTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        ) : (
          <div>
            <TaskFilter
              status={tasksState.statusFilter}
              onStatusChange={tasksState.setStatusFilter}
              assigneeId={tasksState.assigneeFilter}
              onAssigneeChange={tasksState.setAssigneeFilter}
              searchQuery={tasksState.searchQuery}
              onSearchChange={tasksState.setSearchQuery}
              members={members}
              onReset={() => {
                tasksState.setStatusFilter(undefined);
                tasksState.setAssigneeFilter(undefined);
                tasksState.setSearchQuery('');
              }}
            />

            <TaskList
              tasks={tasksState.tasks}
              total={tasksState.total}
              page={tasksState.page}
              size={tasksState.size}
              totalPages={tasksState.totalPages}
              loading={tasksState.loading}
              projectKey={project.projectKey}
              onPageChange={tasksState.setPage}
              onEditTask={handleOpenDetailTask}
              onDeleteTask={project.completed ? undefined : handleDeleteTask}
            />
          </div>
        )}

      {/* Task Details, Comments, and Attachments Modal */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        projectKey={project.projectKey}
        onEditTask={handleOpenEditTask}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        isCompleted={project.completed}
        lastWsMessage={lastMessage}
      />

      {/* Task Creation & Edit Modal */}
      <TaskForm
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSubmit={handleTaskSubmit}
        initialTask={selectedTask}
        initialStatus={modalDefaultStatus}
        members={members}
        isBlocked={project.isBlocked}
      />

      {/* Sub-project Creation Modal */}
      {project && (
        <CreateProjectModal
          isOpen={isSubprojectModalOpen}
          onClose={() => setIsSubprojectModalOpen(false)}
          onCreated={handleSubprojectCreated}
          parentProject={project}
        />
      )}
    </div>
  );
};

export default ProjectPage;

