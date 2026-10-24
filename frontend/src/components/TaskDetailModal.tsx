import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Paperclip,
  Calendar,
  Layers,
  Edit2,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';
import { AttachmentList } from './AttachmentList';
import { AttachmentUpload } from './AttachmentUpload';
import { useComments } from '../hooks/useComments';
import { useAttachments } from '../hooks/useAttachments';
import type {
  Task,
  TaskPriority,
  TaskStatus,
  WebSocketMessage,
  Comment,
  Attachment,
} from '../types';

export interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  projectKey?: string;
  onEditTask?: (task: Task) => void;
  currentUserId?: number;
  isAdmin?: boolean;
  isCompleted?: boolean;
  lastWsMessage?: WebSocketMessage | null;
}

const priorityStyles: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  HIGH: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
  MEDIUM: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  LOW: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
  },
};

const statusStyles: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  TODO: {
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
  },
  IN_PROGRESS: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
  },
  REVIEW: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  DONE: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
};

interface TaskDetailContentProps {
  task: Task;
  projectKey?: string;
  onClose: () => void;
  onEditTask?: (task: Task) => void;
  currentUserId?: number;
  isAdmin?: boolean;
  isCompleted?: boolean;
  lastWsMessage?: WebSocketMessage | null;
}

const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  task,
  projectKey,
  onClose,
  onEditTask,
  currentUserId,
  isAdmin = false,
  isCompleted = false,
  lastWsMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'attachments'>('comments');

  const {
    comments,
    loading: commentsLoading,
    addComment,
    editComment,
    deleteComment,
    patchCommentCreated,
    patchCommentUpdated,
    patchCommentDeleted,
    loadComments,
  } = useComments({
    taskId: task.id,
    projectId: task.projectId,
  });

  const {
    attachments,
    loading: attachmentsLoading,
    uploading,
    uploadAttachment,
    downloadAttachment,
    deleteAttachment,
    patchAttachmentCreated,
    patchAttachmentDeleted,
    loadAttachments,
  } = useAttachments({
    taskId: task.id,
    projectId: task.projectId,
  });

  useEffect(() => {
    if (!lastWsMessage || lastWsMessage.taskId !== task.id) return;

    if (lastWsMessage.type === 'COMMENT_CREATED' && lastWsMessage.payload?.comment) {
      patchCommentCreated(lastWsMessage.payload.comment as Comment);
    } else if (lastWsMessage.type === 'COMMENT_UPDATED' && lastWsMessage.payload?.comment) {
      patchCommentUpdated(lastWsMessage.payload.comment as Comment);
    } else if (lastWsMessage.type === 'COMMENT_DELETED') {
      const commentId = (lastWsMessage.payload?.commentId || lastWsMessage.payload?.id) as number | undefined;
      if (commentId) {
        patchCommentDeleted(commentId);
      } else {
        loadComments();
      }
    } else if (lastWsMessage.type === 'ATTACHMENT_CREATED' && lastWsMessage.payload?.attachment) {
      patchAttachmentCreated(lastWsMessage.payload.attachment as Attachment);
    } else if (lastWsMessage.type === 'ATTACHMENT_DELETED') {
      const attachmentId = (lastWsMessage.payload?.attachmentId || lastWsMessage.payload?.id) as number | undefined;
      if (attachmentId) {
        patchAttachmentDeleted(attachmentId);
      } else {
        loadAttachments();
      }
    }
  }, [
    lastWsMessage,
    task.id,
    patchCommentCreated,
    patchCommentUpdated,
    patchCommentDeleted,
    loadComments,
    patchAttachmentCreated,
    patchAttachmentDeleted,
    loadAttachments,
  ]);

  const priorityStyle = priorityStyles[task.priority] || priorityStyles.MEDIUM;
  const statusStyle = statusStyles[task.status] || statusStyles.TODO;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative text-slate-100 max-h-[90vh] overflow-y-auto flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        {/* Top Bar: Key, Badges, Close */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {projectKey ? `${projectKey}-${task.id}` : `#${task.id}`}
              </span>

              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                {task.status.replace('_', ' ')}
              </span>

              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
              >
                {task.priority} Priority
              </span>

              <span
                title={`Optimistic lock version ${task.version}`}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60"
              >
                <Layers className="w-3 h-3 text-slate-400" />
                <span>v{task.version}</span>
              </span>
            </div>

            <h2 id="task-detail-title" className="text-lg sm:text-xl font-bold text-white">
              {task.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onEditTask && !isCompleted && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditTask(task);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Task Metadata Cards */}
        <div className="py-4 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 text-[10px] uppercase font-semibold block mb-1">
              Assignee
            </span>
            <div className="flex items-center gap-2">
              {task.assigneeName ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                    {task.assigneeName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-200 font-medium truncate">{task.assigneeName}</span>
                </>
              ) : (
                <span className="text-slate-500 flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> Unassigned
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 text-[10px] uppercase font-semibold block mb-1">
              Due Date
            </span>
            <div className="flex items-center gap-1.5 text-slate-200 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{task.dueDate ? task.dueDate.slice(0, 10) : 'None'}</span>
            </div>
          </div>

          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 col-span-2 sm:col-span-1">
            <span className="text-slate-500 text-[10px] uppercase font-semibold block mb-1">
              Created
            </span>
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        {/* Task Description */}
        <div className="py-4 border-b border-slate-800/80">
          <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
            Description
          </h3>
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/30 p-3.5 rounded-xl border border-slate-800/40 min-h-[4rem]">
            {task.description || <span className="text-slate-500 italic">No description provided.</span>}
          </div>
        </div>

        {/* Tabs: Comments & Attachments */}
        <div className="pt-4 flex-1 flex flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800 mb-4 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`inline-flex items-center gap-2 pb-1 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'comments'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Comments</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {comments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`inline-flex items-center gap-2 pb-1 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'attachments'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>Attachments</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {attachments.length}
              </span>
            </button>
          </div>

          {/* Active Tab Panel */}
          {activeTab === 'comments' ? (
            <div className="space-y-4">
              <CommentList
                comments={comments}
                loading={commentsLoading}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onEditComment={isCompleted ? undefined : editComment}
                onDeleteComment={isCompleted ? undefined : deleteComment}
              />
              {isCompleted ? (
                <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400">
                  This project is completed. Comments are frozen in view-only mode.
                </div>
              ) : (
                <CommentForm onSubmit={async (content) => { await addComment(content); }} />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!isCompleted && (
                <AttachmentUpload
                  uploading={uploading}
                  onUpload={async (file) => { await uploadAttachment(file); }}
                />
              )}
              {isCompleted && (
                <div className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400">
                  Project is completed. Attachment uploads and deletions are disabled. Existing files can be downloaded below.
                </div>
              )}
              <AttachmentList
                attachments={attachments}
                loading={attachmentsLoading}
                canDelete={!isCompleted}
                onDownload={downloadAttachment}
                onDelete={deleteAttachment}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = (props) => {
  if (!props.isOpen || !props.task) return null;

  return (
    <TaskDetailContent
      key={`task-detail-${props.task.id}-${props.task.version}`}
      task={props.task}
      projectKey={props.projectKey}
      onClose={props.onClose}
      onEditTask={props.onEditTask}
      currentUserId={props.currentUserId}
      isAdmin={props.isAdmin}
      isCompleted={props.isCompleted}
      lastWsMessage={props.lastWsMessage}
    />
  );
};

export default TaskDetailModal;
