import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Loader2, GitBranch, UserCheck, Link2, CheckCircle2, Clock } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { usersApi } from '../api/users';
import { useAuth } from '../stores/auth';
import type { Project, User } from '../types';

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
  parentProject?: Project | null;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  parentProject,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState<number | ''>('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [existingSubprojects, setExistingSubprojects] = useState<Project[]>([]);
  const [dependencyType, setDependencyType] = useState<'NO_DEPENDENCY' | 'START_AFTER'>('NO_DEPENDENCY');
  const [selectedPrereqIds, setSelectedPrereqIds] = useState<number[]>([]);
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (parentProject) {
        // Load users for designating lead
        usersApi
          .fetchUsers()
          .then((users) => {
            const active = users.filter((u) => u.active);
            setAvailableUsers(active);
            if (user?.id) {
              setLeadId(user.id);
            } else if (active.length > 0) {
              setLeadId(active[0].id);
            }
          })
          .catch(() => {});

        // Fetch sibling sub-projects for dependencies
        projectsApi
          .fetchSubprojects(parentProject.id)
          .then((subs) => {
            setExistingSubprojects(subs.filter((s) => !s.archived));
          })
          .catch(() => {});
      } else {
        setLeadId('');
        setExistingSubprojects([]);
        setDependencyType('NO_DEPENDENCY');
        setSelectedPrereqIds([]);
      }
    }
  }, [isOpen, parentProject, user]);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!keyManuallyEdited) {
      const words = val.trim().split(/\s+/).filter(Boolean);
      let suggestedKey = '';
      if (parentProject) {
        const subSuffix = words.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
        suggestedKey = `${parentProject.projectKey}-${subSuffix}`.slice(0, 10);
      } else {
        suggestedKey = words.map((w) => w[0]).join('').toUpperCase().slice(0, 10);
      }
      setProjectKey(suggestedKey);
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyManuallyEdited(true);
    setProjectKey(e.target.value.toUpperCase().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedKey = projectKey.trim().toUpperCase();

    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }

    if (!trimmedKey || trimmedKey.length < 2) {
      setError('Project key must be at least 2 characters.');
      return;
    }

    if (parentProject && dependencyType === 'START_AFTER' && selectedPrereqIds.length === 0) {
      setError('Please select at least one prerequisite sub-project for Start After dependency.');
      return;
    }

    try {
      setLoading(true);
      const created = await projectsApi.createProject({
        name: trimmedName,
        projectKey: trimmedKey,
        description: description.trim() || undefined,
        parentProjectId: parentProject ? parentProject.id : undefined,
        leadId: parentProject && leadId ? Number(leadId) : undefined,
        dependencyType: parentProject ? dependencyType : undefined,
        prerequisiteIds: parentProject && dependencyType === 'START_AFTER' ? selectedPrereqIds : undefined,
      });
      onCreated(created);
      onClose();
      // Reset form
      setName('');
      setProjectKey('');
      setDescription('');
      setLeadId('');
      setDependencyType('NO_DEPENDENCY');
      setSelectedPrereqIds([]);
      setKeyManuallyEdited(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create project');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              {parentProject ? (
                <GitBranch className="w-5 h-5 text-emerald-400" />
              ) : (
                <FolderPlus className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-white leading-tight">
                {parentProject ? 'Create Sub-project' : 'Create New Project'}
              </h2>
              {parentProject && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Parent: {parentProject.name} ({parentProject.projectKey})
                </span>
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
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="projectName" className="block text-xs font-medium text-slate-300 mb-1.5">
              {parentProject ? 'Sub-project Name' : 'Project Name'} <span className="text-rose-400">*</span>
            </label>
            <input
              id="projectName"
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              placeholder={parentProject ? 'e.g. Frontend Track' : 'e.g. Core Platform Redesign'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
            />
          </div>

          <div>
            <label htmlFor="projectKey" className="block text-xs font-medium text-slate-300 mb-1.5">
              Project Key <span className="text-rose-400">*</span>
            </label>
            <input
              id="projectKey"
              type="text"
              required
              maxLength={10}
              value={projectKey}
              onChange={handleKeyChange}
              placeholder={parentProject ? `e.g. ${parentProject.projectKey}-FE` : 'e.g. CPR'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-mono uppercase tracking-wider transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Prefix for tasks (2–10 uppercase letters/hyphens).
            </p>
          </div>

          {/* Sub-project Lead Selector */}
          {parentProject && (() => {
            const parentMemberIds = new Set([
              ...(parentProject.memberSummaries?.map((m) => m.id) || []),
              ...(parentProject.members?.map((m) => m.id) || []),
              ...(parentProject.createdBy ? [parentProject.createdBy] : []),
              ...(parentProject.leadId ? [parentProject.leadId] : []),
            ]);
            const isSelectedNonMember = leadId && !parentMemberIds.has(Number(leadId));

            return (
              <div>
                <label htmlFor="leadSelector" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Designate Sub-project Lead</span>
                </label>
                <select
                  id="leadSelector"
                  value={leadId}
                  onChange={(e) => setLeadId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                >
                  {availableUsers.map((u: User) => {
                    const isParentMember = parentMemberIds.has(u.id);
                    const isYou = u.id === user?.id;
                    const suffix = isYou
                      ? '— You'
                      : isParentMember
                      ? '• (Parent Member - Direct)'
                      : '• (Invite as Lead)';

                    return (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.username} (@{u.username}) {suffix}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] mt-1.5 leading-relaxed">
                  {isSelectedNonMember ? (
                    <span className="text-amber-400 font-medium">
                      Note: Selected user is not currently in the parent project. Creating this sub-project will send them an invitation; they will become lead upon acceptance.
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      The designated lead will manage this sub-project&apos;s settings, tasks, and member invitations.
                    </span>
                  )}
                </p>
              </div>
            );
          })()}

          {/* Sub-project Dependencies */}
          {parentProject && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Execution Workflow / Dependencies</span>
              </label>

              {existingSubprojects.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>First sub-project runs independently (No Dependency).</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={dependencyType}
                    onChange={(e) => {
                      const val = e.target.value as 'NO_DEPENDENCY' | 'START_AFTER';
                      setDependencyType(val);
                      if (val === 'NO_DEPENDENCY') {
                        setSelectedPrereqIds([]);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                  >
                    <option value="NO_DEPENDENCY">No Dependency (Agile / Concurrent)</option>
                    <option value="START_AFTER">Start After (Plan-Driven / Phase-Gated)</option>
                  </select>

                  {dependencyType === 'START_AFTER' && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Select prerequisite sub-project(s) that must complete before this track can begin:
                      </span>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {existingSubprojects.map((sub: Project) => {
                          const isSelected = selectedPrereqIds.includes(sub.id);
                          return (
                            <label
                              key={sub.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                                  : 'border-slate-800/80 bg-slate-900/40 text-slate-300 hover:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPrereqIds([...selectedPrereqIds, sub.id]);
                                    } else {
                                      setSelectedPrereqIds(selectedPrereqIds.filter((id: number) => id !== sub.id));
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
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="projectDesc" className="block text-xs font-medium text-slate-300 mb-1.5">
              Description <span className="text-slate-500">(Optional)</span>
            </label>
            <textarea
              id="projectDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the goals..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-500/20"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Creating...' : parentProject ? 'Create Sub-project' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
