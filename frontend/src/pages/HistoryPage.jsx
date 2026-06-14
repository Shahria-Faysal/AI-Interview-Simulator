import { useState } from 'react'
import { Link } from 'react-router-dom'
import { History, ChevronDown, ChevronUp, Plus, CheckCircle2, Clock, BrainCircuit, Database } from 'lucide-react'
import { useSessions } from '../hooks/useApi'
import {
  PageHeader, Card, Badge, Button, PageLoader, EmptyState
} from '../components/ui'
import { formatRole, formatDifficulty, difficultyVariant, formatDate, formatDuration } from '../utils/format'

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
                <Button>
                  <Plus size={14} />
                  Start interview
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {/* In progress */}
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                In progress ({inProgress.length})
              </h2>
              <div className="space-y-3">
                {inProgress.map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    expanded={expandedId === s.id}
                    onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Completed ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
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
  const questionSource = session.questionSource ?? null  // "ai" | "fallback" | null

  return (
    <Card className="overflow-hidden p-0">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between p-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* Status icon */}
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
              {/* AI source pill — shows which question source was used */}
              {questionSource === 'ai' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                  <BrainCircuit size={9} />
                  AI
                </span>
              ) : questionSource === 'fallback' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                  <Database size={9} />
                  Bank
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

        <div className="flex items-center gap-3">
          {isComplete ? (
            <span className="text-lg font-bold text-brand-600">{session.score ?? 0}%</span>
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

      {/* ── Expanded Q&A panel ── */}
      {expanded && (
        <div className="border-t border-slate-200 divide-y divide-slate-100">
          {questions.map((q, i) => (
            <div key={q.id} className="px-4 py-3">
              <p className="text-xs font-semibold text-slate-400 mb-1">
                Q{i + 1} of {questions.length}
              </p>
              <p className="text-sm font-medium text-slate-800 mb-2">{q.question}</p>
              {q.answer ? (
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {q.answer}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">Not answered.</p>
              )}
            </div>
          ))}

          {/* Footer summary row */}
          <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <span>{answered} / {questions.length} questions answered</span>
            <div className="flex items-center gap-3">
              {questionSource && (
                <span className="flex items-center gap-1">
                  {questionSource === 'ai'
                    ? <><BrainCircuit size={10} className="text-brand-500" /> AI-generated</>
                    : <><Database size={10} /> Question bank</>
                  }
                </span>
              )}
              {isComplete && (
                <span>Score: <strong className="text-brand-600">{session.score ?? 0}%</strong></span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
