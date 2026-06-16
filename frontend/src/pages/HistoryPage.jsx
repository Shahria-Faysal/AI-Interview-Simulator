import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  History, ChevronDown, ChevronUp, Plus, CheckCircle2,
  Clock, BrainCircuit, Database, Star, ThumbsUp, ThumbsDown
} from 'lucide-react'
import { useSessions } from '../hooks/useApi'
import { PageHeader, Card, Badge, Button, PageLoader, EmptyState } from '../components/ui'
import {
  formatRole, formatDifficulty, difficultyVariant,
  formatDate, formatDuration, scoreColorClass, scoreLabel
} from '../utils/format'

export default function HistoryPage() {
  const { data: sessions = [], isLoading } = useSessions()
  const [expandedId, setExpandedId] = useState(null)

  if (isLoading) return <PageLoader />

  const completed  = sessions.filter(s =>  s.completedAt)
  const inProgress = sessions.filter(s => !s.completedAt)

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Interview history"
        description={`${sessions.length} total session${sessions.length !== 1 ? 's' : ''}`}
        action={
          <Link to="/interview/new">
            <Button size="sm">
              <Plus size={14} />
              New interview
            </Button>
          </Link>
        }
      />

      {sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={History}
            title="No sessions yet"
            description="Complete your first interview to see results here."
            action={
              <Link to="/interview/new">
                <Button><Plus size={14} />Start interview</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                In progress ({inProgress.length})
              </h2>
              <div className="space-y-3">
                {inProgress.map(s => (
                  <SessionCard
                    key={s.id} session={s}
                    expanded={expandedId === s.id}
                    onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Completed ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map(s => (
                  <SessionCard
                    key={s.id} session={s}
                    expanded={expandedId === s.id}
                    onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, expanded, onToggle }) {
  const isComplete     = !!session.completedAt
  const questions      = session.questions ?? []
  const answered       = questions.filter(q => q.answer).length
  const aiEvaluated    = questions.filter(q => q.score !== null && q.score !== undefined)
  const questionSource = session.questionSource ?? null

  return (
    <Card className="overflow-hidden p-0">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between p-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 ${
            isComplete ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {isComplete ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">{formatRole(session.role)}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant={difficultyVariant(session.difficulty)}>
                {formatDifficulty(session.difficulty)}
              </Badge>
              {questionSource === 'ai' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                  <BrainCircuit size={9} /> AI
                </span>
              ) : questionSource === 'fallback' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                  <Database size={9} /> Bank
                </span>
              ) : null}
              <span className="text-xs text-slate-400">{formatDate(session.startedAt)}</span>
              {isComplete && session.completedAt && (
                <span className="text-xs text-slate-400">
                  · {formatDuration(session.startedAt, session.completedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isComplete ? (
            <>
              <span className="text-lg font-bold text-brand-600">{session.score ?? 0}%</span>
              <Link to={`/interview/${session.id}/results`}>
                <Button size="sm" variant="secondary">
                  <Star size={13} />
                  Results
                </Button>
              </Link>
            </>
          ) : (
            <Link to={`/interview/${session.id}`}>
              <Button size="sm">Continue</Button>
            </Link>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* ── Expanded Q&A with AI scores ── */}
      {expanded && (
        <div className="border-t border-slate-200 divide-y divide-slate-100">
          {questions.map((q, i) => {
            const hasScore = q.score !== null && q.score !== undefined
            return (
              <div key={q.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {/* Score badge */}
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold flex-shrink-0 mt-0.5 ${
                    hasScore ? scoreColorClass(q.score) : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {hasScore ? q.score : '—'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Q{i + 1} of {questions.length}</p>
                    <p className="text-sm font-medium text-slate-800 mb-2">{q.question}</p>

                    {q.answer ? (
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 mb-2">
                        {q.answer}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic mb-2">Not answered.</p>
                    )}

                    {/* Compact strengths/weaknesses hints */}
                    {hasScore && (
                      <div className="flex flex-wrap gap-3 mt-1">
                        {q.strengths?.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <ThumbsUp size={10} />
                            {q.strengths[0]}
                            {q.strengths.length > 1 && <span className="text-slate-400">+{q.strengths.length - 1}</span>}
                          </span>
                        )}
                        {q.weaknesses?.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <ThumbsDown size={10} />
                            {q.weaknesses[0]}
                            {q.weaknesses.length > 1 && <span className="text-slate-400">+{q.weaknesses.length - 1}</span>}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span>{answered} / {questions.length} answered</span>
              {aiEvaluated.length > 0 && (
                <span className="flex items-center gap-1 text-brand-600">
                  <BrainCircuit size={10} />
                  {aiEvaluated.length} AI-evaluated
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isComplete && (
                <>
                  <span>Score: <strong className="text-brand-600">{session.score ?? 0}%</strong></span>
                  <Link
                    to={`/interview/${session.id}/results`}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    Full results →
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
