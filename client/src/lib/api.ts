const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('changeflow_token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type if body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {
      // not JSON
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  switchDemoUser: (email: string) => apiRequest('/auth/switch-demo-user', { method: 'POST', body: JSON.stringify({ email }) }),
  getMe: () => apiRequest('/auth/me'),
  getDemoUsers: () => apiRequest('/auth/demo-users'),

  // Proposals
  getProposals: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/proposals${qs ? `?${qs}` : ''}`);
  },
  getProposalTypes: () => apiRequest('/proposals/types'),
  getProposal: (id: string) => apiRequest(`/proposals/${id}`),
  createProposal: (data: any) => apiRequest('/proposals', { method: 'POST', body: JSON.stringify(data) }),
  updateProposal: (id: string, data: any) => apiRequest(`/proposals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Financial
  calculateFinancials: (data: any) => apiRequest('/financial/calculate', { method: 'POST', body: JSON.stringify(data) }),
  checkBudget: (data: any) => apiRequest('/financial/budget-check', { method: 'POST', body: JSON.stringify(data) }),

  // Workflows
  getWorkflowTemplates: () => apiRequest('/workflows/templates'),
  updateWorkflowStage: (stageId: string, data: any) => apiRequest(`/workflows/stages/${stageId}`, { method: 'PUT', body: JSON.stringify(data) }),
  executeApprovalAction: (proposalId: string, data: any) => apiRequest(`/workflows/proposals/${proposalId}/action`, { method: 'POST', body: JSON.stringify(data) }),
  getDelegations: () => apiRequest('/workflows/delegations'),
  createDelegation: (data: any) => apiRequest('/workflows/delegations', { method: 'POST', body: JSON.stringify(data) }),
  revokeDelegation: (id: string) => apiRequest(`/workflows/delegations/${id}`, { method: 'DELETE' }),
  runSlaCheck: () => apiRequest('/workflows/sla-check', { method: 'POST' }),

  // 4M Changes
  getChanges4M: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/changes4m${qs ? `?${qs}` : ''}`);
  },
  getChange4M: (id: string) => apiRequest(`/changes4m/${id}`),
  createChange4M: (data: any) => apiRequest('/changes4m', { method: 'POST', body: JSON.stringify(data) }),
  addTaskToChange: (changeId: string, data: any) => apiRequest(`/changes4m/${changeId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTaskStatus: (taskId: string, data: any) => apiRequest(`/changes4m/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  closeChange4M: (id: string, data: any) => apiRequest(`/changes4m/${id}/close`, { method: 'POST', body: JSON.stringify(data) }),

  // Vendors & Quotations
  getVendors: () => apiRequest('/vendors'),
  createVendor: (data: any) => apiRequest('/vendors', { method: 'POST', body: JSON.stringify(data) }),
  getQuotationsForProposal: (proposalId: string) => apiRequest(`/vendors/quotations/proposal/${proposalId}`),
  createQuotation: (data: any) => apiRequest('/vendors/quotations', { method: 'POST', body: JSON.stringify(data) }),
  compareQuotations: (data: any) => apiRequest('/vendors/quotations/compare', { method: 'POST', body: JSON.stringify(data) }),
  acceptQuotation: (id: string) => apiRequest(`/vendors/quotations/${id}/accept`, { method: 'POST' }),

  // Purchase Orders
  getPurchaseOrders: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/purchase-orders${qs ? `?${qs}` : ''}`);
  },
  generatePO: (data: any) => apiRequest('/purchase-orders/generate', { method: 'POST', body: JSON.stringify(data) }),
  updatePOStatus: (id: string, data: any) => apiRequest(`/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Delivery & Commissioning
  getDeliveries: () => apiRequest('/deliveries'),
  updateDeliveryStep: (id: string, data: any) => apiRequest(`/deliveries/${id}/step`, { method: 'PATCH', body: JSON.stringify(data) }),
  signoffDelivery: (id: string, data: any) => apiRequest(`/deliveries/${id}/signoff`, { method: 'POST', body: JSON.stringify(data) }),

  // Assets & Maintenance
  getAssets: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/assets${qs ? `?${qs}` : ''}`);
  },
  getAsset: (id: string) => apiRequest(`/assets/${id}`),
  getMaintenanceSchedules: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/assets/maintenance/all${qs ? `?${qs}` : ''}`);
  },
  createMaintenanceSchedule: (data: any) => apiRequest('/assets/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  completeMaintenance: (id: string) => apiRequest(`/assets/maintenance/${id}/complete`, { method: 'PATCH' }),

  // Post-Investment Audits
  getPostAudits: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/post-audits${qs ? `?${qs}` : ''}`);
  },
  conductPostAudit: (id: string, data: any) => apiRequest(`/post-audits/${id}/conduct`, { method: 'POST', body: JSON.stringify(data) }),

  // CAPEX Dashboard
  getCapexMetrics: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/capex/metrics${qs ? `?${qs}` : ''}`);
  },

  // Staff Performance
  getStaffPerformance: () => apiRequest('/staff-performance'),

  // Notifications & Emails
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/notifications/mark-all-read', { method: 'POST' }),
  getSimulatedEmails: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/notifications/emails${qs ? `?${qs}` : ''}`);
  },

  // Documents
  getDocuments: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/documents${qs ? `?${qs}` : ''}`);
  },
  uploadDocument: (formData: FormData) => apiRequest('/documents/upload', { method: 'POST', body: formData }),

  // Audit Logs
  getAuditLogs: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/audit-logs${qs ? `?${qs}` : ''}`);
  },

  // Global Search
  search: (query: string) => apiRequest(`/search?q=${encodeURIComponent(query)}`),

  // Excel Downloads
  downloadCapexExcel: async () => {
    const token = getToken();
    const res = await fetch('/api/capex/export/excel', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ChangeFlow-CAPEX-Dashboard.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadProposalsExcel: async () => {
    const token = getToken();
    const res = await fetch('/api/proposals/export/excel', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ChangeFlow-Proposals-Register.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
