import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CompanyBenchmark,
  Interaction,
  AggregateAuditReport,
  UserProfile,
} from '../types';
import {
  db,
  handleFirestoreError,
  OperationType,
  sanitizeFirestorePayload,
  SUPER_ADMIN_EMAIL,
} from '../firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  ShieldCheck,
  Building2,
  FileText,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Users,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const PRESET_STANDARDS: {
  title: string;
  category: CompanyBenchmark['category'];
  version: string;
  content: string;
}[] = [
  {
    title: 'PADI / ISO 24803 Recreational Diving Safety & Emergency Protocol',
    category: 'quality_standard',
    version: 'v4.1',
    content: `1. Purpose & Scope:
Enforce zero-compromise diver safety across all guided and instructional dives operated by Tawi-Tawi Divers Club Inc. (Bongao, Sibutu Passage, Simunul, Turtle Islands).

2. Mandatory Pre-Dive Safety Verification:
- Mandatory pre-dive buddy check (BWRAF - Buoyancy, Weights, Releases, Air, Final OK) verified by Lead Divemaster.
- Working DAN Emergency Oxygen Kit (minimum 15 L/min continuous flow, positive pressure mask, full cylinder) and marine first aid kit onboard every dive boat.
- Dive guide-to-customer ratio must strictly not exceed 1:4 for open ocean drift dives or 1:2 for discovery scuba experiences.

3. Emergency Decompression & Evacuation Procedure:
- Nearest hyperbaric chamber coordination: Zamboanga City Medical Center / Armed Forces Hyperbaric Facility.
- VHF Channel 16 distress protocol and satellite phone link active with Tawi-Tawi Coast Guard Station Bongao.
- Mandatory 3-minute safety stop at 5 meters (15 feet) on all dives below 10 meters depth.`,
  },
  {
    title: 'Bauer Air Compressor Maintenance & Breathing Air Purity SOP',
    category: 'sop',
    version: 'v2.8',
    content: `1. High-Pressure Air Filling Station Protocols:
All scuba cylinders (Aluminum 80 & Steel 100) must only be filled with Grade E certified breathable air meeting EN 12021 standards.

2. Maintenance Thresholds:
- Triplex filter cartridge replacement strictly every 50 operating hours or immediately if moisture indicator turns pink.
- Synthetic compressor oil change every 100 operating hours.
- Carbon Monoxide (CO) continuous monitoring in compressor intake room (<5.5 ppm threshold).
- Visual cylinder inspection (VIP) sticker verified before filling; any cylinder without valid hydrostatic stamp (within 5 years) must be quarantined.

3. Filling Quality Gate:
Maximum cylinder fill pressure 3,000 PSI (207 bar) at 20°C. Fast-filling that exceeds 200 bar warm is prohibited to avoid pressure drops upon ocean submersion.`,
  },
  {
    title: 'Tawi-Tawi Marine Sanctuary Protection & Coral Reef Mooring Policy',
    category: 'policy',
    version: 'v3.0',
    content: `1. Environmental Protection Directive:
Tawi-Tawi's coral reefs belong to the Coral Triangle epicenter. Divers Club Inc. enforces a strict zero-impact marine conservation policy.

2. Mooring vs. Anchor Regulations:
- Boat anchors must NEVER be dropped on live coral reefs. Boats must use designated permanent eco-mooring buoys at Bongao Reef, Sangay Siapo, and Sibutu.
- In unmarked areas, captains must deploy sand anchors in designated bare sandy lagoons only.

3. Wildlife & Guest Codes of Conduct:
- Strict no-touch, no-take policy: touching sea turtles, manta rays, coral polyps, or collecting shells will result in immediate suspension of diving privileges.
- Reef-safe, oxybenzone-free mineral sunscreen required for all guests prior to ocean entry.`,
  },
  {
    title: 'Dive Fleet Maritime Navigation & Weather Clearance Protocol',
    category: 'sop',
    version: 'v2.2',
    content: `1. Vessel Readiness & Coast Guard Compliance:
All club dive vessels (outrigger dive bancas and fiberglass speedboats) must undergo daily sea-worthiness inspections.

2. Pre-Departure Maritime Gate:
- Philippine Coast Guard (PCG) clearance logged with passenger manifest before undocking from Bongao pier.
- Dual outboard Yamaha motors inspected, emergency fuel reserve (25% buffer minimum) verified.
- Working bilge pumps, marine VHF radio, GPS chartplotter, and USCG/MARINA approved life vests for 120% of manifest capacity.

3. Weather Abort Criteria:
Dives in Sibutu Passage or Sitangkai deep water channels must be cancelled or rerouted if PAGASA issues Gale Warning or sustained winds exceed 20 knots.`,
  },
];

