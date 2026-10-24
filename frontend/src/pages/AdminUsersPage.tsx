import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldAlert,
  KeyRound,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../stores/auth';
import { usersApi } from '../api/users';
import type { User, Role } from '../types';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER' | 'INACTIVE'>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states for New User
  const [newUsername, setNewUsername] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<Role>('USER');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Real-time username availability state (Instagram style)
  const [usernameStatus, setUsernameStatus] = useState<
    'IDLE' | 'CHECKING' | 'AVAILABLE' | 'TAKEN' | 'INVALID'
  >('IDLE');
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit User Form State
  const [editFullName, setEditFullName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editRole, setEditRole] = useState<Role>('USER');
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Reset Password State
  const [resetPasswordValue, setResetPasswordValue] = useState<string>('');
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetSubmitting, setResetSubmitting] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  // Delete State
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await usersApi.listUsers();
      setUsers(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load user directory');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    usersApi
      .listUsers()
      .then((data) => {
        if (isMounted) {
          setUsers(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load user directory');
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

  // Username validation debounced check
  const handleUsernameChange = (val: string) => {
    setNewUsername(val);
    setCreateError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (!trimmed) {
      setUsernameStatus('IDLE');
      setUsernameMessage('');
      return;
    }

    if (trimmed.length < 3) {
      setUsernameStatus('INVALID');
      setUsernameMessage('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      setUsernameStatus('INVALID');
      setUsernameMessage('Only letters, numbers, underscores, dots, and hyphens allowed');
      return;
    }

    setUsernameStatus('CHECKING');
    setUsernameMessage('Checking availability...');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await usersApi.checkUsername(trimmed);
        if (res.available) {
          setUsernameStatus('AVAILABLE');
          setUsernameMessage(res.message || 'Username is available');
        } else {
          setUsernameStatus('TAKEN');
          setUsernameMessage(res.message || 'Username is already taken');
        }
      } catch {
        setUsernameStatus('IDLE');
        setUsernameMessage('');
      }
    }, 300);
  };

  const handleOpenCreate = () => {
    setNewUsername('');
    setNewEmail('');
    setNewFullName('');
    setNewPassword('');
    setNewRole('USER');
    setShowNewPassword(false);
    setUsernameStatus('IDLE');
    setUsernameMessage('');
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'TAKEN' || usernameStatus === 'INVALID') {
      return;
    }
    if (newPassword.length < 8) {
      setCreateError('Password must be at least 8 characters');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError(null);
      await usersApi.createUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        fullName: newFullName.trim(),
        password: newPassword,
        role: newRole,
      });
      setIsCreateOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCreateError(err.message);
      } else {
        setCreateError('Failed to create user. Verify email and username uniqueness.');
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEdit = (target: User) => {
    setSelectedUser(target);
    setEditFullName(target.fullName);
    setEditEmail(target.email || '');
    setEditRole(target.role);
    setEditActive(target.active);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setEditSubmitting(true);
      setEditError(null);
      await usersApi.updateUser(selectedUser.id, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        role: editRole,
        active: editActive,
      });
      setIsEditOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError('Failed to update user details.');
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenResetPassword = (target: User) => {
    setSelectedUser(target);
    setResetPasswordValue('');
    setShowResetPassword(false);
    setResetError(null);
    setResetSuccess(false);
    setIsResetPasswordOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPasswordValue.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }

    try {
      setResetSubmitting(true);
      setResetError(null);
      await usersApi.updateUser(selectedUser.id, {
        password: resetPasswordValue,
      });
      setResetSuccess(true);
      setTimeout(() => {
        setIsResetPasswordOpen(false);
        setResetSuccess(false);
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setResetError(err.message);
      } else {
        setResetError('Failed to reset password.');
      }
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleOpenDelete = (target: User) => {
    setSelectedUser(target);
    setDeleteError(null);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      await usersApi.deleteUser(selectedUser.id);
      setIsDeleteOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Failed to delete user.');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (roleFilter === 'ADMIN') return u.role === 'ADMIN' && u.active;
      if (roleFilter === 'USER') return u.role !== 'ADMIN' && u.active;
      if (roleFilter === 'INACTIVE') return !u.active;
      return true;
    });
  }, [users, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.active).length;
    const admins = users.filter((u) => u.role === 'ADMIN' && u.active).length;
    return { total, active, admins };
  }, [users]);

  // Hierarchy rules for actions
  const canModifyTarget = (target: User): boolean => {
    if (!currentUser) return false;
    // Super admin can modify any user
    if (currentUser.isSuperAdmin) return true;
    // Cannot modify super admin if requester is not super admin
    if (target.isSuperAdmin) return false;
    // Secondary admin can modify themselves
    if (target.id === currentUser.id) return true;
    // Secondary admin can modify another admin only if they created them
    if (target.role === 'ADMIN') {
      return target.createdBy === currentUser.id;
    }
    // Secondary admin can modify standard users
    return true;
  };

  const canDeleteTarget = (target: User): boolean => {
    if (!currentUser) return false;
    // Cannot delete yourself
    if (target.id === currentUser.id) return false;
    // Super admin cannot be deleted
    if (target.isSuperAdmin) return false;
    // Super admin can delete other admins and users
    if (currentUser.isSuperAdmin) return true;
    // Secondary admin can only delete admins they created
    if (target.role === 'ADMIN') {
      return target.createdBy === currentUser.id;
    }
    // Secondary admin can delete standard users
    return true;
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Team & User Management
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Manage team accounts, assign roles, and administer system access.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadUsers}
              title="Refresh directory"
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>New User</span>
            </button>
          </div>
        </div>

        {/* Stats counter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total Users
              </p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Active Members
              </p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.active}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Administrators
              </p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{stats.admins}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, username, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            {(['ALL', 'ADMIN', 'USER', 'INACTIVE'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRoleFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  roleFilter === filter
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
              >
                {filter === 'ALL'
                  ? 'All Users'
                  : filter === 'ADMIN'
                  ? 'Admins'
                  : filter === 'USER'
                  ? 'Members'
                  : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-sm font-medium">Loading user directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-3 text-slate-500">
                <UserX className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-white">No users found</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery
                  ? 'No users match your search query.'
                  : 'No users found matching the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                  <tr>
                    <th className="py-3.5 px-6">User</th>
                    <th className="py-3.5 px-6">Email</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Created</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((userItem) => {
                    const isSelf = userItem.id === currentUser?.id;
                    const isSuper = userItem.isSuperAdmin;
                    const canModify = canModifyTarget(userItem);
                    const canDelete = canDeleteTarget(userItem);

                    return (
                      <tr
                        key={userItem.id}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* User details */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm shadow-sm">
                              {userItem.fullName
                                ? userItem.fullName.charAt(0).toUpperCase()
                                : userItem.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white text-sm">
                                  {userItem.fullName}
                                </span>
                                {isSuper && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                    CREATOR
                                  </span>
                                )}
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-400 font-mono text-xs">
                                @{userItem.username}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-6 text-slate-300 font-mono text-xs">
                          {userItem.email || '—'}
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border ${
                              userItem.role === 'ADMIN'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {userItem.role === 'ADMIN' ? (
                              <Shield className="w-3 h-3 text-indigo-400" />
                            ) : (
                              <Users className="w-3 h-3 text-slate-400" />
                            )}
                            <span>{userItem.role}</span>
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                              userItem.active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                userItem.active ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            <span>{userItem.active ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                          {userItem.createdAt
                            ? new Date(userItem.createdAt).toLocaleDateString()
                            : '—'}
                        </td>

                        {/* Action buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit Button */}
                            <button
                              type="button"
                              disabled={!canModify}
                              onClick={() => handleOpenEdit(userItem)}
                              title={
                                !canModify
                                  ? 'Only the creator or super admin can edit this account'
                                  : 'Edit User'
                              }
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password Button */}
                            <button
                              type="button"
                              disabled={!canModify}
                              onClick={() => handleOpenResetPassword(userItem)}
                              title={
                                !canModify
                                  ? 'Only the creator or super admin can reset this password'
                                  : 'Reset Password'
                              }
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete / Deactivate Button */}
                            <button
                              type="button"
                              disabled={!canDelete}
                              onClick={() => handleOpenDelete(userItem)}
                              title={
                                isSelf
                                  ? 'You cannot delete your own account'
                                  : isSuper
                                  ? 'The creator / super admin cannot be deleted'
                                  : !canDelete
                                  ? 'Only the creator or super admin can delete this account'
                                  : 'Deactivate / Delete User'
                              }
                              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* CREATE USER MODAL with Instagram-style Username Validation */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Create New User</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Username with Instagram-style Availability Indicator */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Username *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="e.g. johndoe"
                    className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all pr-10 font-mono ${
                      usernameStatus === 'AVAILABLE'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : usernameStatus === 'TAKEN' || usernameStatus === 'INVALID'
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                    }`}
                  />
                  {/* Status Indicator Icon */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'CHECKING' && (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    )}
                    {usernameStatus === 'AVAILABLE' && (
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                    )}
                    {(usernameStatus === 'TAKEN' || usernameStatus === 'INVALID') && (
                      <X className="w-4 h-4 text-rose-400 stroke-[3]" />
                    )}
                  </div>
                </div>
                {/* Status Message */}
                {usernameMessage && (
                  <p
                    className={`text-[11px] mt-1.5 flex items-center gap-1 font-medium ${
                      usernameStatus === 'AVAILABLE'
                        ? 'text-emerald-400'
                        : usernameStatus === 'TAKEN' || usernameStatus === 'INVALID'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {usernameStatus === 'AVAILABLE' && <Check className="w-3 h-3" />}
                    {(usernameStatus === 'TAKEN' || usernameStatus === 'INVALID') && (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    <span>{usernameMessage}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. john@securepm.local"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 font-mono transition-all"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Initial Password * (min 8 chars)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Role *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRole('USER')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newRole === 'USER'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">USER</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Standard team member</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('ADMIN')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newRole === 'ADMIN'
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">ADMIN</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Full system access</p>
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createSubmitting ||
                    usernameStatus === 'TAKEN' ||
                    usernameStatus === 'INVALID' ||
                    newPassword.length < 8
                  }
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
                >
                  {createSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Edit User: @{selectedUser.username}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address *
                </label>
                {selectedUser.isSuperAdmin ? (
                  <div className="space-y-1.5">
                    <input
                      type="email"
                      disabled
                      value={editEmail}
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 font-mono cursor-not-allowed"
                    />
                    <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Super Administrator email is permanent and cannot be modified</span>
                    </p>
                  </div>
                ) : selectedUser.id === currentUser?.id ? (
                  <div className="space-y-1.5">
                    <input
                      type="email"
                      disabled
                      value={editEmail}
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 font-mono cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                      <span>You cannot change your own email address</span>
                    </p>
                  </div>
                ) : (
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                )}
              </div>

              {/* Role selection - disabled if editing super admin or self */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Role</label>
                {selectedUser.isSuperAdmin ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Super Administrator role cannot be changed</span>
                  </div>
                ) : selectedUser.id === currentUser?.id ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>You cannot modify your own administrative role</span>
                  </div>
                ) : (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="USER">USER (Standard Member)</option>
                    <option value="ADMIN">ADMIN (Full Access)</option>
                  </select>
                )}
              </div>

              {/* Active Toggle */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Account Status
                </label>
                {selectedUser.isSuperAdmin ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Super Administrator cannot be deactivated</span>
                  </div>
                ) : selectedUser.id === currentUser?.id ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Check className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>You cannot deactivate your own account</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <input
                      type="checkbox"
                      id="editActiveToggle"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <label htmlFor="editActiveToggle" className="text-xs text-slate-300 font-medium">
                      {editActive ? 'Account is Active' : 'Account is Inactive (Deactivated)'}
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
                >
                  {editSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetPasswordOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPasswordOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Enter a new temporary password for user{' '}
              <strong className="text-white">@{selectedUser.username}</strong> ({selectedUser.fullName}).
            </p>

            {resetError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Password successfully reset!</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  New Password * (min 8 chars)
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showResetPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting || resetPasswordValue.length < 8}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 disabled:opacity-40 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
                >
                  {resetSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Reset Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / DEACTIVATE CONFIRMATION MODAL */}
      {isDeleteOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Deactivate User Account</h3>
                <p className="text-xs text-slate-400">@{selectedUser.username}</p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Are you sure you want to deactivate{' '}
              <strong className="text-white">{selectedUser.fullName}</strong>? This user will no
              longer be able to log in. Their historical tasks and contributions will be preserved,
              and their username <span className="font-mono text-emerald-400">@{selectedUser.username}</span>{' '}
              will become available for reuse.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeleteSubmit}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 active:scale-95 disabled:opacity-40 transition-all shadow-md shadow-rose-500/20 flex items-center gap-2"
              >
                {deleteSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Deactivate User</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
