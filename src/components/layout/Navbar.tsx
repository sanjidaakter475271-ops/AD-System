'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  Plane, 
  Search, 
  PlusCircle, 
  FileSpreadsheet, 
  FileText, 
  ShieldCheck, 
  User,
  LogOut,
  Users
} from 'lucide-react';

export function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white border-b border-indigo-800/40 shadow-xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-300/30">
              <Plane className="w-6 h-6 text-white transform -rotate-45" />
            </div>
            <div>
              <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-wide text-white hover:text-sky-300 transition-colors">
                AD & INVENTORY
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 font-medium">
                  v1.0
                </span>
              </Link>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Active Directory & Equipment Management System
              </p>
            </div>
          </div>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search equipment, SN, directorate, model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-full pl-9 pr-4 py-1.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-inner"
              />
            </div>
          </form>

          {/* Right Action Icons & User Info */}
          <div className="flex items-center gap-3">
            
            {isAdmin && (
              <Link
                href="/users"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all shadow-sm"
                title="Manage Users"
              >
                <Users className="w-4 h-4 text-purple-400" />
                Manage Users
              </Link>
            )}

            <Link
              href="/import"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all shadow-sm"
              title="Import Excel File"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Import Excel
            </Link>

            <Link
              href="/equipment/new"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New</span>
            </Link>

            {/* User Profile Badge & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700/80">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-bold text-white flex items-center gap-1 justify-end">
                      {user.name || user.username}
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                        isAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
