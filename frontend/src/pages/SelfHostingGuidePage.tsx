import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Server,
  Lock,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Monitor,
  Trash2,
  UserCheck,
  Layers,
  ArrowRight,
  Menu,
  X,
  KeyRound,
  Code2,
} from 'lucide-react';
import { useAuth } from '../stores/auth';

type OSType = 'linux' | 'macos' | 'windows';

interface SectionItem {
  id: string;
  title: string;
  icon: React.ElementType;
}

const sections: { category: string; items: SectionItem[] }[] = [
  {
    category: 'Getting Started',
    items: [
      { id: 'overview', title: 'Overview & Philosophy', icon: BookOpen },
      { id: 'prerequisites', title: 'System Prerequisites', icon: Layers },
    ],
  },
  {
    category: 'Deployment',
    items: [
      { id: 'quickstart', title: 'Single-User Localhost', icon: Monitor },
      { id: 'local-network', title: 'Local Network (Peer/LAN)', icon: Wifi },
    ],
  },
  {
    category: 'API & Authentication',
    items: [
      { id: 'auth-endpoints', title: 'Sign-In & Auth Endpoints', icon: KeyRound },
      { id: 'core-endpoints', title: 'Essential Core Endpoints', icon: Code2 },
    ],
  },
  {
    category: 'Security & Operations',
    items: [
      { id: 'administration', title: 'First-Time Administration', icon: UserCheck },
      { id: 'troubleshooting', title: 'Troubleshooting & FAQ', icon: HelpCircle },
      { id: 'cleanup', title: 'Stopping & Data Reset', icon: Trash2 },
    ],
  },
];

