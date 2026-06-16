/**
 * InterviewResultsPage.jsx
 * Full results breakdown for a completed interview session.
 *
 * Displays:
 *  - Overall score and session analytics (avg, highest, lowest AI scores)
 *  - Question-by-question breakdown with AI evaluation panels
 *  - Strengths, weaknesses, suggestions, and ideal answers per question
 *  - Session metadata (role, difficulty, duration, question source)
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Trophy, BrainCircuit, Database, ThumbsUp, ThumbsDown,
  Lightbulb, BookOpen, ChevronDown, ChevronUp, Plus,
  BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle2,
  ArrowLeft, Star
} from 'lucide-react'
import { useSession } from '../hooks/useApi'
import { PageLoader, Card, Badge, Button, ErrorAlert, PageHeader } from '../components/ui'
import {
  formatRole, formatDifficulty, difficultyVariant,
  formatDate, formatDuration, formatScore, scoreColorClass, scoreLabel
} from '../utils/format'

// ─── Score ring component ─────────────────────────────────────────────────────
// SVG circular progress ring — visually conveys the overall score at a glance.

function ScoreRing({ score, size = 120 }) {
  const isNA   = score === null || score === undefined
  // Session score is already 0-100; AI scores come as 1-10 scaled to 0-100
  const pct    = isNA ? 0 : Math.min(100, Math.max(0, score))
  const radius = (size - 16) / 2
  const circ   = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ

  const color = pct >= 80 ? '#16a34a'
    : pct >= 60 ? '#d97706'
    : pct >= 40 ? '#ea580c'
    : '#dc2626'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e2e8f0" strokeWidth={8}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={isNA ? circ : offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-slate-900">{isNA ? '—' : `${pct}%`}</p>
        <p className="text-xs text-slate-500 mt-0.5">score</p>
      </div>
    </div>
  )
}

// ─── Per-question score badge ─────────────────────────────────────────────────

function QuestionScoreBadge({ score }) {
  const color = scoreColorClass(score)
  return (
    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 flex-shrink-0 font-bold text-sm ${color}`}>
      {score !== null && score !== undefined ? score : '—'}
    </div>
  )
}

// ─── Single question result card ──────────────────────────────────────────────

function QuestionResultCard({ question, index, total, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasEval = question.score !== null && question.score !== undefined
  const hasAnswer = !!question.answer

  return (
    <Card className="overflow-hidden p-0">
      {/* Header */}
      <button
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <QuestionScoreBadge score={question.score} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Q{index + 1} of {total}
            </span>
            {hasEval && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${scoreColorClass(question.score)}`}>
                {scoreLabel(question.score)}
              </span>
            )}
            {!hasAnswer && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                Not answered
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">
            {question.question}
          </p>
        </div>

        <div className="flex-shrink-0 text-slate-400 mt-1">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-slate-200 divide-y divide-slate-100">
          {/* User's answer */}
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Your Answer
            </p>
            {hasAnswer ? (
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200 leading-relaxed">
                {question.answer}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">No answer submitted.</p>
            )}
          </div>

          {/* AI evaluation */}
          {hasEval ? (
            <div className="p-4 space-y-4">
              {/* Strengths */}
              {question.strengths?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ThumbsUp size={13} className="text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Strengths
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {question.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {question.weaknesses?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ThumbsDown size={13} className="text-red-500" />
                    <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                      Weaknesses
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {question.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {question.suggestions?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb size={13} className="text-amber-500" />
                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                      Improvement Suggestions
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {question.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ideal answer */}
              {question.idealAnswer && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen size={13} className="text-brand-600" />
                    <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                      Ideal Answer
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 bg-brand-50 rounded-lg p-3 border border-brand-100 leading-relaxed">
                    {question.idealAnswer}
                  </p>
                </div>
              )}
            </div>
          ) : hasAnswer ? (
            <div className="p-4">
              <p className="text-sm text-slate-400 italic flex items-center gap-2">
                <BrainCircuit size={14} className="text-slate-300" />
                AI evaluation not available for this answer.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}

// ─── Analytics summary bar ────────────────────────────────────────────────────

function AnalyticsStat({ icon: Icon, label, value, sub, colorClass = 'text-slate-700' }) {
  return (
    <div className="flex flex-col items-center text-center p-4">
      <Icon size={18} className="text-slate-400 mb-1" />
      <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InterviewResultsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: session, isLoading, error } = useSession(id)

  if (isLoading) return <PageLoader />
  if (error || !session) return <ErrorAlert message="Session not found or you don't have access." />

  // Redirect to interview page if not yet completed
  if (!session.completedAt) {
    return (
      <div className="animate-fade-in max-w-2xl">
        <ErrorAlert message="This interview hasn't been completed yet." />
        <div className="mt-4">
          <Button onClick={() => navigate(`/interview/${id}`)}>
            Continue interview
          </Button>
        </div>
      </div>
    )
  }

  const questions      = session.questions ?? []
  const questionSource = session.questionSource ?? null

  // ── Analytics ─────────────────────────────────────────────────────────────
  const answered     = questions.filter(q => q.answer)
  const aiEvaluated  = questions.filter(q => q.score !== null && q.score !== undefined)
  const scores       = aiEvaluated.map(q => q.score)

  const avgScore     = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null

  const highestQ     = aiEvaluated.length > 0
    ? aiEvaluated.reduce((a, b) => (a.score >= b.score ? a : b))
    : null

  const lowestQ      = aiEvaluated.length > 0
    ? aiEvaluated.reduce((a, b) => (a.score <= b.score ? a : b))
    : null

  // Score displayed on the ring is the session's stored score (0–100)
  const sessionScore = session.score ?? 0

  return (
    <div className="animate-fade-in max-w-3xl">
      {/* ── Back link ── */}
      <button
        onClick={() => navigate('/history')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to history
      </button>

      {/* ── Session title ── */}
      <PageHeader
        title="Interview Results"
        description={`${formatRole(session.role)} · ${formatDate(session.startedAt)}`}
        action={
          <Link to="/interview/new">
            <Button size="sm">
              <Plus size={14} />
              New interview
            </Button>
          </Link>
        }
      />

      {/* ── Hero score card ── */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-2">
          <ScoreRing score={sessionScore} size={130} />

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {sessionScore >= 80 ? '🎉 Excellent performance!' :
               sessionScore >= 60 ? '👍 Good effort!' :
               sessionScore >= 40 ? '📚 Keep practising' :
               '💪 Room to grow'}
            </h2>
            <p className="text-sm text-slate-500 mb-3">
              {answered.length} of {questions.length} questions answered
              {aiEvaluated.length > 0 && ` · ${aiEvaluated.length} AI-evaluated`}
            </p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <Badge variant={difficultyVariant(session.difficulty)}>
                {formatDifficulty(session.difficulty)}
              </Badge>
              <Badge variant="brand">{formatRole(session.role)}</Badge>
              {questionSource === 'ai' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                  <BrainCircuit size={10} /> AI questions
                </span>
              )}
              {session.completedAt && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  <Clock size={10} />
                  {formatDuration(session.startedAt, session.completedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Analytics strip */}
        {aiEvaluated.length > 0 && (
          <div className="border-t border-slate-200 mt-4 grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200">
            <AnalyticsStat
              icon={BarChart3}
              label="Avg AI Score"
              value={avgScore !== null ? `${avgScore}/10` : '—'}
              colorClass="text-brand-600"
            />
            <AnalyticsStat
              icon={TrendingUp}
              label="Highest"
              value={highestQ ? `${highestQ.score}/10` : '—'}
              sub={highestQ ? `Q${questions.indexOf(highestQ) + 1}` : undefined}
              colorClass="text-green-600"
            />
            <AnalyticsStat
              icon={TrendingDown}
              label="Lowest"
              value={lowestQ ? `${lowestQ.score}/10` : '—'}
              sub={lowestQ ? `Q${questions.indexOf(lowestQ) + 1}` : undefined}
              colorClass="text-red-500"
            />
            <AnalyticsStat
              icon={CheckCircle2}
              label="Evaluated"
              value={`${aiEvaluated.length}/${questions.length}`}
              colorClass="text-slate-700"
            />
          </div>
        )}
      </Card>

      {/* ── Score distribution bar ── */}
      {aiEvaluated.length > 0 && (
        <Card className="mb-6 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Score Distribution
          </p>
          <div className="flex items-end gap-1.5 h-16">
            {questions.map((q, i) => {
              const s     = q.score
              const pct   = s !== null && s !== undefined ? (s / 10) * 100 : 0
              const color = s === null || s === undefined ? 'bg-slate-200'
                : s >= 8 ? 'bg-green-500'
                : s >= 6 ? 'bg-amber-400'
                : s >= 4 ? 'bg-orange-400'
                : 'bg-red-400'
              return (
                <div
                  key={q.id}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={s !== null && s !== undefined ? `Q${i+1}: ${s}/10` : `Q${i+1}: not evaluated`}
                >
                  <div className={`w-full rounded-t-sm ${color} transition-all`} style={{ height: `${Math.max(4, pct)}%` }} />
                  <span className="text-xs text-slate-400">{i + 1}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> 8–10 Great</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> 6–7 Good</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" /> 4–5 Average</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> 1–3 Poor</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-200 inline-block" /> Not evaluated</span>
          </div>
        </Card>
      )}

      {/* ── Per-question breakdown ── */}
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Question Breakdown
        </h2>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionResultCard
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              defaultOpen={questions.length <= 3}
            />
          ))}
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex gap-3 mt-8 flex-wrap">
        <Button onClick={() => navigate('/interview/new')} className="flex-1">
          <Plus size={14} />
          Start new interview
        </Button>
        <Button variant="secondary" onClick={() => navigate('/history')} className="flex-1">
          <Star size={14} />
          View all history
        </Button>
      </div>
    </div>
  )
}
