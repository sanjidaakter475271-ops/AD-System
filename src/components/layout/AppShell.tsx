'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative">
        <div className={`fixed left-0 top-16 bottom-0 z-40 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
          <Sidebar isCollapsed={!isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>
        <main className={`flex-1 bg-slate-950 p-6 overflow-y-auto min-h-[calc(100vh-4rem)] transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
          <div className="w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
