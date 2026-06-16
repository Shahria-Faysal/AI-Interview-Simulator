import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, ChevronLeft, ChevronRight, Send, Trophy,
  BrainCircuit, Database, ThumbsUp, ThumbsDown, Lightbulb,
  BookOpen, Loader2, AlertCircle, Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession, useSubmitAnswer, useCompleteSession } from '../hooks/useApi'
import { PageLoader, Card, Button, Badge, ErrorAlert } from '../components/ui'
import { formatRole, formatDifficulty, difficultyVariant } from '../utils/format'

// ─── Sub-components ───────────────────────────────────────────────────────────

function AISourcePill({ source }) {
  if (!source) return null
  const isAI = source === 'ai'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isAI ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
    }`}>
      {isAI ? <><BrainCircuit size={10} /> AI-generated</> : <><Database size={10} /> Question bank</>}
    </span>
  )
}

/** Circular score badge: colour shifts green→amber→red based on score */
function ScoreBadge({ score, size = 'md' }) {
  if (score === null || score === undefined) return null

  const color = score >= 8
    ? 'bg-green-100 text-green-700 border-green-200'
    : score >= 6
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : score >= 4
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-red-100 text-red-700 border-red-200'

  const dim = size === 'lg'
    ? 'w-16 h-16 text-2xl font-bold border-2'
    : 'w-10 h-10 text-sm font-bold border'

  return (
    <div className={`flex items-center justify-center rounded-full flex-shrink-0 ${dim} ${color}`}>
      {score}<span className="text-xs font-normal">/10</span>
    </div>
  )
}

/** Inline evaluation panel shown after an answer is submitted */
function EvaluationPanel({ evaluation, isLoading }) {
  if (isLoading) {
    return (
      <div className="mt-4 p-4 rounded-xl bg-brand-50 border border-brand-200 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-brand-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-brand-800">Evaluating your answer…</p>
          <p className="text-xs text-brand-600 mt-0.5">Gemini is reviewing your response</p>
        </div>
      </div>
    )
  }

  if (!evaluation) return null

  // Fallback state: Gemini was unavailable
  if (evaluation.score === null) {
    return (
      <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
        <AlertCircle size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-600">Answer saved</p>
          <p className="text-xs text-slate-500 mt-0.5">
            AI evaluation is currently unavailable. Your answer has been saved.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden animate-slide-up">
      {/* Score header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <BrainCircuit size={14} className="text-brand-600" />
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            AI Evaluation
          </span>
        </div>
        <ScoreBadge score={evaluation.score} />
      </div>

      <div className="p-4 space-y-4">
        {/* Strengths */}
        {evaluation.strengths?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ThumbsUp size={13} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Strengths</span>
            </div>
            <ul className="space-y-1">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {evaluation.weaknesses?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ThumbsDown size={13} className="text-red-500" />
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Weaknesses</span>
            </div>
            <ul className="space-y-1">
              {evaluation.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {evaluation.suggestions?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Suggestions</span>
            </div>
            <ul className="space-y-1">
              {evaluation.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ideal answer */}
        {evaluation.idealAnswer && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen size={13} className="text-brand-600" />
              <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Ideal Answer</span>
            </div>
            <p className="text-sm text-slate-700 bg-brand-50 rounded-lg p-3 border border-brand-100 leading-relaxed">
              {evaluation.idealAnswer}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main interview page ──────────────────────────────────────────────────────

export default function InterviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: session, isLoading, error } = useSession(id)
  const { mutateAsync: submitAnswer, isPending: submitting } = useSubmitAnswer()
  const { mutateAsync: complete,     isPending: completing } = useCompleteSession()

  const [currentIndex,   setCurrentIndex]   = useState(0)
  const [draftAnswer,    setDraftAnswer]     = useState('')
  // Map questionId → { evaluation, evaluating }
  const [evaluations,    setEvaluations]     = useState({})
  const [evaluating,     setEvaluating]      = useState(false)

  if (isLoading) return <PageLoader />
  if (error || !session) return <ErrorAlert message="Session not found or you don't have access." />
  if (session.completedAt) return <CompletionScreen session={session} />

  const questions      = session.questions ?? []
  const currentQ       = questions[currentIndex]
  const questionSource = session.questionSource ?? null

  if (!currentQ) return <ErrorAlert message="No questions found for this session." />

  // A question is "answered" if it has a stored answer OR was just submitted
  const isAnswered    = (qId) => !!(evaluations[qId] || questions.find(q => q.id === qId)?.answer)
  const answeredCount = questions.filter(q => isAnswered(q.id)).length

  // The evaluation for the current question (populated after submit)
  const currentEval = evaluations[currentQ.id] ?? null

  const handleSave = async () => {
    const trimmed = draftAnswer.trim()
    if (!trimmed) { toast.error('Please write an answer before saving.'); return }

    setEvaluating(true)
    try {
      const res = await submitAnswer({ questionId: currentQ.id, answer: trimmed, sessionId: id })
      const evaluation = res?.data?.evaluation ?? null
      setEvaluations(prev => ({ ...prev, [currentQ.id]: evaluation }))
      if (evaluation?.score !== null && evaluation?.score !== undefined) {
        toast.success(`Evaluated: ${evaluation.score}/10`)
      } else {
        toast.success('Answer saved.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save answer.')
    } finally {
      setEvaluating(false)
    }
  }

  const handleNavigate = (dir) => {
    const next = currentIndex + dir
    if (next < 0 || next >= questions.length) return
    setCurrentIndex(next)
    const nextQ = questions[next]
    // Pre-fill with existing answer; clear draft to show stored answer
    setDraftAnswer(nextQ.answer ?? '')
  }

  const handleFinish = async () => {
    if (answeredCount === 0) { toast.error('Answer at least one question before finishing.'); return }
    try {
      await complete(id)
      toast.success('Interview completed!')
      navigate(`/interview/${id}/results`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete session.')
    }
  }

  const currentDraft = draftAnswer !== ''
    ? draftAnswer
    : (currentQ.answer ?? '')

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* ── Session header ── */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-lg font-bold text-slate-900">{formatRole(session.role)}</span>
            <Badge variant={difficultyVariant(session.difficulty)}>
              {formatDifficulty(session.difficulty)}
            </Badge>
            <AISourcePill source={questionSource} />
          </div>
          <p className="text-sm text-slate-500">
            {answeredCount} of {questions.length} questions answered
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleFinish}
          loading={completing}
          disabled={answeredCount === 0}
        >
          <CheckCircle2 size={14} />
          Finish & see results
        </Button>
      </div>

      {/* ── Progress bar ── */}
      <div className="w-full h-2 bg-slate-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-500"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>

      {/* ── Question number pills ── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {questions.map((q, i) => {
          const eval_ = evaluations[q.id]
          const hasScore = eval_?.score !== null && eval_?.score !== undefined
          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(i)
                setDraftAnswer(q.answer ?? '')
              }}
              title={hasScore ? `Score: ${eval_.score}/10` : undefined}
              className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors relative ${
                i === currentIndex
                  ? 'bg-brand-600 text-white ring-2 ring-brand-300'
                  : isAnswered(q.id)
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* ── Question card ── */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
              Question {currentIndex + 1} of {questions.length}
            </span>
            {isAnswered(currentQ.id) && <Badge variant="success">Answered</Badge>}
          </div>
          {currentEval?.score !== null && currentEval?.score !== undefined && (
            <ScoreBadge score={currentEval.score} />
          )}
        </div>

        <p className="text-base font-medium text-slate-900 leading-relaxed mb-5">
          {currentQ.question}
        </p>

        <textarea
          value={currentDraft}
          onChange={(e) => setDraftAnswer(e.target.value)}
          placeholder="Type your answer here…"
          rows={6}
          className="input resize-none text-sm"
          disabled={evaluating}
        />

        <div className="flex items-center justify-between mt-4 gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleNavigate(-1)}
            disabled={currentIndex === 0 || evaluating}
          >
            <ChevronLeft size={15} />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} loading={evaluating || submitting}>
              <Send size={14} />
              {evaluating ? 'Evaluating…' : 'Submit answer'}
            </Button>
            {currentIndex < questions.length - 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleNavigate(1)}
                disabled={evaluating}
              >
                Next
                <ChevronRight size={15} />
              </Button>
            )}
          </div>
        </div>

        {/* Inline evaluation panel */}
        <EvaluationPanel evaluation={currentEval} isLoading={evaluating} />
      </Card>

      <p className="text-xs text-slate-400 text-center">
        Submit each answer to receive AI feedback. Navigate freely between questions.
      </p>
    </div>
  )
}

// ─── Quick completion redirect screen ────────────────────────────────────────
// Only shown when session.completedAt is already set on page load
// (e.g. user navigates back to a finished session URL).

function CompletionScreen({ session }) {
  const navigate = useNavigate()
  return (
    <div className="animate-fade-in max-w-2xl text-center py-16">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-100 text-brand-600 mx-auto mb-4">
        <Trophy size={30} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Session complete</h1>
      <p className="text-slate-500 text-sm mb-6">This interview has already been finished.</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Button onClick={() => navigate(`/interview/${session.id}/results`)}>
          <Star size={14} />
          View results
        </Button>
        <Button variant="secondary" onClick={() => navigate('/interview/new')}>
          New interview
        </Button>
      </div>
    </div>
  )
}
