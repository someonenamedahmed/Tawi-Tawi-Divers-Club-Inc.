import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Interaction,
  InteractionCategory,
  ChatMessage,
  CompanyBenchmark,
  SentimentType,
} from '../types';
import {
  db,
  handleFirestoreError,
  OperationType,
  sanitizeFirestorePayload,
} from '../firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Clock,
  Briefcase,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  FileText,
  RotateCcw,
  Download,
  Filter,
  CheckSquare,
  Square,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  Trash2,
} from 'lucide-react';

const CATEGORIES: {
  id: InteractionCategory;
  label: string;
  desc: string;
  icon: any;
  color: string;
  starters: string[];
}[] = [
  {
    id: 'process',
    label: 'Dive & Marine Processes',
    desc: 'Audit boat pre-departure checks, compressor fill routines, and dive safety SOPs.',
    icon: FileText,
    color: 'indigo',
    starters: [
      'Auditing our boat pre-departure safety checklist and emergency O2 kit pressure check before heading to Simunul dive sites.',
      'Documenting our post-dive regulator freshwater rinse and BCD bladder desalinization protocol for rental sets.',
      'Reviewing our guest diver check-in workflow: C-card certification checks, liability waivers, and health questionnaires.',
    ],
  },
  {
    id: 'difficulty',
    label: 'Equipment & Logistics Hurdles',
    desc: 'Surface compressor bottlenecks, salt corrosion, fuel availability, or weather delays.',
    icon: AlertTriangle,
    color: 'amber',
    starters: [
      'High ambient humidity in Bongao is increasing moisture buildup in compressor filters, requiring more frequent cartridge swaps.',
      'Strong tidal currents in the Sibutu Passage require closer coordination between the boat captain and surface marker buoys (SMB).',
      'Intermittent fuel delivery to the marina is creating scheduling uncertainty for full-day expeditions to Turtle Islands.',
    ],
  },
  {
    id: 'complaint',
    label: 'Safety Concerns & Friction',
    desc: 'Voice customer protocol non-compliance, tight tank turnaround times, or gear issues.',
    icon: AlertCircle,
    color: 'rose',
    starters: [
      'Guest divers occasionally push decompression limits or attempt touching sea turtles despite pre-dive briefings.',
      'Turnaround interval between morning two-tank trips and afternoon dives is too short for proper cylinder cooling before refilling.',
      'Rental fins and mask straps are showing premature salt wear without a designated chemical sanitization station.',
    ],
  },
  {
    id: 'suggestion',
    label: 'Innovations & Eco-Solutions',
    desc: 'Propose reef conservation initiatives, digital tank tracking, or guest safety upgrades.',
    icon: Lightbulb,
    color: 'emerald',
    starters: [
      'Propose implementing QR code badges on scuba cylinders to log fill pressure, inspection dates, and gas purity tests.',
      'Establish permanent eco-mooring buoys around Bongao Peak reefs to prevent dive boat anchor damage to staghorn coral.',
      'Create a digital emergency evacuation card detailing maritime medevac routes from Sibutu to Bongao Hospital.',
    ],
  },
  {
    id: 'general',
    label: 'General Operational Reflection',
    desc: 'Holistic review of diving hospitality, marine ecology, and team coordination.',
    icon: Sparkles,
    color: 'blue',
    starters: [
      'Evaluating our dive guide-to-guest ratio during high season to maintain personal safety standards.',
      'Reflecting on our collaboration with local coastal communities in Tawi-Tawi to support eco-tourism livelihood.',
    ],
  },
];

