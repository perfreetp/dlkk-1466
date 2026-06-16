import { useLocation, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  LayoutDashboard,
  UserPlus,
  Users,
  ClipboardCheck,
  FileSearch,
  CalendarClock,
  ArrowLeftRight,
  BarChart3,
  LogOut,
} from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import { USER_ROLE_LABELS } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

interface NavGroupProps {
  title: string;
  items: NavItem[];
}

function NavGroup({ title, items }: NavGroupProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="space-y-1">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={`sidebar-item w-full justify-start ${
                isActive ? 'sidebar-item-active' : ''
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const navGroups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: '工作台',
      items: [
        { label: '工作台', icon: LayoutDashboard, href: '/dashboard' },
      ],
    },
    {
      title: '患者管理',
      items: [
        { label: '患者登记', icon: UserPlus, href: '/patients/register' },
        { label: '患者列表', icon: Users, href: '/patients' },
      ],
    },
    {
      title: '核验流程',
      items: [
        { label: '筛查核验', icon: ClipboardCheck, href: '/screening' },
        { label: '复核确认', icon: FileSearch, href: '/review' },
        { label: '预约排班', icon: CalendarClock, href: '/scheduling' },
        { label: '结果回传', icon: ArrowLeftRight, href: '/callback' },
      ],
    },
    {
      title: '数据统计',
      items: [
        { label: '统计报表', icon: BarChart3, href: '/statistics' },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-3 bg-medical-800 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-medical-500/20">
          <Stethoscope className="h-5 w-5 text-medical-200" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">MRI 核验平台</h1>
          <p className="text-[11px] text-medical-300">智能预约核验系统</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-4">
        {navGroups.map((group) => (
          <NavGroup key={group.title} title={group.title} items={group.items} />
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-medical-100 text-medical-700">
            <span className="text-sm font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name || '未登录'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.role ? USER_ROLE_LABELS[user.role] : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
