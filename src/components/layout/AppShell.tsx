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
    <div 
      className="min-h-screen flex flex-col text-slate-100"
      style={{
        backgroundColor: '#020617', // slate-950
        backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/Seal_of_the_Bangladesh_Air_Force_%28BAF%29.svg/250px-Seal_of_the_Bangladesh_Air_Force_%28BAF%29.svg.png")',
        backgroundSize: '400px',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundBlendMode: 'overlay'
      }}
    >
      <div className="absolute inset-0 bg-slate-950/95 pointer-events-none"></div>

      <Navbar />
      <div className="flex flex-1 overflow-hidden relative z-10">
        <div className={`fixed left-0 top-16 bottom-0 z-40 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
          <Sidebar isCollapsed={!isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>
        <main className={`flex-1 p-6 overflow-y-auto min-h-[calc(100vh-4rem)] transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
          <div className="w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
