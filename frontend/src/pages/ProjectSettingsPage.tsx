import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ShieldAlert,
  Users,
  Trash2,
  Save,
  Archive,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  X,
  Mail,
  UserCheck,
  RefreshCw,
  Link2,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { usersApi } from '../api/users';
import { invitationsApi } from '../api/invitations';
import { useAuth } from '../stores/auth';
import type { Project, User, ProjectInvitation } from '../types';

export const ProjectSettingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');

  // Sub-project Lead Reassignment State
  const [selectedNewLeadId, setSelectedNewLeadId] = useState<number | ''>('');
  const [changingLead, setChangingLead] = useState(false);
  const [leadChangeMsg, setLeadChangeMsg] = useState<string | null>(null);

  // Sub-project Dependencies State
  const [siblingSubprojects, setSiblingSubprojects] = useState<Project[]>([]);
  const [depType, setDepType] = useState<'NO_DEPENDENCY' | 'START_AFTER'>('NO_DEPENDENCY');
  const [selectedPrereqs, setSelectedPrereqs] = useState<number[]>([]);
  const [savingDeps, setSavingDeps] = useState(false);
  const [depSuccessMsg, setDepSuccessMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);
  const [cancelingInviteId, setCancelingInviteId] = useState<number | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [completionMsg, setCompletionMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const proj = await projectsApi.fetchProject(Number(id));
      setProject(proj);
      setName(proj.name);
      setDescription(proj.description || '');

      const canManageProj = isAdmin || proj.createdBy === user?.id || proj.leadId === user?.id || Boolean(proj.isSubproject && proj.parentProjectCreatedBy === user?.id);
      if (canManageProj) {
        try {
          const [usersList, invitesList] = await Promise.all([
            usersApi.fetchUsers(),
            invitationsApi.getProjectInvitations(proj.id),
          ]);
          setAllUsers(usersList);
          setInvitations(invitesList);
        } catch {
          // Gracefully handle optional sub-queries
        }
      }

      if (proj.isSubproject && proj.parentProjectId) {
        try {
          const subs = await projectsApi.fetchSubprojects(proj.parentProjectId);
          setSiblingSubprojects(subs.filter((s) => s.id !== proj.id && !s.archived));
        } catch {
          // Ignore
        }
        setDepType((proj.dependencyType as 'NO_DEPENDENCY' | 'START_AFTER') || 'NO_DEPENDENCY');
        setSelectedPrereqs(proj.prerequisiteIds || []);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load project details');
      }
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canManage = isAdmin || (project !== null && (project.createdBy === user?.id || project.leadId === user?.id || Boolean(project.isSubproject && project.parentProjectCreatedBy === user?.id)));

  if (loading) {
    return (
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-20 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-xs text-slate-400 mb-6">
            Only the project lead or system administrators can modify project settings or manage membership.
          </p>
          <Link
            to={id ? `/projects/${id}` : '/projects'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Project</span>
          </Link>
        </div>
      </div>
    );
  }

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    try {
      setSavingGeneral(true);
      setError(null);
      const updated = await projectsApi.updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setProject(updated);
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update project settings');
      }
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSendInvite = async () => {
    if (!project || !selectedUserId) return;
    try {
      setInvitingMember(true);
      setError(null);
      await invitationsApi.createInvitation(project.id, Number(selectedUserId));
      const updatedInvites = await invitationsApi.getProjectInvitations(project.id);
      setInvitations(updatedInvites);
      setSelectedUserId('');
      setInviteSuccessMsg('Invitation sent! The user can accept it via their notification bell.');
      setTimeout(() => setInviteSuccessMsg(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send project invitation');
      }
    } finally {
      setInvitingMember(false);
    }
  };

  const handleCancelInvite = async (invitationId: number) => {
    if (!project) return;
    try {
      setCancelingInviteId(invitationId);
      setError(null);
      await invitationsApi.cancelInvitation(project.id, invitationId);
      const updatedInvites = await invitationsApi.getProjectInvitations(project.id);
      setInvitations(updatedInvites);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to cancel invitation');
      }
    } finally {
      setCancelingInviteId(null);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!project) return;
    if (!window.confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }
    try {
      setError(null);
      const updated = await projectsApi.removeMember(project.id, userId);
      setProject(updated);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to remove member');
      }
    }
  };

  const handleChangeSubprojectLead = async () => {
    if (!project || !selectedNewLeadId) return;
    try {
      setChangingLead(true);
      setError(null);
      const updated = await projectsApi.updateProject(project.id, {
        leadId: Number(selectedNewLeadId),
      });
      setProject(updated);
      setSelectedNewLeadId('');
      if (updated.pendingLeadId) {
        setLeadChangeMsg(
          `Lead invitation sent to @${updated.pendingLeadName || 'user'}. They will become lead upon acceptance.`
        );
      } else {
        setLeadChangeMsg(`Sub-project lead changed to ${updated.leadName || 'new lead'} successfully!`);
      }
      setTimeout(() => setLeadChangeMsg(null), 4000);
      try {
        const updatedInvites = await invitationsApi.getProjectInvitations(project.id);
        setInvitations(updatedInvites);
      } catch {
        // Optional
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to change sub-project lead');
      }
    } finally {
      setChangingLead(false);
    }
  };

  const canModifyDependencies = Boolean(
    isAdmin || (project?.isSubproject && project.parentProjectCreatedBy === user?.id)
  );

  const handleSaveDependencies = async () => {
    if (!project) return;
    if (depType === 'START_AFTER' && selectedPrereqs.length === 0) {
      setError('Please select at least one prerequisite sub-project for Start After dependency.');
      return;
    }
    try {
      setSavingDeps(true);
      setError(null);
      const updated = await projectsApi.updateProject(project.id, {
        dependencyType: depType,
        prerequisiteIds: depType === 'START_AFTER' ? selectedPrereqs : [],
      });
      setProject(updated);
      setDepType((updated.dependencyType as 'NO_DEPENDENCY' | 'START_AFTER') || 'NO_DEPENDENCY');
      setSelectedPrereqs(updated.prerequisiteIds || []);
      setDepSuccessMsg('Sub-project dependencies updated successfully!');
      setTimeout(() => setDepSuccessMsg(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update sub-project dependencies');
      }
    } finally {
      setSavingDeps(false);
    }
  };

  const handleRemoveAllDependencies = async () => {
    if (!project) return;
    if (!window.confirm('Remove all dependencies for this sub-project? It will run independently (No Dependency).')) {
      return;
    }
    try {
      setSavingDeps(true);
      setError(null);
      const updated = await projectsApi.updateProject(project.id, {
        dependencyType: 'NO_DEPENDENCY',
        prerequisiteIds: [],
      });
      setProject(updated);
      setDepType('NO_DEPENDENCY');
      setSelectedPrereqs([]);
      setDepSuccessMsg('All dependencies removed. Sub-project now runs independently!');
      setTimeout(() => setDepSuccessMsg(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to remove dependencies');
      }
    } finally {
      setSavingDeps(false);
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
    if (!window.confirm(`Are you sure you want to mark "${project.name}" as completed? All tasks in this project and all child sub-projects must be finished.`)) {
      return;
    }
    setCompleting(true);
    setError(null);
    try {
      const updated = await projectsApi.completeProject(project.id);
      setProject(updated);
      setCompletionMsg('Project marked as completed successfully! It is now in view-only snapshot mode.');
      setTimeout(() => setCompletionMsg(null), 5000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error || (err instanceof Error ? err.message : 'Failed to mark project as completed');
      setError(msg);
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
    setError(null);
    try {
      const updated = await projectsApi.reopenProject(project.id);
      setProject(updated);
      setCompletionMsg('Project reopened successfully! Full edit and management capability restored.');
      setTimeout(() => setCompletionMsg(null), 5000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error || (err instanceof Error ? err.message : 'Failed to reopen project');
      setError(msg);
    } finally {
      setReopening(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!project) return;
    if (project.completed) {
      setError('Cannot archive a completed project. Please reopen it first if needed.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to archive "${project.name}"? Active tasks will no longer be visible.`
    );
    if (!confirmed) return;

    try {
      setArchiving(true);
      setError(null);
      await projectsApi.archiveProject(project.id);
      navigate('/projects');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to archive project');
      }
      setArchiving(false);
    }
  };

  const currentMembers = project?.memberSummaries || project?.members || [];
  const inheritedMembers = project?.inheritedMemberSummaries || [];
  const memberIds = new Set([
    ...currentMembers.map((m) => m.id),
    ...inheritedMembers.map((m) => m.id),
  ]);
  const pendingInvitedUserIds = new Set(
    invitations.filter((i) => i.status === 'PENDING').map((i) => i.invitedUserId)
  );
  const availableUsers = allUsers.filter(
    (u) => u.active && !memberIds.has(u.id) && !pendingInvitedUserIds.has(u.id)
  );

  const pendingInvitations = invitations.filter((i) => i.status === 'PENDING');

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-400">
          <Link to="/projects" className="hover:text-emerald-400 transition-colors">
            Projects
          </Link>
          {project?.isSubproject && project.parentProjectId && (
            <>
              <span className="text-slate-600">/</span>
              <Link
                to={`/projects/${project.parentProjectId}`}
                className="hover:text-emerald-400 transition-colors font-mono"
              >
                {project.parentProjectKey || 'Parent Project'}
              </Link>
            </>
          )}
          <span className="text-slate-600">/</span>
          {project && (
            <>
              <Link to={`/projects/${project.id}`} className="hover:text-emerald-400 transition-colors">
                {project.name}
              </Link>
              <span className="text-slate-600">/</span>
            </>
          )}
          <span className="text-slate-200 font-medium">Settings</span>
        </div>

        {/* Page Title */}
        <div className="mb-8 pb-4 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white">Project Settings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure project details, member invitations, and archive status.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {generalSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Project details updated successfully!</span>
          </div>
        )}

        {inviteSuccessMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{inviteSuccessMsg}</span>
          </div>
        )}

        {completionMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{completionMsg}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* General Settings */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">General Information</h2>
              {project?.completed && (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Locked (Completed)
                </span>
              )}
            </div>

            {project?.completed && (
              <div className="mb-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
                This project is marked as completed and is in view-only snapshot mode. To modify details, reopen the project below.
              </div>
            )}

            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div>
                <label htmlFor="editProjectName" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Project Name
                </label>
                <input
                  id="editProjectName"
                  type="text"
                  required
                  disabled={project?.completed}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50 text-sm transition-all"
                />
              </div>

              <div>
                <label htmlFor="editProjectDesc" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  id="editProjectDesc"
                  rows={3}
                  disabled={project?.completed}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50 text-sm transition-all resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingGeneral || project?.completed}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
                >
                  {savingGeneral ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savingGeneral ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sub-project Lead Management (Only for Sub-projects, accessible to Creator / Admin) */}
          {project?.isSubproject && (isAdmin || project.createdBy === user?.id) && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Sub-project Lead Management</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    As the project creator, you can change the designated Sub-project Lead.
                  </p>
                </div>
              </div>

              {leadChangeMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{leadChangeMsg}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3">
                <div className="text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
                  <span>Current Active Lead: <strong className="text-white">{project.leadName || 'Unassigned'}</strong></span>
                  {project.pendingLeadName && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[10px] font-semibold">
                      Pending Acceptance: @{project.pendingLeadName}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <select
                    value={selectedNewLeadId}
                    disabled={project?.completed}
                    onChange={(e) => setSelectedNewLeadId(e.target.value ? Number(e.target.value) : '')}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    <option value="">Select a user to assign as Sub-project Lead...</option>
                    {allUsers.filter((u) => u.active && u.id !== project.leadId).map((u) => {
                      const isParentMember = project.inheritedMemberSummaries?.some((im) => im.id === u.id);
                      return (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.username} (@{u.username}) {isParentMember ? '• (Parent Member - Direct)' : '• (Invite as Lead)'}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={handleChangeSubprojectLead}
                    disabled={!selectedNewLeadId || changingLead || project?.completed}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-all shadow-sm shadow-emerald-500/20"
                  >
                    {changingLead ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Update / Invite Lead</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-project Dependencies Management */}
          {project?.isSubproject && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-emerald-400" />
                    <span>Sub-project Dependencies</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure prerequisite sub-projects. When set to &ldquo;Start After&rdquo;, tasks and completion remain locked until all prerequisite sub-projects are marked as completed.
                  </p>
                </div>
                {project.isBlocked ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Blocked by Prerequisites</span>
                  </span>
                ) : project.dependencyType === 'START_AFTER' ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Prerequisites Met</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                    Independent (Parallel)
                  </span>
                )}
              </div>

              {depSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{depSuccessMsg}</span>
                </div>
              )}

              {canModifyDependencies ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3">
                    <label className="block text-xs font-medium text-slate-300">
                      Execution Workflow Mode
                    </label>
                    <select
                      value={depType}
                      disabled={savingDeps || project?.completed}
                      onChange={(e) => {
                        const val = e.target.value as 'NO_DEPENDENCY' | 'START_AFTER';
                        setDepType(val);
                        if (val === 'NO_DEPENDENCY') {
                          setSelectedPrereqs([]);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      <option value="NO_DEPENDENCY">No Dependency (Agile / Concurrent)</option>
                      <option value="START_AFTER">Start After (Plan-Driven / Phase-Gated)</option>
                    </select>

                    {depType === 'START_AFTER' && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <span className="text-[11px] text-slate-400 font-medium block">
                          Select prerequisite sub-projects under this workspace:
                        </span>
                        {siblingSubprojects.length === 0 ? (
                          <div className="p-3 rounded-lg bg-slate-900/60 text-slate-500 text-xs text-center">
                            No other sibling sub-projects available to depend on.
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {siblingSubprojects.map((sub) => {
                              const isSelected = selectedPrereqs.includes(sub.id);
                              return (
                                <label
                                  key={sub.id}
                                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                                      : 'border-slate-800/80 bg-slate-900/40 text-slate-300 hover:bg-slate-900'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      disabled={savingDeps || project?.completed}
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPrereqs([...selectedPrereqs, sub.id]);
                                        } else {
                                          setSelectedPrereqs(selectedPrereqs.filter((pId) => pId !== sub.id));
                                        }
                                      }}
                                      className="rounded border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                                    />
                                    <span className="font-medium">{sub.name}</span>
                                    <span className="text-[10px] font-mono text-slate-500">({sub.projectKey})</span>
                                  </div>
                                  {sub.completed ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Completed</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                                      <Clock className="w-3 h-3" />
                                      <span>In Progress</span>
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      {project.dependencyType === 'START_AFTER' && (
                        <button
                          type="button"
                          onClick={handleRemoveAllDependencies}
                          disabled={savingDeps || project?.completed}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                        >
                          Remove All Dependencies
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveDependencies}
                        disabled={savingDeps || project?.completed}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-all shadow-sm shadow-emerald-500/20"
                      >
                        {savingDeps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Dependencies</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
                    <div className="text-xs text-slate-300">
                      Workflow Mode: <strong className="text-white">{project.dependencyType === 'START_AFTER' ? 'Start After (Phase-Gated)' : 'No Dependency (Independent)'}</strong>
                    </div>
                    {project.prerequisiteNames && project.prerequisiteNames.length > 0 && (
                      <div className="text-xs text-slate-400">
                        <span>Prerequisites: </span>
                        <span className="text-slate-200 font-medium">
                          {project.prerequisiteNames.join(', ')}
                        </span>
                      </div>
                    )}
                    {project.blockingPrerequisiteNames && project.blockingPrerequisiteNames.length > 0 && (
                      <div className="text-xs text-amber-400">
                        <span>Currently Waiting For: </span>
                        <span className="font-semibold">{project.blockingPrerequisiteNames.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    Note: Only the Main Project Creator or System Administrator can modify or remove sub-project dependencies.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Member & Invitation Management */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Project Members & Invitations</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Invite users to collaborate. Once invited, users accept from their notification bell to gain access.
                </p>
              </div>
            </div>

            {/* Invite Member Bar */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl mb-6">
              <label htmlFor="select-user-invite" className="block text-xs font-medium text-slate-300 mb-2">
                Send Project Invitation
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <select
                  id="select-user-invite"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">Choose a user to invite...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username} (@{u.username}) • {u.role}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  id="send-invite-btn"
                  onClick={handleSendInvite}
                  disabled={!selectedUserId || invitingMember || project?.completed}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-all shadow-sm shadow-emerald-500/20"
                >
                  {invitingMember ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  <span>Send Invite</span>
                </button>
              </div>
              {project?.completed ? (
                <span className="block text-[11px] text-slate-500 mt-2">
                  Member invitations are disabled because this project is completed.
                </span>
              ) : availableUsers.length === 0 ? (
                <span className="block text-[11px] text-slate-500 mt-2">
                  All active users are already enrolled or have a pending invitation.
                </span>
              ) : null}
            </div>

            {/* Pending Invitations Section */}
            {pendingInvitations.length > 0 && (
              <div className="mb-6 pb-6 border-b border-slate-800/80">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pending Invitations ({pendingInvitations.length})</span>
                </h3>

                <div className="divide-y divide-slate-800/60 bg-slate-950/40 rounded-xl border border-slate-800/60 overflow-hidden">
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {inv.invitedUserFullName?.charAt(0) || inv.invitedUsername?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-200 truncate">
                            {inv.invitedUserFullName || inv.invitedUsername}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                            <span>@{inv.invitedUsername}</span>
                            <span>•</span>
                            <span className="text-amber-400/90">Expires 7d from sent</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[10px] font-semibold">
                          Pending
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCancelInvite(inv.id)}
                          disabled={cancelingInviteId === inv.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition-colors disabled:opacity-50"
                          title="Cancel invitation"
                        >
                          {cancelingInviteId === inv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span className="text-[11px]">Cancel</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active / Direct Members Section */}
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {project?.isSubproject
                    ? `Direct Members (${currentMembers.length})`
                    : `Active Members (${currentMembers.length})`}
                </span>
              </h3>

              {currentMembers.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                  No direct members enrolled yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 bg-slate-950/40 rounded-xl border border-slate-800/60 overflow-hidden">
                  {currentMembers.map((m) => {
                    const isLead = m.id === project?.leadId || m.id === project?.createdBy;

                    return (
                      <div key={m.id} className="p-3 sm:px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center">
                            {m.fullName?.charAt(0) || m.username.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <span>{m.fullName || m.username}</span>
                              {isLead && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[9px] font-semibold">
                                  {m.id === project?.leadId ? 'Lead' : 'Creator'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{m.username}
                            </div>
                          </div>
                        </div>

                        {!isLead && !project?.completed && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Inherited Members (Subprojects only) */}
            {project?.isSubproject && (
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Inherited from Parent Project ({inheritedMembers.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Access inherited via {project.parentProjectName || project.parentProjectKey || 'Parent'}
                  </span>
                </div>

                {inheritedMembers.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                    No additional parent members.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 bg-slate-950/40 rounded-xl border border-slate-800/60 overflow-hidden">
                    {inheritedMembers.map((m) => (
                      <div key={m.id} className="p-3 sm:px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold text-xs flex items-center justify-center">
                            {m.fullName?.charAt(0) || m.username.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <span>{m.fullName || m.username}</span>
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 text-[9px] font-semibold">
                                Inherited
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{m.username}
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] text-slate-500 italic">
                          Parent Project Member
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Project Completion & Snapshot Milestone */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Project Completion Status</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                  {project?.isSubproject
                    ? 'Sub-projects require all tasks to be in the DONE status before they can be marked completed. Once completed, only the parent project creator or admin can reopen it.'
                    : 'Main projects require all direct tasks to be DONE and all child sub-projects to be completed. Once completed, the workspace converts into a view-only snapshot.'}
                </p>
              </div>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                project?.completed
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {project?.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                <span>{project?.completed ? 'Completed (View-Only)' : 'In Progress (Active)'}</span>
              </span>
            </div>

            {project?.completed ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-xs text-slate-300">
                  <div>Completed by <strong className="text-white font-medium">{project.completedByName || 'Lead'}</strong>{project.completedAt ? ` on ${new Date(project.completedAt).toLocaleDateString()}` : ''}.</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tasks, comments, and members are frozen. File attachments remain accessible for download.</div>
                </div>

                {canReopen ? (
                  <button
                    type="button"
                    onClick={handleReopenProject}
                    disabled={reopening}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all shadow-sm"
                  >
                    {reopening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Reopen Project</span>
                  </button>
                ) : project?.isSubproject ? (
                  <span className="text-[11px] text-slate-500 italic max-w-xs text-right">
                    Only the parent project creator or system admin can reopen completed sub-projects.
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 pt-2">
                <span className="text-xs text-slate-400">
                  Ready to finalize this {project?.isSubproject ? 'sub-project' : 'project'}?
                </span>
                {canComplete && (
                  <button
                    type="button"
                    onClick={handleCompleteProject}
                    disabled={completing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                  >
                    {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>Mark as Completed</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Danger Zone: Archive */}
          <div className="bg-rose-950/10 border border-rose-900/30 rounded-2xl p-6">
            <h2 className="text-base font-bold text-rose-400 mb-1 flex items-center gap-2">
              <Archive className="w-4 h-4" />
              <span>Archive Project</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Archiving a project hides it from the dashboard and task boards. Data is preserved safely.
            </p>
            {project?.completed ? (
              <p className="text-xs text-slate-500 italic">
                Completed projects cannot be archived. Please reopen the project first if you wish to archive it.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleArchiveProject}
                disabled={archiving || project?.completed}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 active:scale-95 disabled:opacity-50 transition-all"
              >
                {archiving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{archiving ? 'Archiving...' : 'Archive This Project'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
  );
};

export default ProjectSettingsPage;
