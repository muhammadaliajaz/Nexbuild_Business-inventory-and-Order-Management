import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ArrowLeftRight,
  Truck,
  Users,
  FileSpreadsheet,
  UserCheck,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { BrandLogo } from './BrandLogo';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'inventory'
  | 'suppliers'
  | 'customers'
  | 'reports'
  | 'users';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as NavTab, label: 'Products', icon: Package },
    { id: 'orders' as NavTab, label: 'Orders', icon: ShoppingCart },
    { id: 'inventory' as NavTab, label: 'Stock Movements', icon: ArrowLeftRight },
    { id: 'suppliers' as NavTab, label: 'Suppliers', icon: Truck },
    { id: 'customers' as NavTab, label: 'Customers', icon: Users },
    { id: 'reports' as NavTab, label: 'Reports', icon: FileSpreadsheet },
    ...(user?.role === 'admin'
      ? [{ id: 'users' as NavTab, label: 'Team Members', icon: UserCheck }]
      : []),
  ];

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200">
        <BrandLogo size="sm" />
        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onTabChange(item.id);
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left font-medium ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Current User & Logout */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 capitalize">{user?.role} • {user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen select-none">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-lg z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
