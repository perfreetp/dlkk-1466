import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

function AppLayout({ children, breadcrumbItems = [] }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar items={breadcrumbItems} />
        <main className="flex-1 overflow-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