export const SelfHostingGuidePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [selectedOS, setSelectedOS] = useState<OSType>('linux');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    const handleScroll = () => {
      const allSections = sections.flatMap((c) => c.items);
      for (const section of allSections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom >= 140) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-[#09090b]/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-sm shadow-emerald-500/20 group-hover:border-emerald-500/60 transition-all">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  SecurePM
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Docs &amp; Guide
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </Link>

            <a
              href="https://github.com/iam-656/SecurePM"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {isAuthenticated ? (
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-sm shadow-emerald-500/20"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <a
                href="#auth-endpoints"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
                title="View Authentication & API Endpoints"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Auth Endpoints</span>
              </a>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Documentation Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Navigation Sidebar */}
          <aside
            className={`lg:col-span-3 sticky top-24 self-start space-y-6 ${
              mobileMenuOpen
                ? 'fixed inset-x-4 top-20 z-40 bg-slate-950/95 p-6 rounded-2xl border border-slate-800 shadow-2xl block backdrop-blur-xl'
                : 'hidden lg:block'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Documentation Navigation
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                v1.0 (Air-Gapped)
              </span>
            </div>

            <nav className="space-y-6 text-sm">
              {sections.map((group) => (
                <div key={group.category} className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {group.category}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <span>{item.title}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Quick Repository Card */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Open Source Core</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Zero telemetry, zero vendor lock-in. All sources are hosted on GitHub.
              </p>
              <a
                href="https://github.com/iam-656/SecurePM"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium pt-1 text-[11px]"
              >
                <span>Star on GitHub</span>
                <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </aside>

          {/* Center Main Guide Content */}
          <main className="lg:col-span-9 space-y-16 min-w-0">
            {/* Header Title Section */}
            <section className="space-y-4 pb-8 border-b border-slate-800">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Self-Hosting &amp; Private Network Deployment</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                SecurePM Self-Hosting Guide
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl">
                Run an enterprise-grade, air-gapped project management instance on your local machine or private
                local network (LAN) with full multi-device synchronization and zero cloud dependencies.
              </p>
            </section>

            {/* 1. OVERVIEW & PHILOSOPHY */}
            <section id="overview" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">1. Overview &amp; Philosophy</h2>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                SecurePM is designed from the ground up for teams who require absolute confidentiality. Traditional
                SaaS tools transmit roadmap tickets, architectural diagrams, and internal discussions to third-party
                cloud providers. SecurePM operates under a strict <strong>Zero-Cloud, Zero-Telemetry</strong> model:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                    <Server className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">100% On-Premises</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    All data is held in your local PostgreSQL database and persistent volume mounts.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">XSS-Resistant Auth</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses Vert.x HTTP-only SameSite session cookies. Zero token exposure in localStorage.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">Air-Gapped Realtime</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Live WebSockets provide sub-millisecond collaboration without external relays.
                  </p>
                </div>
              </div>
            </section>

            {/* 2. PREREQUISITES & MKCERT */}
            <section id="prerequisites" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">2. System Prerequisites</h2>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Before launching SecurePM, ensure your host computer has the required container and certificate
                tooling installed:
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-200">
                      Docker &amp; Docker Compose (Docker Engine v24+ / Compose v2+)
                    </p>
                    <p className="text-slate-400">
                      Required to containerize the database, Quarkus backend API, Nginx proxy, and React frontend.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-200">Git</p>
                    <p className="text-slate-400">To clone and maintain repository updates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-200">mkcert (Zero-config local HTTPS)</p>
                    <p className="text-slate-400">
                      Because SecurePM sessions use <code className="text-emerald-400">Secure</code> cookies, modern
                      browsers require an HTTPS certificate even when running on local networks.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive OS Selector for mkcert */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">
                    How to install <code className="text-emerald-400">mkcert</code> for your Operating System:
                  </span>
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <button
                      onClick={() => setSelectedOS('linux')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        selectedOS === 'linux' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Linux
                    </button>
                    <button
                      onClick={() => setSelectedOS('macos')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        selectedOS === 'macos' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      macOS
                    </button>
                    <button
                      onClick={() => setSelectedOS('windows')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        selectedOS === 'windows' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Windows
                    </button>
                  </div>
                </div>

                <div className="p-4 font-mono text-xs text-slate-200">
                  {selectedOS === 'linux' && (
                    <div className="space-y-2">
                      <p className="text-slate-400"># Debian / Ubuntu:</p>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <code>sudo apt update &amp;&amp; sudo apt install libnss3-tools mkcert -y</code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              'sudo apt update && sudo apt install libnss3-tools mkcert -y',
                              'mkcert-linux'
                            )
                          }
                          className="text-slate-400 hover:text-white"
                          title="Copy command"
                        >
                          {copiedKey === 'mkcert-linux' ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-slate-400 pt-2"># Arch / Manjaro: <code className="text-slate-300">sudo pacman -S mkcert</code></p>
                      <p className="text-slate-400"># Fedora / RHEL: <code className="text-slate-300">sudo dnf install mkcert</code></p>
                    </div>
                  )}

                  {selectedOS === 'macos' && (
                    <div className="space-y-2">
                      <p className="text-slate-400"># Using Homebrew:</p>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <code>brew install mkcert</code>
                        <button
                          onClick={() => copyToClipboard('brew install mkcert', 'mkcert-mac')}
                          className="text-slate-400 hover:text-white"
                          title="Copy command"
                        >
                          {copiedKey === 'mkcert-mac' ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedOS === 'windows' && (
                    <div className="space-y-2">
                      <p className="text-slate-400"># Using Chocolatey (Administrator PowerShell):</p>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <code>choco install mkcert</code>
                        <button
                          onClick={() => copyToClipboard('choco install mkcert', 'mkcert-win')}
                          className="text-slate-400 hover:text-white"
                          title="Copy command"
                        >
                          {copiedKey === 'mkcert-win' ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-slate-400 pt-1"># Or via Scoop: <code className="text-slate-300">scoop install mkcert</code></p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 3. QUICK START (SINGLE USER / LOCALHOST) */}
            <section id="quickstart" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                  <Monitor className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">3. Single-User Localhost Quickstart</h2>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Follow this simple 5-step walkthrough to get your local instance running in under two minutes:
              </p>

              {/* Step Progression Container */}
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h3 className="font-bold text-slate-200 text-sm">Clone the Repository</h3>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                    <span className="text-emerald-400">git clone https://github.com/iam-656/SecurePM.git &amp;&amp; cd SecurePM</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          'git clone https://github.com/iam-656/SecurePM.git && cd SecurePM',
                          'step1-clone'
                        )
                      }
                      className="text-slate-400 hover:text-white"
                      title="Copy command"
                    >
                      {copiedKey === 'step1-clone' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <h3 className="font-bold text-slate-200 text-sm">Generate Local HTTPS Certificates</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Install your local certificate authority and issue SSL keys for localhost:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                      <span className="text-emerald-400">mkcert -install</span>
                      <button
                        onClick={() => copyToClipboard('mkcert -install', 'step2-ca')}
                        className="text-slate-400 hover:text-white"
                        title="Copy command"
                      >
                        {copiedKey === 'step2-ca' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                      <span className="text-emerald-400">
                        mkdir -p nginx/certs &amp;&amp; mkcert -key-file nginx/certs/pm.local-key.pem -cert-file nginx/certs/pm.local.pem localhost 127.0.0.1 ::1 pm.local
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            'mkdir -p nginx/certs && mkcert -key-file nginx/certs/pm.local-key.pem -cert-file nginx/certs/pm.local.pem localhost 127.0.0.1 ::1 pm.local',
                            'step2-cert'
                          )
                        }
                        className="text-slate-400 hover:text-white"
                        title="Copy command"
                      >
                        {copiedKey === 'step2-cert' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                      3
                    </span>
                    <h3 className="font-bold text-slate-200 text-sm">Configure Environment Variables</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Create your local <code className="text-slate-200 font-mono">.env</code> configuration file:
                  </p>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                    <span className="text-emerald-400">cp .env.example .env</span>
                    <button
                      onClick={() => copyToClipboard('cp .env.example .env', 'step3-env')}
                      className="text-slate-400 hover:text-white"
                      title="Copy command"
                    >
                      {copiedKey === 'step3-env' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Remember to open <code className="font-mono">.env</code> and customize{' '}
                      <code className="font-mono">APP_BOOTSTRAP_ADMIN_PASSWORD</code> before exposing your instance to any shared network.
                    </span>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                      4
                    </span>
                    <h3 className="font-bold text-slate-200 text-sm">Launch All Services via Docker</h3>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                    <span className="text-emerald-400">docker compose up -d --build</span>
                    <button
                      onClick={() => copyToClipboard('docker compose up -d --build', 'step4-up')}
                      className="text-slate-400 hover:text-white"
                      title="Copy command"
                    >
                      {copiedKey === 'step4-up' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                      5
                    </span>
                    <h3 className="font-bold text-slate-200 text-sm">Access SecurePM in Your Browser</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Navigate to{' '}
                    <a
                      href="https://localhost"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 underline font-semibold"
                    >
                      https://localhost
                    </a>{' '}
                    or{' '}
                    <a
                      href="https://127.0.0.1"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 underline font-semibold"
                    >
                      https://127.0.0.1
                    </a>
                  </p>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Default Username:</span>
                      <code className="text-emerald-400 font-bold">admin</code>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Initial Password:</span>
                      <code className="text-emerald-400 font-bold">ChangeMeNow123!</code>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. LOCAL NETWORK SETUP (PEER / LAN) */}
            <section id="local-network" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <Wifi className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">4. Local Network Setup (Sharing with Peers / LAN)</h2>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Want teammates or colleagues on the same office Wi-Fi or local area network to collaborate? Follow
                these steps to securely expose your machine to peers:
              </p>

              <div className="space-y-4">
                {/* Step 4.1 */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 text-sm">
                    Step 4.1: Find Your Machine&apos;s Local IP Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block mb-1"># Linux / macOS:</span>
                      <code className="text-emerald-400">ip -br addr show</code>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block mb-1"># Windows PowerShell:</span>
                      <code className="text-emerald-400">ipconfig</code>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Locate your active adapter IPv4 address (usually starts with{' '}
                    <code className="text-slate-300">192.168.x.x</code> or <code className="text-slate-300">10.x.x.x</code>, e.g.{' '}
                    <code className="text-emerald-400">192.168.1.50</code>).
                  </p>
                </div>

                {/* Step 4.2 */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 text-sm">
                    Step 4.2: Regenerate Certificates Including Your Local IP
                  </h4>
                  <p className="text-xs text-slate-400">
                    Include your IP in the mkcert command so peer browsers recognize the certificate:
                  </p>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                    <span className="text-emerald-400">
                      mkcert -key-file nginx/certs/pm.local-key.pem -cert-file nginx/certs/pm.local.pem localhost 127.0.0.1 ::1 pm.local 192.168.1.50
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          'mkcert -key-file nginx/certs/pm.local-key.pem -cert-file nginx/certs/pm.local.pem localhost 127.0.0.1 ::1 pm.local 192.168.1.50',
                          'lan-cert'
                        )
                      }
                      className="text-slate-400 hover:text-white"
                      title="Copy command"
                    >
                      {copiedKey === 'lan-cert' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                    <span className="text-emerald-400">docker compose restart nginx</span>
                    <button
                      onClick={() => copyToClipboard('docker compose restart nginx', 'lan-restart')}
                      className="text-slate-400 hover:text-white"
                      title="Copy command"
                    >
                      {copiedKey === 'lan-restart' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 4.3 */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 text-sm">
                    Step 4.3: Connecting from Peer Devices
                  </h4>
                  <p className="text-xs text-slate-300">
                    Peers simply open their browser and visit:{' '}
                    <code className="text-emerald-400 font-bold">https://192.168.1.50</code> (replace with your host IP).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <span className="font-bold text-slate-200 block">Option A: Install Root CA (Cleanest)</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Find host root CA with <code className="text-slate-300">mkcert -CAROOT</code>, copy{' '}
                        <code className="text-slate-300">rootCA.pem</code> to the peer machine, and install it into their OS trust store.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <span className="font-bold text-slate-200 block">Option B: Proceed Unsafe (Quickest)</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Click &ldquo;Advanced&rdquo; &rarr; &ldquo;Proceed to 192.168.1.50 (unsafe)&rdquo;. Sessions and WebSockets will function properly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. FIRST-TIME ADMINISTRATION */}
            <section id="administration" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">5. First-Time Administration</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm">Change Admin Password</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Click your user profile avatar in the sidebar and update your password from the default bootstrap value.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm">Provision Teammates</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Navigate to <code className="text-slate-300 font-mono">/admin/users</code> to create accounts for team members with either MEMBER or ADMIN roles.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm">Create Workspaces</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Go to <code className="text-slate-300 font-mono">/projects</code>, create your first project, and configure Kanban boards or sub-project dependencies.
                  </p>
                </div>
              </div>
            </section>

            {/* 6. TROUBLESHOOTING & FAQ */}
            <section id="troubleshooting" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">6. Troubleshooting &amp; FAQ</h2>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="text-rose-400 font-mono">●</span> Port 80 or 443 is already in use
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    If another local server is using port 80 or 443, adjust the host port mapping in{' '}
                    <code className="text-slate-300 font-mono">docker-compose.yml</code>:
                  </p>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
{`nginx:
  ports:
    - "8080:80"
    - "8443:443"`}
                  </pre>
                  <p className="text-xs text-slate-400">
                    You can then access SecurePM via <code className="text-slate-300">https://localhost:8443</code>.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="text-rose-400 font-mono">●</span> Immediate Logout or &ldquo;Session Unavailable&rdquo;
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Make sure you are accessing via <strong>HTTPS</strong> (<code className="text-slate-300 font-mono">https://</code>),
                    never unencrypted HTTP. SecurePM cookies are flagged <code className="text-slate-300">Secure</code>, so browsers reject
                    storing them over plain HTTP.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="text-rose-400 font-mono">●</span> Database Connection Refused on Initial Startup
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    On initial volume creation, PostgreSQL may take 5–10 seconds to initialize schemas. If the backend fails its first connection attempt, simply run:
                  </p>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
                    <span>docker compose restart quarkus-app</span>
                    <button
                      onClick={() => copyToClipboard('docker compose restart quarkus-app', 'restart-backend')}
                      className="text-slate-400 hover:text-white"
                      title="Copy command"
                    >
                      {copiedKey === 'restart-backend' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. AUTHENTICATION & SIGN-IN ENDPOINTS */}
            <section id="auth-endpoints" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">7. Sign-In &amp; Authentication Endpoints</h2>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <p className="font-semibold text-white">XSS-Resistant Cookie Session Architecture</p>
                <p className="text-slate-400 leading-relaxed">
                  SecurePM enforces strict server-side Vert.x session cookies (<code className="text-emerald-400 font-mono">session_id</code>). 
                  Tokens are never stored in client <code className="font-mono">localStorage</code> or exposed to frontend scripts.
                  All subsequent REST calls and real-time WebSocket upgrade handshakes authenticate automatically via this cookie.
                </p>
              </div>

              <div className="space-y-6">
                {/* POST /api/auth/login */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        POST
                      </span>
                      <code className="text-sm font-bold text-white font-mono">/api/auth/login</code>
                    </div>
                    <span className="text-xs text-slate-400">Authenticates credentials and establishes session</span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Request Body (JSON)
                    </span>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
{`{
  "username": "admin",
  "password": "ChangeMeNow123!"
}`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Response Headers &amp; Body (200 OK)
                    </span>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                      <p className="text-cyan-400">Set-Cookie: session_id=d6e4b8a2-...; Path=/; HttpOnly; SameSite=Strict; Secure</p>
                      <pre className="text-emerald-400 overflow-x-auto">
{`{
  "id": 1,
  "username": "admin",
  "email": "admin@securepm.local",
  "role": "ADMIN"
}`}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        cURL Example
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `curl -k -i -X POST https://localhost/api/auth/login \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{"username":"admin","password":"ChangeMeNow123!"}'`,
                            'curl-login'
                          )
                        }
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'curl-login' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy cURL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
{`curl -k -i -X POST https://localhost/api/auth/login \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{"username":"admin","password":"ChangeMeNow123!"}'`}
                    </pre>
                  </div>
                </div>

                {/* GET /api/auth/me */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        GET
                      </span>
                      <code className="text-sm font-bold text-white font-mono">/api/auth/me</code>
                    </div>
                    <span className="text-xs text-slate-400">Validates session cookie and retrieves current user profile</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        cURL Example (With Session Cookie)
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard('curl -k -X GET https://localhost/api/auth/me -b cookies.txt', 'curl-me')
                        }
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'curl-me' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy cURL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                      curl -k -X GET https://localhost/api/auth/me -b cookies.txt
                    </pre>
                  </div>
                </div>

                {/* POST /api/auth/logout */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        POST
                      </span>
                      <code className="text-sm font-bold text-white font-mono">/api/auth/logout</code>
                    </div>
                    <span className="text-xs text-slate-400">Terminates session on server and expires cookie</span>
                  </div>

                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                    curl -k -i -X POST https://localhost/api/auth/logout -b cookies.txt
                  </pre>
                </div>
              </div>
            </section>

            {/* 8. ESSENTIAL CORE API ENDPOINTS */}
            <section id="core-endpoints" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                  <Code2 className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">8. Essential Core Endpoints</h2>
              </div>

              <div className="space-y-4">
                {/* Projects Endpoints Table */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Projects &amp; Sub-Projects API</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-semibold">Method</th>
                          <th className="pb-2 font-semibold">Endpoint</th>
                          <th className="pb-2 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        <tr>
                          <td className="py-2.5 text-cyan-400 font-bold">GET</td>
                          <td className="py-2.5">/api/projects</td>
                          <td className="py-2.5 font-sans text-slate-400">List all projects accessible to caller</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-emerald-400 font-bold">POST</td>
                          <td className="py-2.5">/api/projects</td>
                          <td className="py-2.5 font-sans text-slate-400">Create new project or sub-project</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-cyan-400 font-bold">GET</td>
                          <td className="py-2.5">/api/projects/&#123;id&#125;</td>
                          <td className="py-2.5 font-sans text-slate-400">Get project details with sub-projects &amp; members</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-amber-400 font-bold">PUT</td>
                          <td className="py-2.5">/api/projects/&#123;id&#125;</td>
                          <td className="py-2.5 font-sans text-slate-400">Update project name, key, or description</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tasks & Kanban API */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>Tasks &amp; Kanban Workflow API</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-semibold">Method</th>
                          <th className="pb-2 font-semibold">Endpoint</th>
                          <th className="pb-2 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        <tr>
                          <td className="py-2.5 text-cyan-400 font-bold">GET</td>
                          <td className="py-2.5">/api/projects/&#123;id&#125;/tasks</td>
                          <td className="py-2.5 font-sans text-slate-400">Fetch tasks with filters (?status=TODO&amp;priority=HIGH)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-emerald-400 font-bold">POST</td>
                          <td className="py-2.5">/api/projects/&#123;id&#125;/tasks</td>
                          <td className="py-2.5 font-sans text-slate-400">Create new task under project</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-purple-400 font-bold">PATCH</td>
                          <td className="py-2.5">/api/tasks/&#123;id&#125;/status</td>
                          <td className="py-2.5 font-sans text-slate-400">Fast Kanban column drop status change</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-amber-400 font-bold">PUT</td>
                          <td className="py-2.5">/api/tasks/&#123;id&#125;</td>
                          <td className="py-2.5 font-sans text-slate-400">Full update with optimistic locking (version)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Realtime WebSockets */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <span>Real-Time WebSocket Channels</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-semibold">Protocol</th>
                          <th className="pb-2 font-semibold">WebSocket Path</th>
                          <th className="pb-2 font-semibold">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        <tr>
                          <td className="py-2.5 text-emerald-400 font-bold">WSS</td>
                          <td className="py-2.5">/ws/projects/&#123;projectId&#125;</td>
                          <td className="py-2.5 font-sans text-slate-400">
                            Broadcasts live task changes, comments, and board drag-and-drops
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-emerald-400 font-bold">WSS</td>
                          <td className="py-2.5">/ws/notifications</td>
                          <td className="py-2.5 font-sans text-slate-400">
                            User notifications for invitations and task assignments
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* 9. STOPPING & CLEANUP */}
            <section id="cleanup" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">9. Stopping &amp; Data Cleanup</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 text-sm">Stop Services (Preserve Data)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Stops containers while keeping your PostgreSQL database and uploaded files safe in Docker volumes:
                  </p>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
                    <span>docker compose down</span>
                    <button
                      onClick={() => copyToClipboard('docker compose down', 'cmd-down')}
                      className="text-slate-400 hover:text-white"
                      title="Copy command"
                    >
                      {copiedKey === 'cmd-down' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-rose-300 text-sm">Factory Reset (Wipe All Data)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Permanently deletes containers, database records, and attachments:
                  </p>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-rose-400">
                    <span>docker compose down -v</span>
                    <button
                      onClick={() => copyToClipboard('docker compose down -v', 'cmd-down-v')}
                      className="text-slate-400 hover:text-white"
                      title="Copy command"
                    >
                      {copiedKey === 'cmd-down-v' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Enterprise Footer */}
      <footer className="mt-20 border-t border-slate-800/80 bg-slate-950 py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">SecurePM</span>
            <span>&mdash; 100% Air-Gapped Project Management.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-emerald-400 transition-colors">Overview</Link>
            <a href="https://github.com/iam-656/SecurePM" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">
              GitHub Repository
            </a>
            <a href="#auth-endpoints" className="hover:text-emerald-400 transition-colors">Auth Endpoints</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SelfHostingGuidePage;