interface UserDashboardProps {
  onOpenProfile: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onOpenProfile }) => {
  const { user, userProfile } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<'audit' | 'history'>('audit');
  const [selectedCategory, setSelectedCategory] = useState<InteractionCategory>('process');
  const [promptInput, setPromptInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [historyEntries, setHistoryEntries] = useState<Interaction[]>([]);
  const [companyBenchmarks, setCompanyBenchmarks] = useState<CompanyBenchmark[]>([]);

  // Failed Save Recovery State (Guaranteed Transaction Verification)
  const [pendingSavePayload, setPendingSavePayload] = useState<any | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isRetryingSave, setIsRetryingSave] = useState(false);

  // History Filter
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>('all');
  const [historySentimentFilter, setHistorySentimentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Load company benchmarks for grounding
  useEffect(() => {
    if (!user) return;
    const fetchBenchmarks = async () => {
      try {
        const snap = await getDocs(collection(db, 'company_benchmarks'));
        const list: CompanyBenchmark[] = [];
        snap.forEach((d) => list.push(d.data() as CompanyBenchmark));
        setCompanyBenchmarks(list);
      } catch (err) {
        console.warn('Could not load company benchmarks:', err);
      }
    };
    fetchBenchmarks();
  }, [user]);

  // Real-time listener for user's isolated interactions
  useEffect(() => {
    if (!user) return;
    const interactionsRef = collection(db, 'users', user.uid, 'interactions');
    const q = query(interactionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Interaction[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data() as Interaction);
        });
        setHistoryEntries(items);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${user.uid}/interactions`
        );
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Persist interaction to Firestore with Strict Undefined-Stripping
  const persistInteraction = async (payload: {
    prompt: string;
    response: string;
    category: InteractionCategory;
    reflectionSummary?: string;
    modelUsed?: string;
    sentiment?: SentimentType;
    actionItems?: string[];
    tags?: string[];
  }): Promise<boolean> => {
    if (!user) return false;

    const interactionId = `int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: Interaction = {
      id: interactionId,
      userId: user.uid,
      userEmail: user.email || '',
      userRole: userProfile?.role || 'Team Member',
      department: userProfile?.department || 'Operations',
      category: payload.category,
      prompt: payload.prompt,
      response: payload.response,
      reflectionSummary: payload.reflectionSummary || 'Audited and analyzed by Gemini.',
      modelUsed: payload.modelUsed || 'gemini-3.6-flash',
      sentiment: payload.sentiment || 'neutral',
      actionItems: payload.actionItems || [],
      tags: payload.tags || [payload.category],
      createdAt: now,
      updatedAt: now,
    };

    const sanitizedData = sanitizeFirestorePayload(record);

    try {
      const docRef = doc(db, 'users', user.uid, 'interactions', interactionId);
      await setDoc(docRef, sanitizedData);
      setPendingSavePayload(null);
      setSaveErrorMessage(null);
      return true;
    } catch (err: any) {
      console.error('[Persistence Error]: Failed to save interaction:', err);
      // Retain payload for explicit retry banner
      setPendingSavePayload(sanitizedData);
      setSaveErrorMessage(
        'Database write failed: Interaction could not be saved to Firestore. Click Retry to persist your audit record.'
      );
      return false;
    }
  };

  // Explicit Retry Save
  const handleRetrySave = async () => {
    if (!user || !pendingSavePayload) return;
    setIsRetryingSave(true);
    try {
      const docRef = doc(
        db,
        'users',
        user.uid,
        'interactions',
        pendingSavePayload.id
      );
      await setDoc(docRef, pendingSavePayload);
      setPendingSavePayload(null);
      setSaveErrorMessage(null);
    } catch (err: any) {
      setSaveErrorMessage(`Retry failed: ${err.message || 'Please check connection'}`);
    } finally {
      setIsRetryingSave(false);
    }
  };

  // Submit Prompt to Gemini with Multi-Turn Context
  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isSubmitting) return;

    const currentPrompt = promptInput.trim();
    // Do NOT clear prompt input until generation succeeds and save is evaluated
    setIsSubmitting(true);
    setSaveErrorMessage(null);

    // Append user message to chat state
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: currentPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      // Prepare history transcript for backend multi-turn conversation
      const conversationHistory = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          category: selectedCategory,
          userRole: userProfile?.role || 'Staff Member',
          department: userProfile?.department || 'Operations',
          jobDescription: userProfile?.jobDescription || '',
          history: conversationHistory,
          companyStandards: companyBenchmarks,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reflectionSummary: data.reflectionSummary,
        sentiment: data.sentiment,
        actionItems: data.actionItems,
        modelUsed: data.modelUsed,
        savedToDb: true,
      };

      setChatMessages((prev) => [...prev, aiMsg]);

      // Persist both prompt and Gemini response to user's Firestore subcollection
      const saved = await persistInteraction({
        prompt: currentPrompt,
        response: data.response,
        category: selectedCategory,
        reflectionSummary: data.reflectionSummary,
        modelUsed: data.modelUsed,
        sentiment: data.sentiment,
        actionItems: data.actionItems,
        tags: data.tags,
      });

      if (saved) {
        // Clear input buffer only upon guaranteed transaction settlement
        setPromptInput('');
      }
    } catch (err: any) {
      console.error('Audit generation error:', err);
      setSaveErrorMessage(`Audit generation failed: ${err.message || 'Unknown network error'}`);
      // Append error message to chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `⚠️ Failed to retrieve Gemini reflection: ${err.message}. Your input has been preserved in the editor below.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this audit record?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'interactions', interactionId));
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${user.uid}/interactions/${interactionId}`
      );
    }
  };

  // Export Transcript
  const handleExportHistory = () => {
    if (historyEntries.length === 0) return;
    const content = historyEntries
      .map(
        (entry, i) =>
          `### Entry ${i + 1} - ${entry.category.toUpperCase()} (${new Date(entry.createdAt).toLocaleDateString()})
**Employee**: ${entry.userEmail} | **Role**: ${entry.userRole} | **Dept**: ${entry.department}
**Sentiment**: ${entry.sentiment} | **Engine**: ${entry.modelUsed}

#### User Inquiry / Bottleneck:
${entry.prompt}

#### Gemini Quality Reflection:
${entry.response}

#### Executive Summary:
${entry.reflectionSummary || 'N/A'}

${entry.actionItems && entry.actionItems.length > 0 ? `**Action Items:**\n${entry.actionItems.map((a) => `- [ ] ${a}`).join('\n')}` : ''}
---
`
      )
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AegisAudit_Report_${user?.displayName || 'User'}_${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtered History
  const filteredHistory = historyEntries.filter((item) => {
    const matchesCat =
      historyCategoryFilter === 'all' || item.category === historyCategoryFilter;
    const matchesSentiment =
      historySentimentFilter === 'all' || item.sentiment === historySentimentFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.response.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reflectionSummary &&
        item.reflectionSummary.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSentiment && matchesSearch;
  });

  const activeCategoryConfig =
    CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Employee Professional Context Ribbon with Frosted Glass */}
      <div className="frosted-glass rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-cyan-500/40 shadow-md shadow-cyan-600/20 bg-slate-800">
              <img
                src={userProfile?.photoURL || user?.photoURL || '/src/assets/images/lead_diver_photo_1792400579018.jpg'}
                alt={user?.displayName || 'Diver Avatar'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-slate-900 shadow">
              <img
                src="/src/assets/images/tawitawi_divers_logo_1792400280899.jpg"
                alt="Tawi-Tawi Divers Club Inc."
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">
                {user?.displayName || 'Authenticated Dive Staff'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {userProfile?.department || 'Dive Operations & Safety'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Role: <span className="text-slate-200">{userProfile?.role || 'Staff Member'}</span> &bull;{' '}
              <span className="text-slate-400 italic truncate max-w-md inline-block align-bottom">
                {userProfile?.jobDescription || 'Click Edit Profile to define your job function.'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {companyBenchmarks.length > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{companyBenchmarks.length} Active Company Standards Grounded</span>
            </div>
          )}
          <button
            onClick={onOpenProfile}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
            <span>Edit Profile Context</span>
          </button>
        </div>
      </div>

      {/* Persistence Error Banner / Retry Save Option */}
      {saveErrorMessage && (
        <div className="bg-red-950/80 border border-red-500/50 rounded-xl p-4 text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold">{saveErrorMessage}</p>
              <p className="text-[11px] text-red-300/80">
                Your entries remain safe in this session. Reconnect and click Retry to ensure cloud persistence.
              </p>
            </div>
          </div>
          {pendingSavePayload && (
            <button
              onClick={handleRetrySave}
              disabled={isRetryingSave}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center space-x-2 flex-shrink-0 cursor-pointer shadow-md"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRetryingSave ? 'animate-spin' : ''}`} />
              <span>{isRetryingSave ? 'Retrying...' : 'Retry Save to Cloud'}</span>
            </button>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>New Quality Audit &amp; Reflection</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Audit Vault ({historyEntries.length})</span>
          </button>
        </div>

        {activeTab === 'history' && historyEntries.length > 0 && (
          <button
            onClick={handleExportHistory}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report (.md)</span>
          </button>
        )}
      </div>

      {/* TAB 1: NEW AUDIT REFLECTION */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Category Selection Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Audit Focus Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'frosted-glass-active shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400'
                        : 'frosted-glass-card hover:border-cyan-400/30 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <div
                        className={`text-xs font-bold ${
                          isSelected ? 'text-cyan-200' : 'text-slate-200'
                        }`}
                      >
                        {cat.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                        {cat.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Starters */}
          <div className="frosted-glass-card rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center space-x-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Suggested Starters for {activeCategoryConfig.label}:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeCategoryConfig.starters.map((starter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPromptInput(starter)}
                  className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/80 hover:border-indigo-500/50 text-slate-300 transition-colors"
                >
                  &ldquo;{starter}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Chat Stream & Exchanges with Frosted Glass */}
          {chatMessages.length > 0 && (
            <div className="frosted-glass rounded-2xl p-5 space-y-4 max-h-[500px] overflow-y-auto shadow-2xl">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md shadow-cyan-600/20'
                        : 'bg-slate-900/85 backdrop-blur-md border border-cyan-500/25 text-slate-100 rounded-tl-none space-y-3 shadow-lg'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-[11px] opacity-75 mb-1">
                      {msg.role === 'user' ? (
                        <>
                          <span>You ({userProfile?.role || 'Staff'})</span>
                          <span>&bull;</span>
                          <span>{msg.timestamp}</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-semibold text-cyan-300">
                            AegisAudit AI ({msg.modelUsed || 'Gemini 3.6 Flash'})
                          </span>
                          <span>&bull;</span>
                          <span>{msg.timestamp}</span>
                          {msg.sentiment && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                msg.sentiment === 'positive'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : msg.sentiment === 'critical'
                                  ? 'bg-red-500/20 text-red-300'
                                  : msg.sentiment === 'needs_attention'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {msg.sentiment.replace('_', ' ')}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* AI Structured Addendum */}
                    {msg.role === 'model' && msg.reflectionSummary && (
                      <div className="pt-2 mt-2 border-t border-slate-700/80">
                        <div className="text-xs font-semibold text-cyan-300 flex items-center space-x-1 mb-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Executive Takeaway</span>
                        </div>
                        <p className="text-xs text-slate-200 italic bg-slate-950/70 p-2.5 rounded-lg border border-slate-700/50">
                          {msg.reflectionSummary}
                        </p>
                      </div>
                    )}

                    {msg.role === 'model' && msg.actionItems && msg.actionItems.length > 0 && (
                      <div className="pt-2">
                        <div className="text-xs font-semibold text-emerald-400 flex items-center space-x-1 mb-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Recommended Action Items</span>
                        </div>
                        <ul className="space-y-1">
                          {msg.actionItems.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-slate-200 flex items-start space-x-1.5"
                            >
                              <span className="text-emerald-400 font-bold">&bull;</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input Box with Frosted Glass */}
          <form
            onSubmit={handleSubmitAudit}
            className="frosted-glass rounded-2xl p-4 space-y-3 shadow-2xl border border-white/10 focus-within:border-cyan-400/50"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <activeCategoryConfig.icon className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Log Entry for Category: <strong className="text-white">{activeCategoryConfig.label}</strong>
                </span>
              </span>
              <span className="text-[11px] text-slate-500">
                Grounding against {userProfile?.role || 'Current Role'} &amp; Company Benchmarks
              </span>
            </div>

            <textarea
              rows={4}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder={`Describe your ${activeCategoryConfig.label.toLowerCase()} in detail. E.g., explain what went wrong, which tool or SOP failed, or what you suggest we improve...`}
              disabled={isSubmitting}
              maxLength={10000}
              className="w-full frosted-ocean-input rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 leading-relaxed resize-y shadow-inner"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2 text-[11px] text-cyan-200/70">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Engine: Gemini 3.6 Flash Fallback Ladder</span>
              </div>

              <div className="flex items-center space-x-3">
                {promptInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPromptInput('')}
                    disabled={isSubmitting}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !promptInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-cyan-600/30 flex items-center space-x-2 transition-all cursor-pointer border border-white/10"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Gemini Auditing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit for Quality Audit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: AUDIT HISTORY & PAST ENTRIES */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters with Frosted Glass */}
          <div className="frosted-glass rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit entries, issues, insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>Category:</span>
                <select
                  value={historyCategoryFilter}
                  onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                  className="bg-slate-900/80 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="process">Dive &amp; Marine Processes</option>
                  <option value="difficulty">Difficulties</option>
                  <option value="complaint">Safety Concerns</option>
                  <option value="suggestion">Innovations &amp; Solutions</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                <span>Sentiment:</span>
                <select
                  value={historySentimentFilter}
                  onChange={(e) => setHistorySentimentFilter(e.target.value)}
                  className="bg-slate-900/80 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
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

          {/* History Entries List with Frosted Glass */}
          {filteredHistory.length === 0 ? (
            <div className="frosted-glass rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-xl">
              <Clock className="w-10 h-10 mx-auto text-cyan-400/60" />
              <h3 className="text-base font-semibold text-slate-200">
                {historyEntries.length === 0
                  ? 'No Dive Audit Entries Saved Yet'
                  : 'No Entries Match Your Search/Filter'}
              </h3>
              <p className="text-xs max-w-md mx-auto text-slate-400">
                {historyEntries.length === 0
                  ? 'Switch to the "New Quality Audit & Reflection" tab above to start logging work processes, difficulties, and suggestions.'
                  : 'Try clearing the search query or adjusting the category and sentiment filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((entry) => {
                const isExpanded = expandedEntryId === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="frosted-glass-card rounded-2xl p-5 hover:border-cyan-400/40 transition-all shadow-xl space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {entry.category}
                          </span>
                          {entry.sentiment && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                entry.sentiment === 'positive'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : entry.sentiment === 'critical'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : entry.sentiment === 'needs_attention'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {entry.sentiment.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                          &ldquo;{entry.prompt}&rdquo;
                        </h4>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1"
                        >
                          <span>{isExpanded ? 'Less' : 'Review'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteInteraction(entry.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Executive Takeaway Summary */}
                    {entry.reflectionSummary && (
                      <div className="bg-slate-800/60 border border-slate-750 rounded-xl p-3 text-xs text-slate-300">
                        <strong className="text-indigo-300 block mb-0.5">
                          Synthesized Reflection:
                        </strong>
                        <p className="italic text-slate-300">{entry.reflectionSummary}</p>
                      </div>
                    )}

                    {/* Expanded Gemini Full Audit Response */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-800 space-y-3">
                        <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                          <Bot className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Gemini Full Audit Reflection &amp; Brainstorming:</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {entry.response}
                        </div>

                        {entry.actionItems && entry.actionItems.length > 0 && (
                          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                            <span className="text-xs font-semibold text-emerald-300 block mb-1">
                              Action Items:
                            </span>
                            <ul className="space-y-1">
                              {entry.actionItems.map((item, idx) => (
                                <li
                                  key={idx}
                                  className="text-xs text-slate-300 flex items-center space-x-2"
                                >
                                  <CheckSquare className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>Model: {entry.modelUsed || 'gemini-3.6-flash'}</span>
                          <span>Role: {entry.userRole} &bull; Dept: {entry.department}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
