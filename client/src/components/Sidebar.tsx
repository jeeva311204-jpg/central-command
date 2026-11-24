import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  GitPullRequest,
  ShoppingCart,
  Truck,
  Box,
  FileCheck,
  Award,
  Sliders,
  FolderOpen,
  History,
  Mail,
  PlusCircle,
  Scale,
  Users,
  Building,
  CheckSquare,
  Wrench,
  Cpu,
  TrendingUp,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMobileNav } from '../context/MobileNavContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { isOpen, close } = useMobileNav();

  const rawRole = user?.role;
  const roleName: string = typeof rawRole === 'object' && rawRole ? (rawRole as any).name : (typeof rawRole === 'string' ? rawRole : 'Employee');
  const deptName = user?.department?.name || user?.department?.code || '';

  // Tailored role workspace labels
  const roleHeaders: Record<string, { title: string; subtitle: string; icon: any }> = {
    Management: { title: 'Executive Board', subtitle: 'Company-Wide CAPEX', icon: Building },
    Admin: { title: 'Platform Admin', subtitle: 'System & Hierarchy', icon: Sliders },
    HOD: { title: 'Department Manager', subtitle: deptName || 'Department HOD', icon: Users },
    Engineer: { title: 'Engineering Specialist', subtitle: 'CAD, Dev & Tooling', icon: Cpu },
    Maintenance: { title: 'Plant Maintenance', subtitle: 'Equipment & Spares', icon: Wrench },
    Finance: { title: 'Finance Controller', subtitle: 'CAPEX & Viability', icon: TrendingUp },
    Quality: { title: 'Quality Assurance', subtitle: 'FAT & Metrology', icon: Award },
    Procurement: { title: 'Procurement Head', subtitle: 'Quotes & Orders', icon: ShoppingCart },
    Employee: { title: 'Shopfloor Operator', subtitle: 'Shift Execution', icon: CheckSquare },
  };

  const headerInfo = roleHeaders[roleName] || roleHeaders.Employee;
  const RoleIcon = headerInfo.icon;

  const navItems = [
    { to: '/', label: 'Role Dashboard', icon: LayoutDashboard },
    { to: '/proposals', label: 'Proposals & Requisitions', icon: FileSpreadsheet, badge: '14 Types' },
    { to: '/changes4m', label: '4M Change Control', icon: GitPullRequest },
    { to: '/procurement/comparison', label: 'Quotation Comparison', icon: Scale },
    { to: '/procurement/machine-matrix', label: 'Machine Comparison Matrix', icon: Box },
    { to: '/procurement/orders', label: 'Purchase Orders', icon: ShoppingCart },
    { to: '/delivery', label: 'Delivery & Commissioning', icon: Truck },
    { to: '/assets', label: 'Asset Register & AMC', icon: Box },
    { to: '/post-audits', label: 'Post-Investment Audits', icon: FileCheck },
    { to: '/staff-performance', label: 'Checklist & Performance', icon: Award },
    { to: '/workflows/admin', label: 'Workflow Rules & Thresholds', icon: Sliders },
    { to: '/documents', label: 'Dossier Repository', icon: FolderOpen },
    { to: '/audit-logs', label: 'Immutable Audit Trail', icon: History },
    { to: '/emails', label: 'Simulated Notification Log', icon: Mail },
  ];

  const renderNavContent = (isMobile: boolean = false) => (
    <div className="p-3 space-y-4 overflow-y-auto flex-1">
      {/* Mobile Drawer Header with Close Button */}
      {isMobile && (
        <div className="flex items-center justify-between pb-2 border-b border-industrial-200 dark:border-industrial-800">
          <div className="text-xs font-bold text-industrial-900 dark:text-white uppercase tracking-wider">
            Menu Navigation
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg text-industrial-500 hover:text-industrial-900 dark:hover:text-white hover:bg-industrial-100 dark:hover:bg-industrial-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Role Workspace Banner */}
      <div className="p-3 rounded-xl bg-industrial-50 dark:bg-industrial-950/60 border border-industrial-200 dark:border-industrial-800 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
          <RoleIcon className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <div className="text-xs font-bold text-industrial-900 dark:text-white truncate">
            {headerInfo.title}
          </div>
          <div className="text-[10px] text-industrial-400 truncate">
            {headerInfo.subtitle}
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <NavLink
        to="/proposals/new"
        onClick={() => isMobile && close()}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm shadow-brand-500/30 transition-all hover:scale-[1.02]"
      >
        <PlusCircle className="w-4 h-4" />
        <span>New Proposal to Manager</span>
      </NavLink>

      {/* Navigation Section */}
      <nav className="space-y-1">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-industrial-400">
          Navigation Modules
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => isMobile && close()}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold border-l-4 border-brand-600'
                  : 'text-industrial-600 dark:text-industrial-400 hover:text-industrial-900 dark:hover:text-industrial-100 hover:bg-industrial-100/70 dark:hover:bg-industrial-800/60'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <item.icon className="w-4 h-4 opacity-80" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-industrial-200 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Mobile Logout Button in Drawer */}
      {isMobile && (
        <div className="pt-3 border-t border-industrial-200 dark:border-industrial-800">
          <button
            onClick={() => {
              close();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out ({user?.name})</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP SIDEBAR (Visible on md and larger) */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white dark:bg-industrial-900 border-r border-industrial-200 dark:border-industrial-800 flex-col justify-between h-[calc(100vh-57px)] sticky top-[57px] select-none">
        {renderNavContent(false)}

        {/* Footer System Info */}
        <div className="p-3 border-t border-industrial-100 dark:border-industrial-800 text-center">
          <div className="text-[11px] font-semibold text-industrial-800 dark:text-industrial-200">
            Industrial 4.0 Standard
          </div>
          <div className="text-[10px] text-industrial-400 font-mono mt-0.5">
            MongoDB Atlas • React 18 • Node 24
          </div>
        </div>
      </aside>

      {/* 2. MOBILE SLIDE-OVER DRAWER (Visible when isOpen on mobile screens) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={close}
          />

          {/* Drawer content */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-industrial-900 border-r border-industrial-200 dark:border-industrial-800 flex flex-col justify-between z-50 shadow-2xl overflow-y-auto">
            {renderNavContent(true)}

            {/* Mobile Drawer Footer */}
            <div className="p-3 border-t border-industrial-100 dark:border-industrial-800 text-center">
              <div className="text-[11px] font-semibold text-industrial-800 dark:text-industrial-200">
                ChangeFlow Enterprise
              </div>
              <div className="text-[10px] text-industrial-400 font-mono mt-0.5">
                Role: {roleName}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
