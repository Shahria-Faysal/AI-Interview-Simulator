import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Layers, Server, Globe2, BarChart2,
  ChevronRight, Zap, BarChart, Flame,
  BrainCircuit, RefreshCw, AlertCircle, Sparkles, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCreateSession, useResumes, useResumeInsights } from '../hooks/useApi'
import { PageHeader, Card, Button, ErrorAlert } from '../components/ui'

// ─── Static data ──────────────────────────────────────────────────────────────

const ROLES = [
  {
    value: 'FRONTEND_DEVELOPER',
    label: 'Frontend Developer',
    desc: 'React, DOM, hooks, component patterns',
    icon: Layers,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    value: 'BACKEND_DEVELOPER',
    label: 'Backend Developer',
    desc: 'REST APIs, middleware, JWT, databases',
    icon: Server,
    color: 'text-green-600 bg-green-100',
  },
  {
    value: 'FULL_STACK_DEVELOPER',
    label: 'Full Stack Developer',
    desc: 'Frontend + backend, deployment, architecture',
    icon: Globe2,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    value: 'DATA_ANALYST',
    label: 'Data Analyst',
    desc: 'SQL, analytics, normalisation, window functions',
    icon: BarChart2,
    color: 'text-amber-600 bg-amber-100',
  },
]

const DIFFICULTIES = [
  {
    value: 'EASY',
    label: 'Easy',
    desc: '5 questions — core concepts',
    icon: Zap,
    color: 'text-green-600 bg-green-100 border-green-200',
  },
  {
    value: 'MEDIUM',
    label: 'Medium',
    desc: '7 questions — practical knowledge',
    icon: BarChart,
    color: 'text-amber-600 bg-amber-100 border-amber-200',
  },
  {
    value: 'HARD',
    label: 'Hard',
    desc: '10 questions — advanced depth',
    icon: Flame,
    color: 'text-red-600 bg-red-100 border-red-200',
  },
]

// ─── AI loading overlay ───────────────────────────────────────────────────────

function AILoadingOverlay({ role, difficulty }) {
  const roleLabel  = ROLES.find(r => r.value === role)?.label       ?? role
  const diffLabel  = DIFFICULTIES.find(d => d.value === difficulty)?.label ?? difficulty

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center animate-slide-up">
        {/* Animated brain icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-100 mx-auto mb-5">
          <BrainCircuit size={32} className="text-brand-600 animate-pulse" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Generating your interview
        </h3>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          Our AI is crafting personalised{' '}
          <span className="font-semibold text-slate-700">{roleLabel}</span> questions
          at <span className="font-semibold text-slate-700">{diffLabel}</span> difficulty.
          This takes a few seconds…
        </p>

        {/* Animated progress dots */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-brand-500"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Questions are saved — this only happens once per session
        </p>
      </div>

      {/* Inline keyframes for the dot bounce */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateInterviewPage() {
  const navigate  = useNavigate()
  const { mutateAsync: createSession, isPending } = useCreateSession()

  const [selectedRole,       setSelectedRole]       = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [serverError,        setServerError]        = useState('')
  const [retryCount,         setRetryCount]         = useState(0)

  // Check if user has an analyzed resume for personalization notice
  const { data: resumes = [] }       = useResumes()
  const latestResume                 = resumes[0] ?? null
  const { data: insights }           = useResumeInsights(latestResume?.id)
  const hasAnalyzedResume            = insights?.analysisStatus === 'done' &&
                                       ((insights?.skills?.length ?? 0) > 0 ||
                                        (insights?.projects?.length ?? 0) > 0)

  const handleStart = async () => {
    if (!selectedRole)       { toast.error('Please select a role.');       return }
    if (!selectedDifficulty) { toast.error('Please select a difficulty.'); return }

    setServerError('')

    try {
      const res = await createSession({ role: selectedRole, difficulty: selectedDifficulty })
      const { session, meta } = res.data

      if (meta?.isPersonalized) {
        toast.success(`✨ ${meta.questionCount} personalized questions ready!`)
      } else if (meta?.questionSource === 'ai') {
        toast.success(`${meta.questionCount} AI-generated questions ready!`)
      } else {
        toast.success('Interview session created!')
      }

      navigate(`/interview/${session.id}`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create session. Please try again.'
      setServerError(msg)
      setRetryCount(c => c + 1)
    }
  }

  const canStart = selectedRole && selectedDifficulty

  return (
    <>
      {/* Overlay while AI is generating */}
      {isPending && (
        <AILoadingOverlay role={selectedRole} difficulty={selectedDifficulty} />
      )}

      <div className="animate-fade-in max-w-2xl">
        <PageHeader
          title="New interview"
          description="Choose your role and difficulty — AI will generate your questions."
        />

        {/* Error with retry hint */}
        {serverError && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 mb-6">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">{serverError}</p>
              {retryCount >= 2 && (
                <p className="text-xs text-red-500 mt-1">
                  If the problem persists, check that your Gemini API key is configured correctly.
                </p>
              )}
            </div>
            {retryCount > 0 && canStart && (
              <button
                onClick={handleStart}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 flex-shrink-0"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            )}
          </div>
        )}

        {/* ── Role selection ── */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Select role
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ROLES.map(({ value, label, desc, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setSelectedRole(value)}
                disabled={isPending}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  selectedRole === value
                    ? 'border-brand-500 bg-brand-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Difficulty selection ── */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Select difficulty
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {DIFFICULTIES.map(({ value, label, desc, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setSelectedDifficulty(value)}
                disabled={isPending}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  selectedDifficulty === value
                    ? 'border-brand-500 bg-brand-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Personalization / AI info banner ── */}
        {hasAnalyzedResume ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-200 mb-5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex-shrink-0">
              <Sparkles size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-800">
                Personalized interview enabled
              </p>
              <p className="text-xs text-brand-600 mt-0.5">
                Your questions will reference your actual skills
                {insights?.skills?.slice(0, 3).join(', ') ? ` (${insights.skills.slice(0, 3).join(', ')}${insights.skills.length > 3 ? '…' : ''})` : ''}
                {' '}and projects from your resume.
              </p>
            </div>
          </div>
        ) : latestResume ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-5">
            <BrainCircuit size={15} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Resume analysis is still in progress — questions will be personalized once ready.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 mb-5">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">No resume uploaded</span> — questions will use your selected role and difficulty.
              </p>
            </div>
            <Link to="/resume" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex-shrink-0">
              Upload
            </Link>
          </div>
        )}

        {/* ── Summary + start ── */}
        {canStart ? (
          <Card className="flex items-center justify-between gap-4 animate-slide-up">
            <div>
              <p className="text-sm font-medium text-slate-800">
                {ROLES.find(r => r.value === selectedRole)?.label}
                {' · '}
                {DIFFICULTIES.find(d => d.value === selectedDifficulty)?.label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {DIFFICULTIES.find(d => d.value === selectedDifficulty)?.desc}
                {' — AI-generated'}
              </p>
            </div>
            <Button loading={isPending} onClick={handleStart}>
              {isPending ? 'Generating…' : 'Start interview'}
              {!isPending && <ChevronRight size={16} />}
            </Button>
          </Card>
        ) : (
          <Button disabled className="mt-2">
            Select role & difficulty to continue
          </Button>
        )}
      </div>
    </>
  )
}
