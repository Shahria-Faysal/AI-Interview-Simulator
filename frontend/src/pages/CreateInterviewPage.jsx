import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Server, Globe2, BarChart2, ChevronRight, Zap, BarChart, Flame } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCreateSession } from '../hooks/useApi'
import { PageHeader, Card, Button, ErrorAlert } from '../components/ui'

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
    desc: 'SQL, analytics, normalization, window functions',
    icon: BarChart2,
    color: 'text-amber-600 bg-amber-100',
  },
]

const DIFFICULTIES = [
  {
    value: 'EASY',
    label: 'Easy',
    desc: '3 questions — core concepts',
    icon: Zap,
    color: 'text-green-600 bg-green-100 border-green-200',
  },
  {
    value: 'MEDIUM',
    label: 'Medium',
    desc: '5 questions — practical knowledge',
    icon: BarChart,
    color: 'text-amber-600 bg-amber-100 border-amber-200',
  },
  {
    value: 'HARD',
    label: 'Hard',
    desc: '7 questions — advanced depth',
    icon: Flame,
    color: 'text-red-600 bg-red-100 border-red-200',
  },
]

export default function CreateInterviewPage() {
  const navigate = useNavigate()
  const { mutateAsync: createSession, isPending } = useCreateSession()

  const [selectedRole, setSelectedRole] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [serverError, setServerError] = useState('')

  const handleStart = async () => {
    if (!selectedRole)       { toast.error('Please select a role.'); return }
    if (!selectedDifficulty) { toast.error('Please select a difficulty.'); return }

    setServerError('')
    try {
      const res = await createSession({ role: selectedRole, difficulty: selectedDifficulty })
      const session = res.data.session
      toast.success('Interview session created!')
      navigate(`/interview/${session.id}`)
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to create session.')
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader
        title="New interview"
        description="Choose your role and difficulty to begin."
      />

      <ErrorAlert message={serverError} />

      {/* Role selection */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Select role
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {ROLES.map(({ value, label, desc, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => setSelectedRole(value)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                selectedRole === value
                  ? 'border-brand-500 bg-brand-50'
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

      {/* Difficulty selection */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Select difficulty
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {DIFFICULTIES.map(({ value, label, desc, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => setSelectedDifficulty(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                selectedDifficulty === value
                  ? 'border-brand-500 bg-brand-50'
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

      {/* Summary + start */}
      {selectedRole && selectedDifficulty && (
        <Card className="flex items-center justify-between gap-4 animate-slide-up">
          <div>
            <p className="text-sm font-medium text-slate-800">
              {ROLES.find(r => r.value === selectedRole)?.label} ·{' '}
              {DIFFICULTIES.find(d => d.value === selectedDifficulty)?.label}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {DIFFICULTIES.find(d => d.value === selectedDifficulty)?.desc}
            </p>
          </div>
          <Button loading={isPending} onClick={handleStart}>
            Start interview
            <ChevronRight size={16} />
          </Button>
        </Card>
      )}

      {(!selectedRole || !selectedDifficulty) && (
        <Button disabled className="mt-2">
          Select role & difficulty to continue
        </Button>
      )}
    </div>
  )
}
