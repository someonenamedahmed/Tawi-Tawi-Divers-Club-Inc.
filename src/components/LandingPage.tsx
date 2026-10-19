import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
  FileCheck,
  Cpu,
  BarChart3,
  Waves,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, error } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent text-slate-100 flex flex-col justify-between relative">
      {/* Hero Section with Frosted Underwater Ambiance */}
      <div className="relative overflow-hidden py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Official Company Logo Badge */}
            <div className="flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-500 to-emerald-400 blur-lg opacity-80 group-hover:opacity-100 transition duration-500 animate-pulse" />
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-slate-950/80 border-2 border-cyan-400/50 shadow-2xl overflow-hidden backdrop-blur-md">
                  <img
                    src="/src/assets/images/tawitawi_divers_logo_1792400280899.jpg"
                    alt="Tawi-Tawi Divers Club Inc. Official Logo"
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>

            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full frosted-glass border border-cyan-400/30 text-cyan-200 text-xs font-semibold shadow-md">
              <Waves className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Tawi-Tawi Divers Club Inc. &bull; Quality &amp; Safety Audit Intelligence</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
              Pristine Waters.{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-emerald-300 bg-clip-text text-transparent drop-shadow-sm">
                Uncompromising Safety.
              </span>{' '}
              Excellence.
            </h1>

            <p className="text-base sm:text-lg text-cyan-50/90 leading-relaxed max-w-2xl mx-auto drop-shadow-sm font-normal">
              Internal Quality &amp; Marine Operations Platform for{' '}
              <strong className="text-white font-semibold">Tawi-Tawi Divers Club Inc.</strong> Log dive buddy procedures,
              compressor air purity, vessel safety, and staff reflections with Gemini 3.6 Flash.
            </p>

            {error && (
              <div className="p-3 bg-red-950/70 border border-red-500/50 text-red-200 text-xs rounded-lg max-w-md mx-auto backdrop-blur-md shadow-lg">
                {error}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={signInWithGoogle}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold text-base shadow-xl shadow-cyan-900/40 flex items-center justify-center space-x-3 transition-all hover:scale-[1.02] cursor-pointer border border-white/20"
              >
                <span>Staff Sign In with Google SSO</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-6 text-xs text-cyan-100/80 font-medium">
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full frosted-glass border border-white/10">
                <Lock className="w-3.5 h-3.5 text-emerald-300" />
                <span>Isolated Staff Journals</span>
              </span>
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full frosted-glass border border-white/10">
                <Cpu className="w-3.5 h-3.5 text-cyan-300" />
                <span>Gemini 3.6 Flash Engine</span>
              </span>
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full frosted-glass border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Super Admin Governance</span>
              </span>
            </div>
          </div>

          {/* Interactive Feature Grid with Frosted Glass Panels */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl frosted-glass-card hover:border-cyan-400/40 hover:bg-slate-900/50 transition-all shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Dive Safety &amp; Vessel Audits
              </h3>
              <p className="text-sm text-cyan-50/80 leading-relaxed">
                Log pre-dive buddy checks, Bauer compressor air purity tests, emergency O2 status, and boat
                engine maintenance. Gemini identifies potential risks and standard operating discrepancies.
              </p>
            </div>

            <div className="p-6 rounded-2xl frosted-glass-card hover:border-emerald-400/40 hover:bg-slate-900/50 transition-all shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Confidential Staff Reflection Vault
              </h3>
              <p className="text-sm text-cyan-50/80 leading-relaxed">
                Strict Attribute-Based Access Control isolates your feedback. Divemasters, boat captains, and
                technicians can voice friction or propose ideas confidentially.
              </p>
            </div>

            <div className="p-6 rounded-2xl frosted-glass-card hover:border-amber-400/40 hover:bg-slate-900/50 transition-all shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Executive Club Governance
              </h3>
              <p className="text-sm text-cyan-50/80 leading-relaxed">
                Super Administrator uploads PADI/ISO 24803 criteria and Coast Guard protocols, tracking
                club-wide compliance across Bongao, Sibutu, and Simunul operations.
              </p>
            </div>
          </div>

          {/* Workflow Snapshot with Frosted Glass */}
          <div className="mt-14 p-7 sm:p-8 rounded-2xl frosted-ocean-panel shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6 text-center tracking-tight">
              Quality Audit &amp; Marine Safety Lifecycle
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl frosted-glass text-center border border-white/10">
                <span className="w-7 h-7 rounded-full bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center mb-3 shadow">
                  1
                </span>
                <h4 className="text-sm font-semibold text-white mb-1">SSO Authentication</h4>
                <p className="text-xs text-cyan-100/75">
                  Authenticate securely via Google Sign-In with automated session integrity.
                </p>
              </div>

              <div className="p-4 rounded-xl frosted-glass text-center border border-white/10">
                <span className="w-7 h-7 rounded-full bg-sky-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center mb-3 shadow">
                  2
                </span>
                <h4 className="text-sm font-semibold text-white mb-1">Profile Calibration</h4>
                <p className="text-xs text-cyan-100/75">
                  Define your exact department, role, and job function for contextual analysis.
                </p>
              </div>

              <div className="p-4 rounded-xl frosted-glass text-center border border-white/10">
                <span className="w-7 h-7 rounded-full bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center mb-3 shadow">
                  3
                </span>
                <h4 className="text-sm font-semibold text-white mb-1">Gemini AI Audit</h4>
                <p className="text-xs text-cyan-100/75">
                  Exchange feedback on bottlenecks, complaints, and workflows with Gemini 3.6 Flash.
                </p>
              </div>

              <div className="p-4 rounded-xl frosted-glass text-center border border-white/10">
                <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center mb-3 shadow">
                  4
                </span>
                <h4 className="text-sm font-semibold text-white mb-1">Executive Synthesis</h4>
                <p className="text-xs text-cyan-100/75">
                  Super Admin reviews cross-company results grounded in company quality benchmarks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-cyan-500/20 py-6 text-center text-xs text-cyan-200/60 frosted-glass">
        <p>Tawi-Tawi Divers Club Inc. &bull; Dive Safety &amp; Quality Audit Platform</p>
      </footer>
    </div>
  );
};
