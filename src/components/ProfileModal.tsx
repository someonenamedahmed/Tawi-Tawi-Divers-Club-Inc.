import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Briefcase, Building2, FileText, Check, AlertCircle, X, Sparkles } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  mandatory?: boolean;
}

const PRESET_ROLES = [
  {
    role: 'Lead Divemaster & Safety Officer',
    department: 'Dive Operations & Safety',
    description: 'Directs open-water dive briefings, verifies PADI/ISO 24803 pre-dive buddy checks, monitors diver depths and decompression limits, and inspects onboard emergency oxygen kits.',
  },
  {
    role: 'Marine Fleet Captain',
    department: 'Marine Vessel Operations',
    description: 'Operates twin-engine dive boats across Tawi-Tawi dive sites (Bongao, Sibutu, Simunul), manages Coast Guard pre-departure clearance, GPS navigation, and emergency anchor protocols.',
  },
  {
    role: 'Equipment & Compressor Technician',
    department: 'Scuba Gear & Gas Station',
    description: 'Maintains Bauer high-pressure air compressors, conducts gas purity & moisture checks, services Scubapro/Aqualung regulators, and logs cylinder hydrostatic inspections.',
  },
  {
    role: 'Marine Conservation & Eco-Guide',
    department: 'Marine Ecology & Guest Experience',
    description: 'Conducts tourist environmental orientations, monitors reef health in marine protected sanctuaries, enforces no-touch wildlife guidelines, and manages dive customer satisfaction.',
  },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  mandatory = false,
}) => {
  const { user, userProfile, saveUserProfile, isSuperAdmin } = useAuth();
  const [role, setRole] = useState(userProfile?.role || '');
  const [department, setDepartment] = useState(userProfile?.department || '');
  const [jobDescription, setJobDescription] = useState(userProfile?.jobDescription || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setRole(userProfile.role || '');
      setDepartment(userProfile.department || '');
      setJobDescription(userProfile.jobDescription || '');
    }
  }, [userProfile]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_ROLES[0]) => {
    setRole(preset.role);
    setDepartment(preset.department);
    setJobDescription(preset.description);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!role.trim()) {
      setErrorMessage('Please specify your professional role/title.');
      return;
    }
    if (!department.trim()) {
      setErrorMessage('Please specify your department.');
      return;
    }
    if (!jobDescription.trim() || jobDescription.trim().length < 15) {
      setErrorMessage('Please provide a specific function or job description (at least 15 characters).');
      return;
    }

    setLoading(true);
    try {
      await saveUserProfile({
        role: role.trim(),
        department: department.trim(),
        jobDescription: jobDescription.trim(),
      });
      setSuccessMessage('Professional profile successfully updated!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-4 overflow-y-auto">
      <div className="frosted-ocean-panel border border-cyan-400/30 rounded-2xl max-w-xl w-full p-6 sm:p-8 text-slate-100 shadow-2xl relative my-8">
        {!mandatory && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-cyan-500/50 shadow-md shadow-cyan-500/20 bg-slate-800 flex-shrink-0">
            <img
              src={userProfile?.photoURL || user?.photoURL || '/src/assets/images/lead_diver_photo_1792400579018.jpg'}
              alt={user?.displayName || 'Diver'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {mandatory ? 'Welcome! Set Up Your Diver Profile' : 'Diver Professional Background & Role'}
            </h2>
            <p className="text-xs text-slate-400">
              Gemini grounds all dive safety reflections, equipment logs, and recommendations to your specific club function.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-6">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quick-Fill Presets</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_ROLES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-left p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 text-xs transition-all"
              >
                <div className="font-semibold text-slate-200">{preset.role}</div>
                <div className="text-[11px] text-slate-400">{preset.department}</div>
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Your Role / Title in Company</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Senior QA Engineer"
                required
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Department</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Quality Assurance"
                required
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Specific Function &amp; Job Description</span>
            </label>
            <textarea
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Describe your primary duties, core processes you execute, and key deliverables you are evaluated on..."
              required
              maxLength={2000}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {jobDescription.length}/2000 characters
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            {!mandatory && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Saving Profile...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Professional Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
