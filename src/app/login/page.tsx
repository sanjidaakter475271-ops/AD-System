'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Plane, 
  User, 
  Key, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  Monitor,
  FileSpreadsheet,
  BarChart3,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMessage('Please enter both username and password');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await signIn('credentials', {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage('Invalid username or password');
        setLoading(false);
      } else if (res?.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setErrorMessage('Invalid username or password');
        setLoading(false);
      }
    } catch (err) {
      setErrorMessage('Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  const fillQuickCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* LEFT SIDE: Hero & Branding Section */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between relative z-10 border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60">
        
        {/* Top Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 via-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-sky-500/20 border border-sky-300/30">
            <Plane className="w-7 h-7 text-white transform -rotate-45" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wider">
              BANGLADESH AIR FORCE
            </h1>
            <p className="text-xs text-sky-400 font-semibold tracking-wide">
              Air Headquarters Directorate Inventory
            </p>
          </div>
        </div>

        {/* Center Hero Details */}
        <div className="my-12 lg:my-0 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-sky-400" /> Authorized Access Only
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Centralized IT & Equipment Management Portal
          </h2>
          
          <p className="text-slate-300 text-sm leading-relaxed">
            Manage directorate assets, monitor Windows 10/11 compatibility readiness, import bulk Excel inventories, and export official Word reports.
          </p>

          {/* Key Feature Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-200">
              <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Real-time Asset Tracking</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Bulk Excel Import (.xlsx)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-200">
              <BarChart3 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>OS Readiness Analytics</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Official Word Export</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 font-medium">
          © 2026 Air Headquarters — Information Technology Cell
        </div>

      </div>

      {/* RIGHT SIDE: Login Card Container */}
      <div className="lg:w-1/2 p-6 lg:p-12 flex items-center justify-center relative z-10 bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          
          {/* Form Header */}
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-400">
              Enter your official Air HQ credentials to access the inventory system.
            </p>
          </div>

          {/* Quick Demo Fill Buttons */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Quick Demo Login (Click to Fill)
            </div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin', 'admin123')}
                className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Admin (admin)
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials('user', 'user123')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                User (user)
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            
            {Boolean(errorMessage) && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter username (e.g. admin)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Enter password (e.g. admin123)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

        </div>
      </div>

    </div>
  );
}
