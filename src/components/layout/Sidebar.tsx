import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Car,
  Bus,
  MapPin,
  Calendar,
  BookOpen,
  CreditCard,
  Gift,
  Bell,
  FileText,
  BarChart2,
  ClipboardList,
  Settings,
  HeadphonesIcon,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  LogOut,
  Truck,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useState, type ReactNode } from 'react';

interface NavItem {
  label: string;
  path?: string;
  icon: ReactNode;
  roles?: string[];
  children?: Omit<NavItem, 'icon' | 'children'>[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
  {
    label: 'Administration',
    icon: <ShieldCheck className="w-5 h-5" />,
    roles: ['super_admin'],
    children: [
      { label: 'Admins', path: '/admins' },
    ],
  },
  { label: 'Users', path: '/users', icon: <Users className="w-5 h-5" /> },
  { label: 'Drivers', path: '/drivers', icon: <Car className="w-5 h-5" /> },
  { label: 'Buses', path: '/buses', icon: <Bus className="w-5 h-5" /> },
  {
    label: 'Operations',
    icon: <MapPin className="w-5 h-5" />,
    children: [
      { label: 'Routes', path: '/routes' },
      { label: 'Locations', path: '/locations' },
    ],
  },
  { label: 'Rides', path: '/rides', icon: <Calendar className="w-5 h-5" /> },
  { label: 'Bookings', path: '/bookings', icon: <BookOpen className="w-5 h-5" /> },
  { label: 'Payments', path: '/payments', icon: <CreditCard className="w-5 h-5" /> },
  { label: 'Rentals', path: '/rentals', icon: <Truck className="w-5 h-5" /> },
  { label: 'Packages', path: '/packages', icon: <Package className="w-5 h-5" /> },
  { label: 'Referrals', path: '/referrals', icon: <Gift className="w-5 h-5" /> },
  { label: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" /> },
  { label: 'Content', path: '/content', icon: <FileText className="w-5 h-5" /> },
  { label: 'Reports', path: '/reports', icon: <BarChart2 className="w-5 h-5" /> },
  { label: 'Audit Logs', path: '/audit-logs', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Support', path: '/support', icon: <HeadphonesIcon className="w-5 h-5" /> },
  { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
];

interface GroupItemProps {
  item: NavItem;
  currentRole: string;
}

function GroupItem({ item, currentRole }: GroupItemProps) {
  const [open, setOpen] = useState(false);
  if (item.roles && !item.roles.includes(currentRole)) return null;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="sidebar-link w-full"
      >
        <span className="sidebar-link-icon">{item.icon}</span>
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && (
        <div className="ml-8 mt-1 flex flex-col gap-0.5">
          {item.children?.map((child) => (
            <NavLink
              key={child.path}
              to={child.path!}
              className={({ isActive }) =>
                cn('sidebar-link text-xs py-2', isActive && 'active')
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { admin, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-60 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-700/60 flex-shrink-0">
        <img src="/logo.png" alt="Comfort Me" className="w-8 h-8 rounded-lg object-contain" />
        <div>
          <p className="text-white font-bold text-sm leading-none">Comfort Me</p>
          <p className="text-slate-400 text-xs mt-0.5">Admin Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          if (item.children) {
            return <GroupItem key={item.label} item={item} currentRole={admin?.role ?? ''} />;
          }
          if (item.roles && !item.roles.includes(admin?.role ?? '')) return null;
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              end={item.path === '/'}
              className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Admin profile + logout */}
      <div className="border-t border-slate-700/60 px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {admin?.first_name?.[0]}{admin?.last_name?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white font-medium truncate">
              {admin?.first_name} {admin?.last_name}
            </p>
            <p className="text-xs text-slate-400 truncate">{admin?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="sidebar-link w-full mt-1"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
