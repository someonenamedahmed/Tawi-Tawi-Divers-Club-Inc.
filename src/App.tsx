/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileModal } from './components/ProfileModal';
import { ShieldCheck, Loader2 } from 'lucide-react';

const AmbientUnderwaterParticles: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[3] overflow-hidden">
      {/* 10 Ambient Floating Marine Bubbles */}
      <div className="ambient-bubble w-3 h-3 left-[10%]" style={{ animationDuration: '14s', animationDelay: '0s' }} />
      <div className="ambient-bubble w-5 h-5 left-[22%]" style={{ animationDuration: '18s', animationDelay: '3s' }} />
      <div className="ambient-bubble w-2.5 h-2.5 left-[34%]" style={{ animationDuration: '12s', animationDelay: '7s' }} />
      <div className="ambient-bubble w-4 h-4 left-[46%]" style={{ animationDuration: '16s', animationDelay: '1.5s' }} />
      <div className="ambient-bubble w-6 h-6 left-[60%]" style={{ animationDuration: '21s', animationDelay: '5s' }} />
      <div className="ambient-bubble w-3.5 h-3.5 left-[72%]" style={{ animationDuration: '15s', animationDelay: '9s' }} />
      <div className="ambient-bubble w-5 h-5 left-[82%]" style={{ animationDuration: '19s', animationDelay: '2.5s' }} />
      <div className="ambient-bubble w-2 h-2 left-[90%]" style={{ animationDuration: '11s', animationDelay: '8s' }} />
      <div className="ambient-bubble w-4 h-4 left-[96%]" style={{ animationDuration: '17s', animationDelay: '4s' }} />
      <div className="ambient-bubble w-3 h-3 left-[5%]" style={{ animationDuration: '13s', animationDelay: '10s' }} />
    </div>
  );
};

const UnderwaterFrostedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 1. High-Resolution PADI-Style Underwater Scene (Luminous Sunbeams & Deep Reef Gradient) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 transform-gpu scale-[1.01]"
        style={{
          backgroundImage: "url('/src/assets/images/underwater_ocean_bg_1792400858220.jpg')",
          backgroundAttachment: 'fixed',
        }}
      />

      {/* 2. Frosted Aquatic Glass Diffusion Layer */}
      {/* Softens and frosts the underwater scene like looking through a frosted dive-bell viewport */}
      <div className="absolute inset-0 backdrop-blur-[6px] md:backdrop-blur-[8px] bg-gradient-to-b from-sky-950/20 via-slate-950/40 to-slate-950/80" />

      {/* 3. Volumetric Sunbeam & Caustic Luminous Enhancer */}
      <div className="absolute inset-0 caustic-glow bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(56,189,248,0.22),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.14),transparent_50%)]" />

      {/* 4. Fine frosted vignette border */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(2,12,27,0.7)]" />
    </div>
  );
};

const MainContent: React.FC = () => {
  const { user, userProfile, isSuperAdmin, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'user' | 'admin'>('user');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Mandatory profile modal if employee hasn't set role or job description
  const needsProfileSetup = user && (!userProfile || !userProfile.role || !userProfile.jobDescription);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col relative selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden">
      {/* Underwater Frosted Scene Backdrop */}
      <UnderwaterFrostedBackground />

      {/* Floating Marine Bubbles */}
      <AmbientUnderwaterParticles />

      {/* Main Foreground UI */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar
          currentView={currentView}
          onViewChange={(view) => {
            if (view === 'admin' && !isSuperAdmin) return;
            setCurrentView(view);
          }}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-4 py-20">
            <div className="w-16 h-16 rounded-2xl frosted-glass text-cyan-400 flex items-center justify-center shadow-2xl animate-pulse border border-cyan-400/30">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-cyan-200">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Calibrating Marine Safety &amp; Firestore Security Rules...</span>
            </div>
          </div>
        ) : !user ? (
          <LandingPage />
        ) : (
          <main className="flex-1 pb-16">
            {currentView === 'admin' && isSuperAdmin ? (
              <AdminDashboard />
            ) : (
              <UserDashboard onOpenProfile={() => setIsProfileModalOpen(true)} />
            )}
          </main>
        )}

        {/* Profile setup modal */}
        {user && (
          <ProfileModal
            isOpen={isProfileModalOpen || !!needsProfileSetup}
            onClose={() => setIsProfileModalOpen(false)}
            mandatory={!!needsProfileSetup}
          />
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
