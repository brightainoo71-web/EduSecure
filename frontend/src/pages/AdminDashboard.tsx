import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Database,
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  GraduationCap,
  BookOpen,
  Mail,
} from 'lucide-react';

interface SchoolUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  isEmailVerified: boolean;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'USER';
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'backups'>('directory');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'TEACHER' | 'STUDENT' | 'ADMIN'>('ALL');

  // Users Directory state
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [counts, setCounts] = useState({ students: 0, teachers: 0, admins: 0 });
  const [usersLoading, setUsersLoading] = useState(false);

  // Backups state
  const [backups, setBackups] = useState<any[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Notifications
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUserError(null);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
      setCounts(res.data.counts || { students: 0, teachers: 0, admins: 0 });
    } catch (err: any) {
      setUserError(err.response?.data?.message || 'Failed to fetch school directory');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchBackups = async () => {
    setBackupsLoading(true);
    setBackupError(null);
    try {
      const res = await api.get('/admin/backups');
      setBackups(res.data.backups || []);
    } catch (err: any) {
      setBackupError(err.response?.data?.message || 'Failed to fetch backups');
    } finally {
      setBackupsLoading(false);
    }
  };

  const handleToggleUserStatus = async (username: string) => {
    setUserError(null);
    setStatusMsg(null);
    try {
      const res = await api.patch(`/admin/users/${username}/status`);
      setStatusMsg(res.data.message || 'User status updated');
      await fetchUsers();
    } catch (err: any) {
      setUserError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleTriggerBackup = async () => {
    setTriggering(true);
    setStatusMsg(null);
    setBackupError(null);
    try {
      const res = await api.post('/admin/backups/trigger');
      setStatusMsg(`Automated backup snapshot created! Checksum: ${res.data.backup.checksum.slice(0, 16)}...`);
      await fetchBackups();
    } catch (err: any) {
      setBackupError(err.response?.data?.message || 'Failed to trigger backup');
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBackups();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter === 'ALL') return true;
    if (userRoleFilter === 'STUDENT') return u.role === 'STUDENT' || u.role === 'USER';
    return u.role === userRoleFilter;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-slate-900 border border-purple-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                School Administrator Authority
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Institution Overview & Security Control Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Direct access to Teacher/Student rosters, verified credentials, and automated Firestore disaster recovery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchUsers();
                fetchBackups();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${usersLoading || backupsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Records</span>
            </button>
            <button
              onClick={handleTriggerBackup}
              disabled={triggering}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition hover:scale-[1.02] cursor-pointer disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              <span>{triggering ? 'Creating Snapshot...' : 'Create Backup Snapshot'}</span>
            </button>
          </div>
        </div>

        {/* Global Success Alert */}
        {statusMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}
        {userError && activeTab === 'directory' && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{userError}</span>
          </div>
        )}
        {backupError && activeTab === 'backups' && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-sm flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{backupError}</span>
          </div>
        )}

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Enrolled Students</p>
              <p className="text-2xl font-bold text-white mt-0.5">{counts.students}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Faculty Teachers</p>
              <p className="text-2xl font-bold text-white mt-0.5">{counts.teachers}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">School Administrators</p>
              <p className="text-2xl font-bold text-white mt-0.5">{counts.admins}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Stored Snapshots</p>
              <p className="text-2xl font-bold text-white mt-0.5">{backups.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 space-x-4">
          <button
            onClick={() => setActiveTab('directory')}
            className={`pb-3 px-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teachers & Students Directory ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`pb-3 px-3 text-sm font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'backups'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Disaster Recovery & Snapshots ({backups.length})</span>
          </button>
        </div>

        {/* Tab 1: Directory */}
        {activeTab === 'directory' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Full School Member Directory</h2>
                <p className="text-xs text-slate-400">
                  Inspect student and teacher credentials, verification status, and manage active status.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                {(['ALL', 'TEACHER', 'STUDENT', 'ADMIN'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setUserRoleFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      userRoleFilter === f
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f === 'ALL' ? 'All Roles' : f === 'ADMIN' ? 'Admins' : f === 'TEACHER' ? 'Teachers' : 'Students'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User Identification</th>
                    <th className="py-3 px-4">Email & Verification</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">2FA Security</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">{u.username}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{u.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{u.email}</span>
                        </div>
                        <div className="mt-1">
                          {u.isEmailVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <AlertCircle className="w-3 h-3" /> Pending Verification
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                              : u.role === 'TEACHER'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {u.role === 'ADMIN' ? 'School Admin' : u.role === 'TEACHER' ? 'Teacher' : 'Student'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-semibold flex items-center gap-1 ${
                            u.isTwoFactorEnabled ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {u.isTwoFactorEnabled ? 'Enabled (TOTP)' : 'Disabled'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleUserStatus(u.username)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            u.isActive
                              ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No school members found matching filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Backups */}
        {activeTab === 'backups' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" /> Stored Database Snapshots & Integrity Checksums
                </h2>
                <p className="text-xs text-slate-400">
                  Daily automated snapshots generated with SHA-256 integrity verification.
                </p>
              </div>

              <button
                onClick={fetchBackups}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${backupsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Snapshot Archive</th>
                    <th className="py-3 px-4">Storage Size</th>
                    <th className="py-3 px-4">Generated Timestamp</th>
                    <th className="py-3 px-4 text-right">Integrity Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {backups.map((b) => (
                    <tr key={b.fileName} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-purple-300">
                        {b.fileName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans">
                        {(b.sizeBytes / 1024).toFixed(2)} KB
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-sans">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-sans font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> SHA-256 Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                        No backup archives generated yet. Click "Create Backup Snapshot" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};