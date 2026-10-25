import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Server,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronRight,
  ArrowRight,
  HardDrive,
  Radio,
  Activity,
  Database,
  Terminal,
} from 'lucide-react';
export const LandingPage: React.FC = () => {
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [activeTab, setActiveTab] = useState<'docker' | 'clone'>('docker');

  const dockerCommand = `docker compose up -d`;
  const gitCommand = `git clone https://github.com/iam-656/SecurePM.git
cd SecurePM && docker compose up -d`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* 1. STICKY NAVIGATION BAR */}
      <header className="sticky top-0 z-50 w-full bg-[#09090b]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-sm shadow-emerald-500/20 group-hover:border-emerald-500/60 transition-all">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  SecurePM
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  100% Air-Gapped
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Anchors */}
          {/* Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Features
            </a>
            <a href="#security" className="hover:text-emerald-400 transition-colors">
              Security
            </a>
            <a href="#architecture" className="hover:text-emerald-400 transition-colors">
              Architecture
            </a>
            <a href="#deployment" className="hover:text-emerald-400 transition-colors">
              Deployment
            </a>
            <Link to="/guide" className="hover:text-emerald-400 transition-colors font-medium text-emerald-400 flex items-center gap-1">
              <span>Guidelines</span>
            </Link>
          </nav>

          {/* CTA Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/guide"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <span>Get Started</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 2. HERO SECTION */}
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-36 border-b border-slate-800/60">
          {/* Subtle Ambient Glow & Grid Matrix */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
              backgroundSize: '32px 32px',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Pre-headline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 shadow-sm shadow-emerald-500/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>BUILT FOR REGULATED ENVIRONMENTS</span>
            </div>

            {/* Main H1 Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
              Project Management.{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Zero Cloud. Zero Compromise.
              </span>
            </h1>

            {/* Subheadline H2 */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed mb-10">
              The 100% on-premises, air-gapped alternative to bloated SaaS tools. Keep your roadmaps,
              internal data, and mission-critical workflows entirely within your private infrastructure.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                to="/guide"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-xl shadow-emerald-500/25 transition-all active:scale-95"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
              <a
                href="#architecture"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-all active:scale-95"
              >
                <span>View Architecture</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* 3D Angled Mockup with Air-Gap Verification Monitor */}
            <div className="relative max-w-5xl mx-auto mt-4 rounded-2xl p-2 bg-gradient-to-b from-slate-700/40 via-slate-800/20 to-slate-950 border border-slate-700/60 shadow-2xl shadow-emerald-950/20">
              <div className="rounded-xl bg-slate-950/90 border border-slate-800/80 overflow-hidden text-left">
                {/* Mock Browser/Window Header */}
                <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/60" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    <span className="text-xs text-slate-400 font-mono ml-2">https://securepm.internal.lan/projects</span>
                  </div>

                  {/* Real-time Telemetry Monitor Chip */}
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>Air-Gap Active: 0 Outbound Calls</span>
                  </div>
                </div>

                {/* Mock Kanban Board Interface */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950">
                  {/* Column 1: TODO */}
                  <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/80">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">To Do</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">2</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-mono text-emerald-400">SEC-104</span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">HIGH</span>
                        </div>
                        <p className="font-semibold text-slate-200">Enforce hardware token MFA across root admin roles</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-mono text-emerald-400">OPS-089</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">MED</span>
                        </div>
                        <p className="font-semibold text-slate-200">Scheduled backup of PostgreSQL 16 volume</p>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: IN PROGRESS */}
                  <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/80">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">In Progress</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">1</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs shadow-md shadow-emerald-500/5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-mono text-emerald-400">ENG-212</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">HIGH</span>
                      </div>
                      <p className="font-semibold text-slate-200">Zero-latency WebSocket delta broadcast with optimistic locking</p>
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Assignee: @alex</span>
                        <span className="text-emerald-400 font-mono">v4 Lock OK</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: DONE */}
                  <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/80">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Done</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">2</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs opacity-85">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-mono text-emerald-400">SEC-098</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">DONE</span>
                        </div>
                        <p className="font-semibold text-slate-300 line-through">Purge all external cloud analytics libraries</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs opacity-85">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-mono text-emerald-400">AUTH-042</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">DONE</span>
                        </div>
                        <p className="font-semibold text-slate-300 line-through">Enforce strict SameSite=STRICT HttpOnly cookies</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. THE ANTI-SAAS TRUST BAR */}
        <section className="py-12 bg-slate-950 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-8">
              Engineered for teams who cannot risk data leaving their network
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-center">
              <div className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs sm:text-sm font-semibold">
                <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Defense &amp; Aerospace</span>
              </div>
              <div className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs sm:text-sm font-semibold">
                <Activity className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Healthcare &amp; HIPAA</span>
              </div>
              <div className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs sm:text-sm font-semibold">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Finance &amp; Banking</span>
              </div>
              <div className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs sm:text-sm font-semibold">
                <Server className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Government Agencies</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. CORE VALUE PROPOSITION (STRIPE LAYOUT) */}
        <section id="features" className="py-24 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-28">
            {/* Block 1: Absolute Data Sovereignty */}
            <div id="architecture" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold mb-4 border border-emerald-500/30">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>DATA SOVEREIGNTY</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                  Your Network. Your Rules.
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                  No telemetry. No external SMTP relays. No third-party S3 buckets. SecurePM runs
                  entirely within your private network boundary. If your servers are completely
                  air-gapped from the public internet, SecurePM operates flawlessly without warnings.
                </p>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Zero outbound analytical pings or crash reporters</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Local disk attachment store with SHA-256 integrity</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Standard PostgreSQL database with full customer ownership</span>
                  </li>
                </ul>
              </div>

              {/* Visual: Container Firewall Topology Diagram */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Public Cloud: Disconnected
                </div>
                <div className="border-2 border-dashed border-emerald-500/40 rounded-xl p-5 bg-slate-950/70">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 mb-4">
                    <Shield className="w-4 h-4" />
                    <span>AIR-GAPPED INFRASTRUCTURE BOUNDARY</span>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Server className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-xs font-bold text-white">Nginx SSL Gateway</div>
                          <div className="text-[10px] text-slate-400 font-mono">Port 443 / 8443 (Local HTTPS)</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">Active</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-cyan-400" />
                        <div>
                          <div className="text-xs font-bold text-white">Quarkus Vert.x API Server</div>
                          <div className="text-[10px] text-slate-400 font-mono">Java 21 • Zero Telemetry</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">Internal</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-amber-400" />
                        <div>
                          <div className="text-xs font-bold text-white">PostgreSQL 16 Database</div>
                          <div className="text-[10px] text-slate-400 font-mono">Local Storage Volume • Isolated</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">Persistent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Block 2: Enterprise-Grade Security (Auth Comparison) */}
            <div id="security" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Session Architecture Comparison
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Flawed SaaS */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Standard SaaS / SPAs</span>
                    </div>
                    <ul className="space-y-2 text-[11px] text-slate-400 leading-tight">
                      <li>• Vulnerable JWTs in <code className="text-rose-300 font-mono">localStorage</code></li>
                      <li>• Accessible to any XSS exploit or rogue browser plugin</li>
                      <li>• URL query token leakage on WebSockets</li>
                      <li>• Silent session invalidation delays</li>
                    </ul>
                  </div>

                  {/* SecurePM */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-3 shadow-md shadow-emerald-500/10">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>SecurePM Architecture</span>
                    </div>
                    <ul className="space-y-2 text-[11px] text-slate-300 leading-tight">
                      <li>• Strict <code className="text-emerald-300 font-mono">HttpOnly; SameSite=STRICT</code></li>
                      <li>• Untouchable by malicious client scripts</li>
                      <li>• Cookie validated directly on WebSocket upgrade</li>
                      <li>• Instant server-side session termination</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold mb-4 border border-emerald-500/30">
                  <Lock className="w-3.5 h-3.5" />
                  <span>XSS-RESISTANT DESIGN</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                  Security Isn&apos;t an Afterthought.
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                  While most modern web apps dump fragile JWT tokens into vulnerable browser
                  local storage, SecurePM utilizes stateful server sessions backed by Quarkus Vert.x.
                  Your authentication cookies are encrypted, locked from JavaScript access, and strictly verified.
                </p>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <div className="font-semibold text-white mb-1">CISO Compliance Guarantee:</div>
                  Zero tokens are ever written to <code className="text-emerald-400 font-mono">localStorage</code> or exposed in browser URLs, eliminating whole classes of credential-harvesting vulnerabilities.
                </div>
              </div>
            </div>

            {/* Block 3: Real-Time Conflict-Free Collaboration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold mb-4 border border-emerald-500/30">
                  <Zap className="w-3.5 h-3.5" />
                  <span>CONFLICT-FREE COLLABORATION</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                  Real-Time Updates. Never Lose Work.
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                  Built-in WebSockets patch task boards, sub-project hierarchies, and discussions
                  instantaneously across all connected operators. When two engineers edit simultaneously,
                  SecurePM&apos;s Optimistic Locking triggers a courteous resolution warning instead of silently overwriting someone&apos;s effort.
                </p>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Real-time Kanban synchronization across active sessions</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Optimistic locking version checking (<code className="text-emerald-400 font-mono text-xs">@Version</code>)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Agile parallel tracks and plan-driven phase-gated execution</span>
                  </div>
                </div>
              </div>

              {/* Visual: Real-Time Conflict Resolution Preview */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                  <span className="font-mono text-emerald-400">WebSocket Channel: /ws/projects/12</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Live
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span>Task: #42 Setup Hardware HSM</span>
                    <span className="text-[10px] font-mono text-slate-400">Version 3</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>User @sarah updated this task from another terminal. View changes?</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 italic">
                  Prevents catastrophic data loss during concurrent emergency deployments.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. ZERO-CONFIG DEPLOYMENT SECTION (VERCEL TERMINAL VIBE) */}
        <section id="deployment" className="py-24 bg-slate-950 border-b border-slate-800/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold mb-4 border border-emerald-500/30">
              <Terminal className="w-3.5 h-3.5" />
              <span>ZERO-CONFIG DEPLOYMENT</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Deploy in Minutes, Not Months.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-10">
              No bloated Kubernetes manifests. No cloud provider lock-in. Just standard Docker Compose
              with automated database migrations.
            </p>

            {/* Terminal Window Box */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-left max-w-3xl mx-auto">
              {/* Terminal Tabs & Actions */}
              <div className="h-11 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-700" />
                    <span className="w-3 h-3 rounded-full bg-slate-700" />
                    <span className="w-3 h-3 rounded-full bg-slate-700" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('docker')}
                      className={`px-2.5 py-1 text-xs font-mono rounded ${
                        activeTab === 'docker' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      docker-compose
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('clone')}
                      className={`px-2.5 py-1 text-xs font-mono rounded ${
                        activeTab === 'clone' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      quick-start
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(activeTab === 'docker' ? dockerCommand : gitCommand)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors p-1 rounded"
                  title="Copy command"
                >
                  {copiedCommand ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-mono">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="font-mono">Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Content */}
              <div className="p-6 font-mono text-sm text-slate-300 overflow-x-auto bg-[#0c0d10]">
                {activeTab === 'docker' ? (
                  <div className="space-y-1">
                    <p className="text-slate-500"># Start the full air-gapped stack (DB, Backend, Nginx SSL)</p>
                    <p>
                      <span className="text-emerald-400">$</span> docker compose up -d
                    </p>
                    <p className="text-slate-500 pt-2"># Access SecurePM at:</p>
                    <p className="text-cyan-400">&gt; http://localhost:8080</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-slate-500"># Clone &amp; launch local instance</p>
                    <p>
                      <span className="text-emerald-400">$</span> git clone https://github.com/iam-656/SecurePM.git
                    </p>
                    <p>
                      <span className="text-emerald-400">$</span> cd SecurePM &amp;&amp; docker compose up -d
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Stack Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <span className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
                Docker Ready
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
                PostgreSQL 16
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
                Quarkus 3.40 / Java 21
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
                Nginx Reverse Proxy
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
                mkcert Local SSL
              </span>
            </div>
          </div>
        </section>

        {/* 6. SECURITY & COMPLIANCE DEEP DIVE (FOR THE CISO) */}
        <section id="compliance" className="py-24 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold mb-4 border border-emerald-500/30">
                <Shield className="w-3.5 h-3.5" />
                <span>COMPLIANCE &amp; AUDIT</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                Security Isn&apos;t a Feature. It&apos;s the Foundation.
              </h2>
              <p className="text-slate-400 text-sm sm:text-base">
                Architectural choices verified to withstand internal penetration tests and air-gapped compliance reviews.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold mb-4 border border-emerald-500/20">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Session-Based Auth</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Quarkus Vert.x HTTP sessions with cryptographically random tokens. No browser localStorage JWT vulnerabilities.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold mb-4 border border-cyan-500/20">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">WebSocket Security</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time protocol upgrades authenticate using the active HttpOnly cookie. No query parameter token leakage in access logs.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold mb-4 border border-amber-500/20">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Local File Storage</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Project library assets and attachments are saved directly to encrypted local storage volumes, never outsourced to AWS S3.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold mb-4 border border-emerald-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Zero External Telemetry</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Operates completely isolated from the internet. No phone-home licensing checks or background data collection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FINAL CALL TO ACTION */}
        <section className="py-24 relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80">
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">
              Take Back Control of Your Project Data.
            </h2>
            <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Join the engineering and security teams who refuse to host their mission-critical roadmaps on public cloud infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/guide"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm sm:text-base font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-xl shadow-emerald-500/25 transition-all active:scale-95"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 8. ENTERPRISE FOOTER */}
      <footer id="docs" className="bg-[#09090b] text-slate-400 text-xs py-16 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-4">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>SecurePM</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                100% on-premises, air-gapped project management platform built for defense, finance, and regulated industries.
              </p>
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Air-Gap Verified</span>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-emerald-400 transition-colors">Features</a></li>
                <li><a href="#security" className="hover:text-emerald-400 transition-colors">XSS-Resistant Auth</a></li>
                <li><a href="#architecture" className="hover:text-emerald-400 transition-colors">Container Architecture</a></li>
                <li><a href="#deployment" className="hover:text-emerald-400 transition-colors">Deployment Specs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Developers</h4>
              <ul className="space-y-2">
                <li><Link to="/guide" className="hover:text-emerald-400 transition-colors">Self-Hosting Guide</Link></li>
                <li><a href="#deployment" className="hover:text-emerald-400 transition-colors">Docker Compose</a></li>
                <li><a href="https://github.com/iam-656/SecurePM" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">GitHub Repository</a></li>
                <li><a href="#compliance" className="hover:text-emerald-400 transition-colors">Air-Gap Verification</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Compliance</h4>
              <ul className="space-y-2">
                <li><a href="#security" className="hover:text-emerald-400 transition-colors">Data Sovereignty</a></li>
                <li><a href="#compliance" className="hover:text-emerald-400 transition-colors">Zero-Telemetry Policy</a></li>
                <li><a href="#compliance" className="hover:text-emerald-400 transition-colors">Role-Based Access Control</a></li>
                <li><a href="#architecture" className="hover:text-emerald-400 transition-colors">On-Premises Isolation</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} SecurePM. 100% On-Premises. Zero Cloud.
            </div>
            <div className="flex items-center gap-6">
              <a href="#security" className="hover:text-slate-400 transition-colors">Security Overview</a>
              <a href="#architecture" className="hover:text-slate-400 transition-colors">Network Isolation</a>
              <Link to="/guide#auth-endpoints" className="hover:text-emerald-400 transition-colors">API &amp; Auth Guide</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
