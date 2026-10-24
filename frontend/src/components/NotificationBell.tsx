import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Clock,
  Inbox,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../types';

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

export interface NotificationBellProps {
  dropdownPlacement?: 'bottom-right' | 'right-start';
  showLabel?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  dropdownPlacement = 'bottom-right',
  showLabel = false,
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    acceptInvite,
    declineInvite,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<Record<number, 'ACCEPTED' | 'DECLINED'>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') {
      return !n.isRead;
    }
    return true;
  });

  const handleAccept = async (e: React.MouseEvent, n: Notification) => {
    e.stopPropagation();
    const invitationId = n.data?.invitationId;
    if (!invitationId) return;

    setActionLoadingId(n.id);
    try {
      await acceptInvite(invitationId);
      setActionSuccess((prev) => ({ ...prev, [n.id]: 'ACCEPTED' }));
      // Optional: automatically navigate to project after short delay
      if (n.data?.projectId) {
        setTimeout(() => {
          setIsOpen(false);
          navigate(`/projects/${n.data?.projectId}`);
        }, 600);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (e: React.MouseEvent, n: Notification) => {
    e.stopPropagation();
    const invitationId = n.data?.invitationId;
    if (!invitationId) return;

    setActionLoadingId(n.id);
    try {
      await declineInvite(invitationId);
      setActionSuccess((prev) => ({ ...prev, [n.id]: 'DECLINED' }));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCardClick = (n: Notification) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    if (n.data?.projectId && (n.isRead || actionSuccess[n.id] === 'ACCEPTED')) {
      setIsOpen(false);
      navigate(`/projects/${n.data.projectId}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      {showLabel ? (
        <button
          type="button"
          id="notification-bell-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all active:scale-95 ${
            isOpen
              ? 'bg-slate-800 border-emerald-500/50 text-emerald-400 shadow-sm shadow-emerald-500/20'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Notifications"
          aria-label="Notifications"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-current" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              )}
            </div>
            <span className="text-sm font-medium">Notifications</span>
          </div>

          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center px-1.5 rounded-full bg-emerald-500 text-[11px] font-bold text-slate-950 shadow-sm shadow-emerald-500/30">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          id="notification-bell-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative p-2.5 rounded-xl border transition-all active:scale-95 ${
            isOpen
              ? 'bg-slate-800 border-emerald-500/50 text-emerald-400 shadow-sm shadow-emerald-500/20'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-slate-700'
          }`}
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 rounded-full bg-emerald-500 text-[11px] font-bold text-slate-950 shadow-md shadow-emerald-500/40 ring-2 ring-slate-900 animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          id="notification-popover"
          className={`absolute ${
            dropdownPlacement === 'right-start'
              ? 'left-full ml-3.5 -top-2'
              : 'right-0 mt-2'
          } w-84 sm:w-96 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col max-h-[32rem] animate-in fade-in-0 zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                id="mark-all-read-btn"
                onClick={() => markAllAsRead()}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-3 pt-2 pb-1 border-b border-slate-800/80 gap-1 bg-slate-900/40">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-emerald-400 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'unread'
                  ? 'bg-slate-800 text-emerald-400 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 overscroll-contain">
            {loading && notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-2">
                  <Inbox className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-300">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </span>
                <span className="text-xs text-slate-500 mt-1 max-w-[200px]">
                  {activeTab === 'unread'
                    ? 'All your invitations and updates have been read.'
                    : 'When you receive project invites or updates, they will appear here.'}
                </span>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isInvite = n.type === 'PROJECT_INVITE';
                const statusOverride = actionSuccess[n.id];
                const effectiveStatus = statusOverride || (n.data?.status as 'ACCEPTED' | 'DECLINED' | undefined);
                const isLoadingThis = actionLoadingId === n.id;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleCardClick(n)}
                    className={`p-3.5 transition-colors cursor-pointer text-left relative group ${
                      !n.isRead
                        ? 'bg-emerald-950/15 hover:bg-emerald-950/25'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {!n.isRead && (
                      <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                    )}

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                        <FolderPlus className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {n.data?.projectKey && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono font-semibold text-emerald-400">
                              {n.data.projectKey}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {n.title}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(n.createdAt)}
                          </span>

                          {/* Quick action buttons for project invite */}
                          {isInvite && !effectiveStatus && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                disabled={isLoadingThis}
                                onClick={(e) => handleAccept(e, n)}
                                className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                              >
                                {isLoadingThis ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>Accept</span>
                              </button>

                              <button
                                type="button"
                                disabled={isLoadingThis}
                                onClick={(e) => handleDecline(e, n)}
                                className="px-2 py-1 rounded-md bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 text-[11px] font-medium transition-colors disabled:opacity-50"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Accepted badge */}
                          {effectiveStatus === 'ACCEPTED' && (
                            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                              <Check className="w-3 h-3" />
                              Joined Project
                            </span>
                          )}

                          {/* Declined badge */}
                          {effectiveStatus === 'DECLINED' && (
                            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium">
                              Declined
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-2 border-t border-slate-800/80 bg-slate-900/60 text-center">
              <span className="text-[11px] text-slate-500">
                Click any accepted project notification to open workspace
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
