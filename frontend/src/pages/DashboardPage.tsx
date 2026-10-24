import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  Calendar,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { projectsApi } from '../api/projects';
import type { Project } from '../types';

export const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.fetchProjects();
      setProjects(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load projects');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    projectsApi
      .fetchProjects()
      .then((data) => {
        if (isMounted) {
          setProjects(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load projects');
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
  }, []);

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.projectKey.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-8 border-b border-slate-800/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <FolderKanban className="w-8 h-8 text-emerald-400" />
              <span>Projects Dashboard</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Select an active workspace to track tasks, review progress, and collaborate.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="py-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name or key..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadProjects}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-rose-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 h-48 animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="w-16 h-6 rounded-md bg-slate-800 mb-3"></div>
                  <div className="w-3/4 h-5 rounded-md bg-slate-800 mb-2"></div>
                  <div className="w-full h-4 rounded-md bg-slate-800/60"></div>
                </div>
                <div className="w-1/2 h-4 rounded-md bg-slate-800/40"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProjects.length === 0 && (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">No projects found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No projects match your search query. Try another term.'
                : 'Get started by creating your first project workspace.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            )}
          </div>
        )}

        {/* Projects Grid */}
        {!loading && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const membersCount =
                project.memberSummaries?.length ?? project.members?.length ?? 1;

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wide">
                          {project.projectKey}
                        </span>
                        {project.completed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completed</span>
                          </span>
                        )}
                        {project.isSubproject ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                            <GitBranch className="w-3 h-3" />
                            <span>Sub of {project.parentProjectKey || 'Parent'}</span>
                          </span>
                        ) : project.subprojectCount && project.subprojectCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <GitBranch className="w-3 h-3" />
                            <span>
                              {project.subprojectCount}{' '}
                              {project.subprojectCount === 1 ? 'sub-project' : 'sub-projects'}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>

                    <h2 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {project.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Users className="w-3.5 h-3.5" />
                          <span>{membersCount} {membersCount === 1 ? 'member' : 'members'}</span>
                        </div>
                        {project.leadName && (
                          <div className="text-[11px] text-slate-400 hidden sm:inline">
                            Lead: <span className="text-slate-300">{project.leadName}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 border-t border-slate-800/40 pt-2 flex items-center justify-between">
                      <span>Created by <span className="text-slate-300 font-medium">{project.createdByName || 'Unknown'}</span></span>
                      {project.completed && project.completedByName && (
                        <span className="text-[10px] text-emerald-400/80">Done by {project.completedByName}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Project Creation Modal */}
        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleProjectCreated}
        />
      </div>
  );
};

export default DashboardPage;
