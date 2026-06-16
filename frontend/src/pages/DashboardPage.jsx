import { Link } from 'react-router-dom'
import { Plus, FileText, History, Trophy, Briefcase, BrainCircuit, Database, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useResumes, useSessions } from '../hooks/useApi'
import { PageHeader, Card, Badge, Button, PageLoader, EmptyState } from '../components/ui'
import { formatRole, formatDifficulty, difficultyVariant, formatDate, scoreColorClass } from '../utils/format'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: resumes  = [], isLoading: resumesLoading  } = useResumes()
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions()

  const completedSessions = sessions.filter(s => s.completedAt)

  // Prefer AI-evaluated scores (1-10 averaged → 0-100) for the avg stat
  const aiScoreSessions = completedSessions.filter(s => {
    const qs = s.questions ?? []
    return qs.some(q => q.score !== null && q.score !== undefined)
  })

  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / completedSessions.length)
    : null

  const aiSessionCount = sessions.filter(s => s.questionSource === 'ai').length
  const latestResume   = resumes[0] ?? null
  const recentSessions = sessions.slice(0, 3)

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]} 👋`}
        description="Here's an overview of your interview practice."
        action={
          <Link to="/interview/new">
            <Button><Plus size={16} />New interview</Button>
          </Link>
        }
      />

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total sessions"  value={sessions.length}          icon={Briefcase} />
        <StatCard label="Completed"       value={completedSessions.length} icon={Trophy} />
        <StatCard
          label="Avg score"
          value={avgScore !== null ? `${avgScore}%` : '—'}
          icon={Trophy}
          color="text-brand-600"
        />
        <StatCard
          label="AI sessions"
          value={aiSessionCount}
          icon={BrainCircuit}
          color="text-brand-600"
          title="Sessions using Gemini-generated questions"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Resume card ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Resume</h2>
            <Link to="/resume" className="text-xs text-brand-600 hover:underline">
              {latestResume ? 'Manage' : 'Upload'}
            </Link>
          </div>
          {resumesLoading ? (
            <div className="h-16 bg-slate-100 animate-pulse rounded-lg" />
          ) : latestResume ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-600 flex-shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{latestResume.fileName}</p>
                <p className="text-xs text-slate-500">{formatDate(latestResume.uploadedAt)}</p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No resume yet"
              description="Upload your PDF resume to get started."
              action={
                <Link to="/resume">
                  <Button size="sm" variant="secondary">Upload resume</Button>
                </Link>
              }
            />
          )}
        </Card>

        {/* ── Recent sessions card ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent sessions</h2>
            <Link to="/history" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>

          {sessionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />)}
            </div>
          ) : recentSessions.length > 0 ? (
            <div className="space-y-1">
              {recentSessions.map(s => {
                const questions   = s.questions ?? []
                const aiEvaluated = questions.filter(q => q.score !== null && q.score !== undefined)
                const avgAI       = aiEvaluated.length > 0
                  ? (aiEvaluated.reduce((sum, q) => sum + q.score, 0) / aiEvaluated.length).toFixed(1)
                  : null

                return (
                  <Link
                    key={s.id}
                    to={s.completedAt ? `/interview/${s.id}/results` : `/interview/${s.id}`}
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{formatRole(s.role)}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant={difficultyVariant(s.difficulty)}>
                            {formatDifficulty(s.difficulty)}
                          </Badge>
                          {s.questionSource === 'ai' ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-brand-600 font-medium">
                              <BrainCircuit size={10} /> AI
                            </span>
                          ) : s.questionSource === 'fallback' ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
                              <Database size={10} /> Bank
                            </span>
                          ) : null}
                          <span className="text-xs text-slate-400">{formatDate(s.startedAt)}</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-3 flex items-center gap-2">
                        {s.completedAt ? (
                          <>
                            {/* Show AI avg score if available, else session % */}
                            {avgAI !== null ? (
                              <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${scoreColorClass(parseFloat(avgAI))}`}>
                                {avgAI}/10
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-brand-600">{s.score ?? 0}%</span>
                            )}
                            <Star size={13} className="text-slate-300" />
                          </>
                        ) : (
                          <Badge variant="warning">In progress</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={History}
              title="No sessions yet"
              description="Start your first interview to see it here."
              action={
                <Link to="/interview/new">
                  <Button size="sm"><Plus size={14} />Start interview</Button>
                </Link>
              }
            />
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color = 'text-slate-700', title }) {
  return (
    <Card className="flex flex-col gap-2 p-4" title={title}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
        <Icon size={16} className="text-slate-400" />
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </Card>
  )
}
