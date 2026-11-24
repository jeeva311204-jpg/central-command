import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

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
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-industrial-50 dark:bg-industrial-950 text-industrial-900 dark:text-industrial-100 transition-colors">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
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
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
