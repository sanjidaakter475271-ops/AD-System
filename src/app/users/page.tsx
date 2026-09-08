'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  User, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Building,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { BASE_UNITS } from '@/lib/constants';

export default function UsersPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  const [users, setUsers] = useState<any[]>([]);
  const [baseUnits, setBaseUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State for User Creation
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [selectedBaseUnit, setSelectedBaseUnit] = useState('Air HQ');

  // Base & Office Management State (Admin)
  const [adminSelectedBase, setAdminSelectedBase] = useState('Air HQ');
  const [newBaseName, setNewBaseName] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');
  const [showAddBaseModal, setShowAddBaseModal] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch user list');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseUnits = async () => {
    try {
      const res = await fetch('/api/base-units');
      if (res.ok) {
        const data = await res.json();
        setBaseUnits(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchBaseUnits();
    }
  }, [isAdmin]);

  const allBaseUnits = Array.from(new Set([
    ...BASE_UNITS,
    ...baseUnits.map(b => b.name)
  ]));

  const activeAdminBaseObj = baseUnits.find(b => b.name === adminSelectedBase);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          username, 
          password, 
          role,
          baseUnit: role === 'admin' ? 'All Bases' : selectedBaseUnit
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }

      setSuccess(`User "${username}" created successfully!`);
      setName('');
      setUsername('');
      setPassword('');
      setRole('user');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: number, uname: string) => {
    if (!confirm(`Are you sure you want to delete user "${uname}"?`)) return;

    setDeletingId(id);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
      setSuccess(`User "${uname}" deleted successfully.`);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdminAddBaseUnit = async () => {
    if (!newBaseName.trim()) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/base-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBaseName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add Base Unit');
      }
      setSuccess(`Base / Unit "${newBaseName}" created successfully!`);
      setNewBaseName('');
      setShowAddBaseModal(false);
      fetchBaseUnits();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAdminAddOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficeName.trim()) return;
    if (!activeAdminBaseObj) {
      setError('Selected Base Unit is not initialized in database. Creating now...');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOfficeName.trim(),
          baseUnitId: activeAdminBaseObj.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create office');
      }
      setSuccess(`Office "${newOfficeName}" added under Base "${adminSelectedBase}"!`);
      setNewOfficeName('');
      fetchBaseUnits();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-slate-900 border border-rose-800/40 rounded-2xl text-center space-y-4 shadow-2xl">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-sm text-slate-300">
          Only System Administrators (Admin) can manage users.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" />
              Admin Panel & System Controls
            </h1>
            <p className="text-sm text-slate-400">Manage System Users, Base/Units, and Base-wise Office Directories</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Modal for creating Base Unit */}
      {showAddBaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-sky-400" />
              Add New Base / Unit
            </h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Base / Unit Name</label>
              <input
                type="text"
                placeholder="e.g. BAF Base Cox's Bazar"
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBaseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminAddBaseUnit}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold"
              >
                Create Base / Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN CONTROL SECTION 1: BASE-WISE OFFICE MANAGEMENT */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-400" />
            Base-wise Office Directory Management
          </h2>
          <button
            type="button"
            onClick={() => setShowAddBaseModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-semibold transition-all w-fit"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            Add New Base / Unit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Base Selector & Office Addition Form */}
          <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Step 1: Select Target Base / Unit *
              </label>
              <select
                value={adminSelectedBase}
                onChange={(e) => setAdminSelectedBase(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                {allBaseUnits.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleAdminAddOffice} className="space-y-3 pt-2 border-t border-slate-700/60">
              <label className="block text-xs font-bold text-slate-300">
                Step 2: Add New Office under &quot;{adminSelectedBase}&quot;
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Signal Section, Flight Safety..."
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
                >
                  Add Office
                </button>
              </div>
            </form>
          </div>

          {/* Active Base Offices List Preview */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-700 pb-2">
              <span>Existing Offices for {adminSelectedBase}</span>
              <span className="text-indigo-400 font-normal capitalize">
                ({activeAdminBaseObj?.offices?.length || 0} Offices)
              </span>
            </h3>
            
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {activeAdminBaseObj?.offices && activeAdminBaseObj.offices.length > 0 ? (
                activeAdminBaseObj.offices.map((off: any) => (
                  <div key={off.id} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-200 flex items-center justify-between">
                    <span>{off.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">ID #{off.id}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  No custom offices added yet for {adminSelectedBase}. Default directorates will be displayed.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN CONTROL SECTION 2: SYSTEM USER ACCOUNTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Create User Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <UserPlus className="w-5 h-5 text-sky-400" />
            Create New Account
          </h2>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Flight Lt. Rahman"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Username *</label>
              <input
                type="text"
                placeholder="e.g. rahman"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="user">User (Restricted to specific Base/Unit)</option>
                <option value="admin">Admin (Full System & All Bases Access)</option>
              </select>
            </div>

            {role === 'user' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Base / Unit *</label>
                <select
                  value={selectedBaseUnit}
                  onChange={(e) => setSelectedBaseUnit(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {allBaseUnits.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">This user will ONLY see and manage equipment for {selectedBaseUnit}.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              {creating ? 'Creating User...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Existing Users Table Card */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Users className="w-5 h-5 text-purple-400" />
            Registered System Users ({users.length})
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Assigned Base</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => {
                    const isSelf = String(u.id) === String((session?.user as any)?.id);
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-white">
                          {u.name || u.username}
                          {isSelf && <span className="ml-2 text-[10px] text-sky-400 font-normal">(You)</span>}
                        </td>
                        <td className="p-3 text-slate-400 font-mono">@{u.username}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit ${
                            u.role === 'admin' 
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {u.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-300">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Building className="w-3 h-3 text-slate-400" />
                            {u.role === 'admin' ? 'All Bases (Global)' : (u.baseUnit || 'Air HQ')}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={deletingId === u.id}
                              className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 text-xs transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
