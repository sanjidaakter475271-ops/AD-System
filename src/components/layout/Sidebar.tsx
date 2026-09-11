'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  LayoutDashboard, 
  Monitor, 
  PlusCircle, 
  BarChart3, 
  Search, 
  FileSpreadsheet, 
  FileCheck, 
  Database,
  Users,
  ShieldCheck,
  ArrowLeftRight,
  ClipboardList,
  Cpu,
  Menu,
  X,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';

  const navItems = [
    {
      category: 'MAIN MENU',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-sky-500' },
        { label: 'Equipment List', href: '/equipment', icon: Monitor, color: 'text-indigo-500' },
        { label: 'Add New Item', href: '/equipment/new', icon: PlusCircle, color: 'text-emerald-500' },
      ],
    },
    {
      category: 'ANALYTICS & SEARCH',
      items: [
        { label: 'Analysis & Reports', href: '/analysis', icon: BarChart3, color: 'text-purple-500' },
        { label: 'Advanced Search', href: '/search', icon: Search, color: 'text-amber-500' },
      ],
    },
    {
      category: 'EXCEL & DATA CONVERT',
      items: [
        { label: 'Excel Import', href: '/import', icon: FileSpreadsheet, color: 'text-teal-500' },
        { label: 'Export (Excel/Word)', href: '/export', icon: FileCheck, color: 'text-blue-500' },
      ],
    },
    {
      category: 'WITHDRAW & ISSUE',
      items: [
        { label: 'Withdraw & Issue', href: '/withdraw-issue', icon: ArrowLeftRight, color: 'text-amber-400' },
        { label: 'Records', href: '/records', icon: ClipboardList, color: 'text-purple-400' },
        { label: 'Upgradation', href: '/upgradation', icon: Cpu, color: 'text-emerald-400' },
      ],
    },
    ...(isAdmin ? [{
      category: 'ADMINISTRATION',
      items: [
        { label: 'User Accounts', href: '/users', icon: Users, color: 'text-purple-400' },
      ]
    }] : [])
  ];

  return (
    <aside className={`h-full bg-slate-900 text-slate-200 border-r border-slate-800 p-3 flex flex-col justify-between shrink-0 shadow-lg transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="space-y-6">
        
        {/* Navigation Sections */}
        {navItems.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-2">
            <div className="flex items-center justify-between px-3">
              {!isCollapsed ? (
                <h2 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.category}
                </h2>
              ) : null}
              {groupIdx === 0 && onToggle && (
                <button
                  onClick={onToggle}
                  className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all focus:outline-none ${
                    isCollapsed ? 'mx-auto' : ''
                  }`}
                  title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                  aria-label="Toggle Sidebar"
                >
                  {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
              )}
            </div>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ease-in-out group ${
                      isCollapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-600/30 to-indigo-600/30 text-white border-l-4 border-sky-400 shadow-sm font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ease-in-out group-hover:scale-110 ${item.color}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

      </div>

      {/* Footer / User Session Card */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className={`p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
            {isAdmin ? <ShieldCheck className="w-5 h-5 text-purple-400" /> : <Database className="w-5 h-5 text-indigo-400" />}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white capitalize truncate">{user?.name || user?.username || 'Guest'}</div>
              <div className="text-[11px] text-slate-400 capitalize truncate">{user?.role ? `${user.role} Account` : 'Local Inventory DB'}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