export const AdminDashboard: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();

  // Tabs
  const [adminTab, setAdminTab] = useState<'benchmarks' | 'allAudits' | 'synthesis'>('benchmarks');

  // Benchmarks state
  const [benchmarks, setBenchmarks] = useState<CompanyBenchmark[]>([]);
  const [bmTitle, setBmTitle] = useState('');
  const [bmCategory, setBmCategory] = useState<CompanyBenchmark['category']>('quality_standard');
  const [bmVersion, setBmVersion] = useState('v1.0');
  const [bmContent, setBmContent] = useState('');
  const [bmLoading, setBmLoading] = useState(false);
  const [bmSuccess, setBmSuccess] = useState<string | null>(null);
  const [bmError, setBmError] = useState<string | null>(null);

  // Cross-user audits state
  const [allInteractions, setAllInteractions] = useState<Interaction[]>([]);
  const [allUsersList, setAllUsersList] = useState<UserProfile[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [auditDeptFilter, setAuditDeptFilter] = useState('all');
  const [auditSentimentFilter, setAuditSentimentFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Executive Synthesis AI state
  const [executiveReport, setExecutiveReport] = useState<AggregateAuditReport | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [synthesisModelUsed, setSynthesisModelUsed] = useState<string | null>(null);

  // Fetch benchmarks
  const fetchBenchmarks = async () => {
    try {
      const snap = await getDocs(collection(db, 'company_benchmarks'));
      const list: CompanyBenchmark[] = [];
      snap.forEach((d) => list.push(d.data() as CompanyBenchmark));
      setBenchmarks(list);
    } catch (err) {
      console.error('Failed to load benchmarks:', err);
    }
  };

  // Fetch all users and their interactions across the organization
  const fetchAllAudits = async () => {
    setAuditsLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users: UserProfile[] = [];
      const interactions: Interaction[] = [];

      usersSnap.forEach((d) => {
        users.push(d.data() as UserProfile);
      });
      setAllUsersList(users);

      for (const u of users) {
        try {
          const intSnap = await getDocs(collection(db, 'users', u.id, 'interactions'));
          intSnap.forEach((idoc) => {
            interactions.push(idoc.data() as Interaction);
          });
        } catch (subErr) {
          console.warn(`Could not read interactions for user ${u.id}:`, subErr);
        }
      }

      interactions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAllInteractions(interactions);
    } catch (err) {
      console.error('Failed to load cross-user audits:', err);
    } finally {
      setAuditsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchBenchmarks();
      fetchAllAudits();
    }
  }, [isSuperAdmin]);

  // Create Benchmark
  const handleCreateBenchmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isSuperAdmin) return;
    setBmError(null);
    setBmSuccess(null);

    if (!bmTitle.trim() || !bmContent.trim()) {
      setBmError('Please provide both benchmark title and standard content.');
      return;
    }

    setBmLoading(true);
    try {
      const id = `bm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newBenchmark: CompanyBenchmark = {
        id,
        title: bmTitle.trim(),
        category: bmCategory,
        version: bmVersion.trim() || 'v1.0',
        content: bmContent.trim(),
        uploadedBy: user.email || SUPER_ADMIN_EMAIL,
        uploadedByUid: user.uid,
        createdAt: now,
        updatedAt: now,
      };

      const sanitized = sanitizeFirestorePayload(newBenchmark);
      await setDoc(doc(db, 'company_benchmarks', id), sanitized);

      setBmTitle('');
      setBmContent('');
      setBmVersion('v1.0');
      setBmSuccess('Company standard benchmark uploaded and active for Gemini audit grounding!');
      await fetchBenchmarks();

      setTimeout(() => setBmSuccess(null), 3000);
    } catch (err: any) {
      setBmError(err.message || 'Failed to upload company benchmark.');
      handleFirestoreError(err, OperationType.WRITE, 'company_benchmarks');
    } finally {
      setBmLoading(false);
    }
  };

  // Seed preset benchmark
  const handleSeedPreset = async (preset: typeof PRESET_STANDARDS[0]) => {
    if (!user || !isSuperAdmin) return;
    setBmLoading(true);
    try {
      const id = `bm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newBenchmark: CompanyBenchmark = {
        id,
        title: preset.title,
        category: preset.category,
        version: preset.version,
        content: preset.content,
        uploadedBy: user.email || SUPER_ADMIN_EMAIL,
        uploadedByUid: user.uid,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'company_benchmarks', id), sanitizeFirestorePayload(newBenchmark));
      await fetchBenchmarks();
      setBmSuccess(`Loaded preset: "${preset.title}"`);
      setTimeout(() => setBmSuccess(null), 3000);
    } catch (err: any) {
      setBmError(`Failed to seed preset: ${err.message}`);
    } finally {
      setBmLoading(false);
    }
  };

  // Delete Benchmark
  const handleDeleteBenchmark = async (benchmarkId: string) => {
    if (!confirm('Are you sure you want to delete this company benchmark?')) return;
    try {
      await deleteDoc(doc(db, 'company_benchmarks', benchmarkId));
      await fetchBenchmarks();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Run AI Executive Quality Audit Synthesis
  const handleRunExecutiveSynthesis = async () => {
    if (allInteractions.length === 0) {
      setSynthesisError('No employee interactions available yet to synthesize.');
      return;
    }

    setSynthesisLoading(true);
    setSynthesisError(null);

    try {
      const res = await fetch('/api/admin/aggregate-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactions: allInteractions,
          benchmarks: benchmarks,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      setExecutiveReport(data.report);
      setSynthesisModelUsed(data.modelUsed);
    } catch (err: any) {
      setSynthesisError(err.message || 'Failed to generate executive analysis.');
    } finally {
      setSynthesisLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-slate-900 border border-red-500/30 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Super Admin Access Restricted</h2>
        <p className="text-sm text-slate-400">
          This governance console is designated strictly for the Super Administrator (
          <code className="text-amber-400 font-mono text-xs">{SUPER_ADMIN_EMAIL}</code>).
        </p>
      </div>
    );
  }

  // Filter cross-user audits
  const filteredAudits = allInteractions.filter((item) => {
    const matchesDept =
      auditDeptFilter === 'all' || item.department.toLowerCase() === auditDeptFilter.toLowerCase();
    const matchesSent =
      auditSentimentFilter === 'all' || item.sentiment === auditSentimentFilter;
    const matchesSearch =
      !auditSearch.trim() ||
      item.userEmail.toLowerCase().includes(auditSearch.toLowerCase()) ||
      item.prompt.toLowerCase().includes(auditSearch.toLowerCase()) ||
      item.response.toLowerCase().includes(auditSearch.toLowerCase()) ||
      item.userRole.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesDept && matchesSent && matchesSearch;
  });

  const departmentList = Array.from(
    new Set(allInteractions.map((i) => i.department).filter(Boolean))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Super Admin Top Banner with Frosted Glass */}
      <div className="frosted-glass border border-amber-500/30 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-md shadow-amber-500/20 bg-slate-800">
              <img
                src={user?.photoURL || '/src/assets/images/lead_diver_photo_1792400579018.jpg'}
                alt={user?.displayName || 'Super Admin'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center border-2 border-slate-900 shadow">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white">Super Administrator Governance Console</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Verified Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Admin Account: <span className="text-amber-300 font-mono">{user?.email}</span> &bull; Manage
              company audit rubrics, examine cross-user submissions, and run organization-wide AI quality evaluations.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAllAudits}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-white/10 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${auditsLoading ? 'animate-spin' : ''}`} />
          <span>Refresh All Submissions</span>
        </button>
      </div>

      {/* KPI Stats Ribbon with Frosted Glass */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="frosted-glass-card rounded-xl p-4 shadow-lg border border-white/10">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
            <span>Audited Users</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{allUsersList.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active employee profiles</p>
        </div>

        <div className="frosted-glass-card rounded-xl p-4 shadow-lg border border-white/10">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
            <span>Total Interactions</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{allInteractions.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Logged audit entries</p>
        </div>

        <div className="frosted-glass-card rounded-xl p-4 shadow-lg border border-white/10">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
            <span>Company Standards</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{benchmarks.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active grounding rubrics</p>
        </div>

        <div className="frosted-glass-card rounded-xl p-4 shadow-lg border border-white/10">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
            <span>Needs Attention / Critical</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {
              allInteractions.filter(
                (i) => i.sentiment === 'needs_attention' || i.sentiment === 'critical'
              ).length
            }
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Flagged bottlenecks</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setAdminTab('benchmarks')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            adminTab === 'benchmarks'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Standards &amp; Rubrics ({benchmarks.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('allAudits')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            adminTab === 'allAudits'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Cross-User Audit Results ({allInteractions.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('synthesis')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            adminTab === 'synthesis'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Executive Synthesis</span>
        </button>
      </div>

      {/* TAB 1: COMPANY BENCHMARKS & AUDIT CRITERIA UPLOADER */}
      {adminTab === 'benchmarks' && (
        <div className="space-y-6">
          {/* Uploader Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Upload Company Information &amp; Quality Audit Rubrics</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  These standards serve as the baseline ground truth for Gemini to evaluate all employee workflows.
                </p>
              </div>

              {/* Seed Presets */}
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Quick Seed:</span>
                {PRESET_STANDARDS.map((p, idx) => {
                  const shortLabels = ['+ PADI / ISO 24803', '+ Bauer Air Purity', '+ Marine Sanctuary', '+ Fleet Safety'];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSeedPreset(p)}
                      disabled={bmLoading}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[11px] text-cyan-300 transition-colors cursor-pointer"
                      title={p.title}
                    >
                      {shortLabels[idx] || `+ ${p.title.split(' ')[0]}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {bmSuccess && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{bmSuccess}</span>
              </div>
            )}

            {bmError && (
              <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{bmError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBenchmark} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Standard / Rubric Title
                  </label>
                  <input
                    type="text"
                    value={bmTitle}
                    onChange={(e) => setBmTitle(e.target.value)}
                    placeholder="e.g., ISO 9001:2015 Quality Objectives or Logistics SOP v3"
                    required
                    maxLength={200}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={bmCategory}
                    onChange={(e) => setBmCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="quality_standard">Quality Standard</option>
                    <option value="sop">Standard Operating Procedure (SOP)</option>
                    <option value="policy">Corporate Policy</option>
                    <option value="kpi">KPI Benchmark</option>
                    <option value="audit_rubric">Audit Rubric</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Standard Documentation / Policy Content
                </label>
                <textarea
                  rows={5}
                  value={bmContent}
                  onChange={(e) => setBmContent(e.target.value)}
                  placeholder="Paste or write the standard requirements, quality criteria, acceptable turnaround times, defect thresholds, and procedure guidelines..."
                  required
                  maxLength={50000}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={bmLoading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-amber-600/30 flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Company Standard</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Standards List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Published Company Standards ({benchmarks.length})
            </h4>

            {benchmarks.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                No company benchmarks uploaded yet. Upload one above or click a &ldquo;Quick Seed&rdquo; preset.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benchmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {bm.category.replace('_', ' ')}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">{bm.title}</h4>
                        <p className="text-[11px] text-slate-500">
                          Version {bm.version} &bull; Uploaded by {bm.uploadedBy}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBenchmark(bm.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Standard"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                      {bm.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CROSS-USER AUDIT RESULTS */}
      {adminTab === 'allAudits' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search across all users, roles, feedback..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Department:</span>
                <select
                  value={auditDeptFilter}
                  onChange={(e) => setAuditDeptFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Departments</option>
                  {departmentList.map((dept, i) => (
                    <option key={i} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <span>Sentiment:</span>
                <select
                  value={auditSentimentFilter}
                  onChange={(e) => setAuditSentimentFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table / Cards of Submissions */}
          {filteredAudits.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
              No audit records match the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAudits.map((item) => {
                const isExpanded = expandedAuditId === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-slate-200">
                            {item.userEmail}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {item.department || 'Operations'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Role: {item.userRole}
                          </span>
                          {item.sentiment && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                item.sentiment === 'positive'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : item.sentiment === 'critical'
                                  ? 'bg-red-500/10 text-red-400'
                                  : item.sentiment === 'needs_attention'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.sentiment.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-white font-medium line-clamp-2">
                          &ldquo;{item.prompt}&rdquo;
                        </p>
                      </div>

                      <button
                        onClick={() => setExpandedAuditId(isExpanded ? null : item.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center space-x-1 flex-shrink-0"
                      >
                        <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {item.reflectionSummary && (
                      <div className="p-2.5 rounded bg-slate-950/60 border border-slate-850 text-xs text-slate-300 italic">
                        <strong className="text-amber-400 not-italic">Gemini Reflection: </strong>
                        {item.reflectionSummary}
                      </div>
                    )}

                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                        <div className="font-semibold text-slate-300">Full Gemini Feedback:</div>
                        <div className="p-3 bg-slate-950 rounded-lg text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {item.response}
                        </div>
                        {item.actionItems && item.actionItems.length > 0 && (
                          <div className="text-emerald-400">
                            <span className="font-semibold">Suggested Action Items:</span>
                            <ul className="list-disc list-inside text-slate-300 mt-1">
                              {item.actionItems.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI EXECUTIVE QUALITY AUDIT SYNTHESIS */}
      {adminTab === 'synthesis' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Cross-Organization AI Executive Quality Audit</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gemini analyzes all employee audit logs against active company benchmarks to produce an organization-wide compliance and health synthesis.
                </p>
              </div>

              <button
                onClick={handleRunExecutiveSynthesis}
                disabled={synthesisLoading || allInteractions.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 flex items-center space-x-2 transition-all cursor-pointer"
              >
                {synthesisLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Synthesizing Enterprise Data...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Generate Executive Synthesis</span>
                  </>
                )}
              </button>
            </div>

            {synthesisError && (
              <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-red-300 text-xs">
                {synthesisError}
              </div>
            )}
          </div>

          {executiveReport && (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Executive Audit Report
                  </span>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-400">
                      Engine: {synthesisModelUsed || 'gemini-3.6-flash'}
                    </span>
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      Compliance Score: {executiveReport.complianceScore}%
                    </div>
                  </div>
                </div>

                <div className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  {executiveReport.executiveSummary}
                </div>

                {/* Top Concerns */}
                {executiveReport.topConcerns && executiveReport.topConcerns.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Critical Systemic Concerns:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {executiveReport.topConcerns.map((concern, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-xs text-red-200 flex items-start space-x-2"
                        >
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <span>{concern}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Department Insights */}
              {executiveReport.departmentInsights && executiveReport.departmentInsights.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-sm font-bold text-white">
                    Department Health &amp; Recommendations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {executiveReport.departmentInsights.map((dept, i) => (
                      <div
                        key={i}
                        className="bg-slate-950/70 border border-slate-850 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-sm text-white">{dept.department}</h5>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              dept.status === 'Healthy'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : dept.status === 'Critical'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {dept.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{dept.summary}</p>
                        {dept.recommendations && dept.recommendations.length > 0 && (
                          <div className="pt-2 border-t border-slate-850">
                            <span className="text-[11px] font-semibold text-slate-400">
                              Targeted Actions:
                            </span>
                            <ul className="list-disc list-inside text-xs text-slate-300 mt-1 space-y-0.5">
                              {dept.recommendations.map((rec, rIdx) => (
                                <li key={rIdx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategic Roadmap */}
              {executiveReport.strategicRoadmap && executiveReport.strategicRoadmap.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Strategic Quality Roadmap</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {executiveReport.strategicRoadmap.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-1"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                          {item.phase}
                        </span>
                        <p className="text-xs text-slate-200 leading-relaxed">{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
