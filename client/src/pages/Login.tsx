import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('director@changeflow.com');
  const [password, setPassword] = useState('ChangeFlow2026!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { name: 'Aditya Birla', role: 'Management', email: 'director@changeflow.com', desc: 'Director - Executive CAPEX Sanctions' },
    { name: 'Rajesh Sharma', role: 'HOD', email: 'hod.prod@changeflow.com', desc: 'Production HOD - Budget Approvals' },
    { name: 'Ananya Verma', role: 'Engineer', email: 'eng.tooling@changeflow.com', desc: 'Tooling Lead - Tech Evaluations' },
    { name: 'Vikram Patel', role: 'Finance', email: 'finance.lead@changeflow.com', desc: 'Finance Lead - ROI, NPV & IRR' },
    { name: 'Meera Iyer', role: 'Procurement', email: 'procure.head@changeflow.com', desc: 'Procurement Head - Quotes & POs' },
    { name: 'Suresh Nair', role: 'Quality', email: 'qa.lead@changeflow.com', desc: 'QA Lead - 4M & FAT Verification' },
    { name: 'Manoj Kumar', role: 'Maintenance', email: 'maint.lead@changeflow.com', desc: 'Maintenance Lead - AMC & Assets' },
    { name: 'Rahul Singh', role: 'Employee', email: 'operator1@changeflow.com', desc: 'Production Operator - Initiator' },
    { name: 'System Admin', role: 'Admin', email: 'admin@changeflow.com', desc: 'Admin - Full Overrides & Config' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, 'ChangeFlow2026!');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-500/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="mb-2">
          <Link to="/welcome" className="inline-flex items-center gap-1.5 text-xs text-industrial-400 hover:text-white transition-colors">
            ← Back to Product Overview
          </Link>
        </div>
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl shadow-brand-500/25 mb-4">
          <Layers className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          ChangeFlow Enterprise
        </h2>
        <p className="mt-2 text-sm text-industrial-400">
          Integrated 4M Change Management, CAPEX & Procurement Automation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-industrial-300 mb-1">
                Corporate Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-industrial-950 border border-industrial-700 text-white placeholder-industrial-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-industrial-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-industrial-950 border border-industrial-700 text-white placeholder-industrial-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/30 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to ChangeFlow'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Demo Login Selector for Hackathon Judges */}
          <div className="pt-6 border-t border-industrial-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-industrial-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-brand-400" />
                Instant 1-Click Demo Personas
              </span>
              <span className="text-[10px] text-industrial-500 font-mono">Password: ChangeFlow2026!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account.email)}
                  className="p-2.5 text-left rounded-lg bg-industrial-950/80 hover:bg-industrial-800 border border-industrial-800 hover:border-brand-500/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-brand-300">
                      {account.role}
                    </span>
                    <span className="text-[10px] opacity-60 font-mono">→</span>
                  </div>
                  <div className="text-[11px] text-industrial-300 font-medium truncate">
                    {account.name}
                  </div>
                  <div className="text-[9px] text-industrial-500 truncate">
                    {account.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
