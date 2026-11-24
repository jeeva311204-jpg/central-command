import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Cpu,
  GitBranch,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-industrial-950 text-white flex flex-col selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-brand-600/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute top-[600px] right-[-100px] w-[500px] h-[500px] bg-emerald-600/5 blur-[140px] pointer-events-none rounded-full" />

      {/* Navigation Header */}
      <header className="relative z-20 border-b border-industrial-800/80 backdrop-blur-md bg-industrial-950/60 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-tight">
                ChangeFlow <span className="text-brand-400 font-semibold text-xs ml-1 uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/20">Enterprise</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm text-industrial-400 font-medium">
              <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
              <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 flex flex-col justify-center">
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-industrial-900 border border-industrial-800 text-xs text-industrial-300 font-medium mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
            <span>Industrial 4.0 Change & CAPEX Governance</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Modern 4M Change Control & <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-emerald-400">
              CAPEX Automation
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-industrial-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate approval bottlenecks. One unified engine for Man, Machine, Material & Method changes, multi-tier approvals, real-time NPV/IRR, and procurement.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-xl shadow-brand-500/25 transition-all duration-150 text-base hover:scale-[1.02] active:scale-[0.98]"
            >
              Enter Platform
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium bg-industrial-900 hover:bg-industrial-800 text-industrial-300 hover:text-white border border-industrial-800 transition-all text-sm"
            >
              Explore Capabilities
            </a>
          </div>

          {/* Key Stats Bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-industrial-900/60 border border-industrial-800/80 backdrop-blur-sm text-left">
            <div className="p-3">
              <div className="text-2xl font-extrabold text-white font-mono">14</div>
              <div className="text-xs text-industrial-400 mt-0.5">Proposal Types</div>
            </div>
            <div className="p-3 border-l border-industrial-800/80">
              <div className="text-2xl font-extrabold text-brand-400 font-mono">5×5</div>
              <div className="text-xs text-industrial-400 mt-0.5">4M Risk Matrix</div>
            </div>
            <div className="p-3 border-l border-industrial-800/80">
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">Real-Time</div>
              <div className="text-xs text-industrial-400 mt-0.5">NPV, IRR & Payback</div>
            </div>
            <div className="p-3 border-l border-industrial-800/80">
              <div className="text-2xl font-extrabold text-white font-mono">ACID</div>
              <div className="text-xs text-industrial-400 mt-0.5">Transaction Ledger</div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Enterprise Pillars
            </h2>
            <p className="text-sm text-industrial-400 mt-2 max-w-lg mx-auto">
              Engineered to replace scattered spreadsheets and manual email approvals with transparent digital workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-industrial-900/70 border border-industrial-800 hover:border-industrial-700 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">4M Change Management</h3>
              <p className="text-sm text-industrial-400 mt-2 leading-relaxed">
                Log and assess Man, Machine, Material, and Method changes with dynamic 5×5 severity/probability risk scoring, verification checklists, and FAT audits.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-industrial-900/70 border border-industrial-800 hover:border-industrial-700 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GitBranch className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Configurable Workflow Engine</h3>
              <p className="text-sm text-industrial-400 mt-2 leading-relaxed">
                Workflows are stored as data. Threshold routing (≤₹1L, ₹1L–₹10L, &gt;₹10L), SLA tracking, auto-escalations, and version snapshots ensure zero bottlenecks.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-industrial-900/70 border border-industrial-800 hover:border-industrial-700 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Financial Evaluation Engine</h3>
              <p className="text-sm text-industrial-400 mt-2 leading-relaxed">
                Real-time calculations for Simple & Discounted Payback, ROI, NPV, IRR via Newton-Raphson, and straight-line depreciation with department budget alerts.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-industrial-900/70 border border-industrial-800 hover:border-industrial-700 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Procurement & Asset Register</h3>
              <p className="text-sm text-industrial-400 mt-2 leading-relaxed">
                Side-by-side weighted vendor quotation comparisons, Purchase Order dispatch tracking, and automatic asset registration with warranty alerts upon commissioning.
              </p>
            </div>
          </div>
        </section>

        {/* Minimal Bottom CTA */}
        <section className="max-w-4xl mx-auto px-6 py-12 text-center border-t border-industrial-900">
          <div className="p-8 rounded-3xl bg-gradient-to-b from-industrial-900 to-industrial-950 border border-industrial-800 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white">Ready for Demo & Operations?</h2>
              <p className="text-industrial-400 text-sm mt-2 max-w-md mx-auto">
                Sign in with our instant 1-click demo personas or administrator credentials.
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25 transition-all text-sm hover:scale-[1.02]"
                >
                  Go to Login Screen
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-industrial-900 py-6 text-center text-xs text-industrial-500 relative z-10">
        <p>© 2026 ChangeFlow Enterprise • Integrated 4M Change Management, CAPEX & Procurement Automation</p>
      </footer>
    </div>
  );
}
