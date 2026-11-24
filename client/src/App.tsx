import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  GitPullRequest,
  Menu,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MobileNavProvider, useMobileNav } from './context/MobileNavContext';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProposalsList } from './pages/Proposals/ProposalsList';
import { ProposalCreate } from './pages/Proposals/ProposalCreate';
import { ProposalDetail } from './pages/Proposals/ProposalDetail';
import { Changes4MList } from './pages/Changes4M/Changes4MList';
import { Change4MCreate } from './pages/Changes4M/Change4MCreate';
import { Change4MDetail } from './pages/Changes4M/Change4MDetail';
import { QuotationComparison } from './pages/Procurement/QuotationComparison';
import { MachineComparison } from './pages/Procurement/MachineComparison';
import { PurchaseOrders } from './pages/Procurement/PurchaseOrders';
import { DeliveryTracking } from './pages/DeliveryAssets/DeliveryTracking';
import { AssetRegister } from './pages/DeliveryAssets/AssetRegister';
import { PostAuditList } from './pages/PostAudit/PostAuditList';
import { StaffPerformance } from './pages/Performance/StaffPerformance';
import { WorkflowAdmin } from './pages/Workflows/WorkflowAdmin';
import { DocumentRepository } from './pages/Documents/DocumentRepository';
import { AuditLogViewer } from './pages/AuditLogs/AuditLogViewer';
import { SimulatedEmailLog } from './pages/Notifications/SimulatedEmailLog';

function MobileBottomNav() {
  const { toggle } = useMobileNav();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-industrial-900/95 backdrop-blur-md border-t border-industrial-200 dark:border-industrial-800 py-1.5 px-3 flex items-center justify-around shadow-lg">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
            isActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-industrial-500 dark:text-industrial-400 hover:text-industrial-800'
          }`
        }
      >
        <LayoutDashboard className="w-5 h-5" />
        <span>Dashboard</span>
      </NavLink>

      <NavLink
        to="/proposals"
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
            isActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-industrial-500 dark:text-industrial-400 hover:text-industrial-800'
          }`
        }
      >
        <FileSpreadsheet className="w-5 h-5" />
        <span>Proposals</span>
      </NavLink>

      <NavLink
        to="/proposals/new"
        className="flex flex-col items-center gap-0.5 -mt-3 text-[10px] font-bold text-white transition-transform active:scale-95"
      >
        <div className="w-10 h-10 rounded-full bg-brand-600 shadow-md shadow-brand-600/40 flex items-center justify-center">
          <PlusCircle className="w-6 h-6 text-white" />
        </div>
        <span className="text-brand-600 dark:text-brand-400 mt-0.5 font-bold">New</span>
      </NavLink>

      <NavLink
        to="/changes4m"
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
            isActive
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-industrial-500 dark:text-industrial-400 hover:text-industrial-800'
          }`
        }
      >
        <GitPullRequest className="w-5 h-5" />
        <span>4M Change</span>
      </NavLink>

      <button
        onClick={toggle}
        className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-industrial-500 dark:text-industrial-400 hover:text-industrial-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
        <span>Menu</span>
      </button>
    </nav>
  );
}

function ProtectedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-industrial-50 dark:bg-industrial-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-industrial-50 dark:bg-industrial-950 text-industrial-900 dark:text-industrial-100 transition-colors">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MobileNavProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/welcome" element={<Landing />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/proposals" element={<ProposalsList />} />
                <Route path="/proposals/new" element={<ProposalCreate />} />
                <Route path="/proposals/:id" element={<ProposalDetail />} />
                <Route path="/changes4m" element={<Changes4MList />} />
                <Route path="/changes4m/new" element={<Change4MCreate />} />
                <Route path="/changes4m/:id" element={<Change4MDetail />} />
                <Route path="/procurement/comparison" element={<QuotationComparison />} />
                <Route path="/procurement/machine-matrix" element={<MachineComparison />} />
                <Route path="/procurement/orders" element={<PurchaseOrders />} />
                <Route path="/delivery" element={<DeliveryTracking />} />
                <Route path="/assets" element={<AssetRegister />} />
                <Route path="/post-audits" element={<PostAuditList />} />
                <Route path="/staff-performance" element={<StaffPerformance />} />
                <Route path="/workflows/admin" element={<WorkflowAdmin />} />
                <Route path="/documents" element={<DocumentRepository />} />
                <Route path="/audit-logs" element={<AuditLogViewer />} />
                <Route path="/emails" element={<SimulatedEmailLog />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MobileNavProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
