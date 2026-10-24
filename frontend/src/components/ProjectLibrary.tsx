import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderArchive,
  Upload,
  Download,
  Share2,
  Trash2,
  FileText,
  Image,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
  LayoutGrid,
  List as ListIcon,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  HardDrive,
  Layers,
  Sparkles,
} from 'lucide-react';
import { libraryApi } from '../api/library';
import { LibraryFilter } from './LibraryFilter';
import { ForwardAttachmentModal } from './ForwardAttachmentModal';
import { useAuth } from '../stores/auth';
import type { Attachment, Project, WebSocketMessage } from '../types';

interface ProjectLibraryProps {
  projectId: number;
  project: Project;
  isCompleted?: boolean;
  lastWsMessage?: WebSocketMessage | null;
}

export const ProjectLibrary: React.FC<ProjectLibraryProps> = ({
  projectId,
  project,
  isCompleted = false,
  lastWsMessage,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & View Mode
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('all');
  const [source, setSource] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');

  // Forward Modal State
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  // User Authority
  const isAdmin = user?.role === 'ADMIN';
  const isCreator = user && project.createdBy === user.id;
  const isLead = user && (project.leadId === user.id || isCreator);
  const canForward = isAdmin || isLead;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format Date
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get File Icon based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      return <Image className="w-5 h-5 text-emerald-400" />;
    }
    if (['pdf'].includes(ext)) {
      return <FileText className="w-5 h-5 text-rose-400" />;
    }
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-purple-400" />;
    }
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'java', 'sql'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-amber-400" />;
    }
    return <FileIcon className="w-5 h-5 text-slate-400" />;
  };

  // Fetch Library Files
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await libraryApi.listLibraryFiles(projectId, {
        search: search.trim() || undefined,
        fileType: fileType !== 'all' ? fileType : undefined,
        source: source !== 'all' ? source : undefined,
        sortBy,
      });
      setFiles(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load project library');
    } finally {
      setLoading(false);
    }
  }, [projectId, search, fileType, source, sortBy]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Handle Real-time WebSocket events
  useEffect(() => {
    if (!lastWsMessage || lastWsMessage.projectId !== projectId) return;

    if (lastWsMessage.type === 'ATTACHMENT_CREATED') {
      fetchFiles();
    } else if (lastWsMessage.type === 'ATTACHMENT_DELETED') {
      const deletedId = lastWsMessage.payload?.attachmentId;
      if (deletedId) {
        setFiles((prev) => prev.filter((f) => f.id !== deletedId));
      } else {
        fetchFiles();
      }
    }
  }, [lastWsMessage, projectId, fetchFiles]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Direct Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await libraryApi.uploadLibraryFile(projectId, file);
      setToastMessage(`"${file.name}" uploaded to project library`);
      fetchFiles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Download
  const handleDownload = async (attachment: Attachment) => {
    try {
      const blob = await libraryApi.downloadLibraryFile(projectId, attachment.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download file');
    }
  };

  // Handle Delete
  const handleDelete = async (attachment: Attachment) => {
    if (!window.confirm(`Delete "${attachment.originalName}" from this library?`)) {
      return;
    }
    try {
      await libraryApi.deleteLibraryFile(projectId, attachment.id);
      setFiles((prev) => prev.filter((f) => f.id !== attachment.id));
      setToastMessage(`"${attachment.originalName}" deleted from library`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete file');
    }
  };

  // Forward Modal Trigger
  const openForwardModal = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setForwardModalOpen(true);
  };

  const handleForwardSuccess = (count: number) => {
    setToastMessage(`Attachment forwarded to ${count} destination project${count === 1 ? '' : 's'}`);
  };

  const clearFilters = () => {
    setSearch('');
    setFileType('all');
    setSource('all');
    setSortBy('newest');
  };

  const hasActiveFilters = search !== '' || fileType !== 'all' || source !== 'all' || sortBy !== 'newest';

  // Compute Metrics
  const totalBytes = files.reduce((sum, f) => sum + (f.fileSize || 0), 0);
  const forwardedCount = files.filter((f) => f.isForwarded).length;
  const taskCount = files.filter((f) => f.taskId).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm backdrop-blur-md animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Summary Metrics */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Project Library
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  Isolated Workspace
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized file storage for {project.name}. Contains direct uploads, task assets, and forwarded files.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <strong className="text-slate-200">{files.length}</strong> Total Files
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              <strong className="text-slate-200">{formatFileSize(totalBytes)}</strong> Used
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <strong className="text-slate-200">{forwardedCount}</strong> Forwarded
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <strong className="text-slate-200">{taskCount}</strong> from Tasks
            </span>
          </div>
        </div>

        {/* Upload Action */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            disabled={isCompleted || uploading}
          />

          {isCompleted ? (
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Library Locked (View-Only)</span>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                </>
              )}
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950/70 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setDisplayMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                displayMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                displayMode === 'list' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-xl text-sm text-rose-300 flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Component */}
      <LibraryFilter
        search={search}
        onSearchChange={setSearch}
        fileType={fileType}
        onFileTypeChange={setFileType}
        source={source}
        onSourceChange={setSource}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Files Display */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span>Loading library files...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
            <FolderArchive className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No files found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'No attachments match your current search and filter criteria.'
              : 'This project library is currently empty. Upload files or attach them to tasks.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="mt-2 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            !isCompleted && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload First File
              </button>
            )
          )}
        </div>
      ) : displayMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => {
            const isOwner =
              (file.uploadedBy && file.uploadedBy === user?.id) ||
              (file.forwardedBy && file.forwardedBy === user?.id);
            const canDelete = !isCompleted && (isAdmin || isLead || isOwner);

            return (
              <div
                key={file.id}
                className="group relative bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Top: Icon + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-slate-700 transition-colors">
                      {getFileIcon(file.originalName)}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20 transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {canForward && !isCompleted && (
                        <button
                          onClick={() => openForwardModal(file)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-950/20 transition-colors"
                          title="Forward to other projects"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                          title="Delete from library"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* File Name & Size */}
                  <div className="mt-3">
                    <h4
                      className="text-sm font-semibold text-slate-200 truncate group-hover:text-emerald-300 transition-colors"
                      title={file.originalName}
                    >
                      {file.originalName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(file.fileSize)}</p>
                  </div>

                  {/* Badges & Provenance Metadata */}
                  <div className="mt-3 space-y-1.5">
                    {file.isForwarded ? (
                      <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-900/40 text-[11px] text-purple-300 flex items-start gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">
                          Forwarded by <strong>{file.forwardedByName || 'Lead'}</strong>
                          {file.sourceProjectName && (
                            <>
                              {' '}from <em>{file.sourceProjectName}</em>
                            </>
                          )}
                        </span>
                      </div>
                    ) : file.taskId ? (
                      <div className="p-2 rounded-xl bg-sky-950/30 border border-sky-900/40 text-[11px] text-sky-300 flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span className="leading-tight truncate" title={file.taskTitle || 'Task'}>
                          Task: <strong>{file.taskTitle || 'Task'}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Direct Upload {file.uploadedByName ? `by ${file.uploadedByName}` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Timestamp */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(file.uploadedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 bg-slate-950/50">
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Source / Attribution</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Date Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {files.map((file) => {
                const isOwner =
                  (file.uploadedBy && file.uploadedBy === user?.id) ||
                  (file.forwardedBy && file.forwardedBy === user?.id);
                const canDelete = !isCompleted && (isAdmin || isLead || isOwner);

                return (
                  <tr key={file.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                          {getFileIcon(file.originalName)}
                        </div>
                        <span className="font-medium text-slate-200 truncate max-w-xs" title={file.originalName}>
                          {file.originalName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs">
                      {file.isForwarded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-900/40">
                          <Share2 className="w-3 h-3 text-purple-400" />
                          Forwarded by {file.forwardedByName || 'Lead'}
                          {file.sourceProjectName ? ` (${file.sourceProjectName})` : ''}
                        </span>
                      ) : file.taskId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-950/40 text-sky-300 border border-sky-900/40 truncate max-w-xs">
                          <FileText className="w-3 h-3 text-sky-400" />
                          Task: {file.taskTitle || 'Task'}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Direct Upload {file.uploadedByName ? `(${file.uploadedByName})` : ''}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400">{formatFileSize(file.fileSize)}</td>

                    <td className="py-3 px-4 text-xs text-slate-400">{formatDate(file.uploadedAt)}</td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {canForward && !isCompleted && (
                          <button
                            onClick={() => openForwardModal(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-950/20 transition-colors"
                            title="Forward"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDelete(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Forward Attachment Modal */}
      <ForwardAttachmentModal
        isOpen={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
        attachment={selectedAttachment}
        projectId={projectId}
        onForwardSuccess={handleForwardSuccess}
      />
    </div>
  );
};
