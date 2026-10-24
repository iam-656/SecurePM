import React, { useState } from 'react';
import {
  File,
  FileImage,
  FileCode,
  FileText,
  FileArchive,
  Download,
  Trash2,
  Paperclip,
  Loader2,
} from 'lucide-react';
import type { Attachment } from '../types';

export interface AttachmentListProps {
  attachments: Attachment[];
  onDownload: (attachmentId: number, originalName: string) => Promise<unknown> | void;
  onDelete: (attachmentId: number) => Promise<unknown> | void;
  loading?: boolean;
  canDelete?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return FileImage;
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'json':
    case 'java':
    case 'py':
    case 'html':
    case 'css':
    case 'sql':
      return FileCode;
    case 'txt':
    case 'md':
    case 'pdf':
    case 'doc':
    case 'docx':
      return FileText;
    case 'zip':
    case 'tar':
    case 'gz':
    case '7z':
    case 'rar':
      return FileArchive;
    default:
      return File;
  }
};

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  onDownload,
  onDelete,
  loading = false,
  canDelete = true,
}) => {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="space-y-2 py-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800"></div>
              <div className="space-y-1.5">
                <div className="w-32 h-3 bg-slate-800 rounded"></div>
                <div className="w-16 h-2 bg-slate-800/60 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="py-6 text-center text-slate-500 text-xs">
        <Paperclip className="w-7 h-7 mx-auto mb-2 text-slate-600" />
        <p>No attachments yet.</p>
      </div>
    );
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      setDownloadingId(attachment.id);
      await onDownload(attachment.id, attachment.originalName);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!window.confirm(`Are you sure you want to delete "${attachment.originalName}"?`)) {
      return;
    }
    try {
      setDeletingId(attachment.id);
      await onDelete(attachment.id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {attachments.map((att) => {
        const IconComponent = getFileIcon(att.originalName);
        const isDownloading = downloadingId === att.id;
        const isDeleting = deletingId === att.id;

        return (
          <div
            key={att.id}
            className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 text-xs transition-colors"
          >
            {/* File info */}
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-slate-700/60">
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div
                  title={att.originalName}
                  className="font-medium text-slate-200 truncate group-hover:text-emerald-400 transition-colors"
                >
                  {att.originalName}
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                  <span>{formatFileSize(att.fileSize)}</span>
                  <span>•</span>
                  <span>{formatDate(att.uploadedAt)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleDownload(att)}
                disabled={isDownloading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                title="Download file"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </button>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(att)}
                  disabled={isDeleting}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete file"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AttachmentList;
