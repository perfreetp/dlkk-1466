import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Bell,
  Search,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import useAuthStore from '@/stores/authStore';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopbarProps {
  items?: BreadcrumbItem[];
}

function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" />
            )}
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                }
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function Topbar({ items = [] }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuthStore();
  const unreadCount = 3;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center">
        {items.length > 0 && <Breadcrumb items={items} />}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <button className="relative rounded-md p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button className="rounded-md p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground">
          <Search className="h-5 w-5" />
        </button>

        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        <div className="ml-2 flex items-center gap-3 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-medical-500 text-white">
            <span className="text-sm font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
