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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const { user } = useAuth();
  const roleName = user?.role?.name || user?.role || '';

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/proposals', label: 'Proposals & CAPEX', icon: FileSpreadsheet, badge: '14 Types' },
    { to: '/changes4m', label: '4M Change Requests', icon: GitPullRequest },
    { to: '/procurement/comparison', label: 'Quotation Comparison', icon: Scale },
    { to: '/procurement/machine-matrix', label: 'Machine Comparison', icon: Box },
    { to: '/procurement/orders', label: 'Purchase Orders', icon: ShoppingCart },
    { to: '/delivery', label: 'Delivery & Commissioning', icon: Truck },
    { to: '/assets', label: 'Asset Register & AMC', icon: Box },
    { to: '/post-audits', label: 'Post-Investment Audits', icon: FileCheck },
    { to: '/staff-performance', label: 'Staff Performance', icon: Award },
    { to: '/workflows/admin', label: 'Workflow Rules & Thresholds', icon: Sliders },
    { to: '/documents', label: 'Document Repository', icon: FolderOpen },
    { to: '/audit-logs', label: 'Audit Trail', icon: History },
    { to: '/emails', label: 'Simulated Email Log', icon: Mail },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-industrial-900 border-r border-industrial-200 dark:border-industrial-800 flex flex-col justify-between h-[calc(100vh-57px)] sticky top-[57px] select-none">
      <div className="p-3 space-y-4 overflow-y-auto">
        {/* Quick Action Button */}
        <NavLink
          to="/proposals/new"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm shadow-brand-500/30 transition-all hover:scale-[1.02]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New CAPEX Proposal</span>
        </NavLink>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-industrial-400">
            Enterprise Modules
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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
      </div>

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
  );
}
