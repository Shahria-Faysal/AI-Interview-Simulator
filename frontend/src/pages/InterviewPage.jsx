import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Send, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession, useSubmitAnswer, useCompleteSession } from '../hooks/useApi'
import {
  PageLoader, Card, Button, Badge, ErrorAlert
} from '../components/ui'
import { formatRole, formatDifficulty, difficultyVariant } from '../utils/format'

export default function InterviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: session, isLoading, error } = useSession(id)
  const { mutateAsync: submitAnswer, isPending: submitting } = useSubmitAnswer()
  const { mutateAsync: complete, isPending: completing } = useCompleteSession()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftAnswer, setDraftAnswer] = useState('')
  const [savedAnswers, setSavedAnswers] = useState({}) // questionId → saved text

  if (isLoading) return <PageLoader />
  if (error || !session) {
    return <ErrorAlert message="Session not found or you don't have access." />
  }

  // Show completion screen if already completed
  if (session.completedAt) {
    return <CompletionScreen session={session} />
  }

  const questions = session.questions ?? []
  const currentQ  = questions[currentIndex]
  if (!currentQ) return <ErrorAlert message="No questions found for this session." />

  const isAnswered   = (qId) => !!(savedAnswers[qId] ?? questions.find(q => q.id === qId)?.answer)
  const answeredCount = questions.filter(q => isAnswered(q.id)).length

  const handleSave = async () => {
    if (!draftAnswer.trim()) { toast.error('Please write an answer before saving.'); return }
    try {
      await submitAnswer({ questionId: currentQ.id, answer: draftAnswer, sessionId: id })
      setSavedAnswers(prev => ({ ...prev, [currentQ.id]: draftAnswer }))
      toast.success('Answer saved.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save answer.')
    }
  }

  const handleNavigate = (dir) => {
    const next = currentIndex + dir
    if (next < 0 || next >= questions.length) return
    setCurrentIndex(next)
    // Pre-fill textarea with existing answer for new question
    const nextQ = questions[next]
    setDraftAnswer(savedAnswers[nextQ.id] ?? nextQ.answer ?? '')
  }

  const handleFinish = async () => {
    if (answeredCount === 0) { toast.error('Answer at least one question before finishing.'); return }
    try {
      await complete(id)
      toast.success('Interview completed!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete session.')
    }
  }

  // Pre-fill on first render of a question
  const currentDraft = draftAnswer !== undefined
    ? draftAnswer
    : (savedAnswers[currentQ.id] ?? currentQ.answer ?? '')

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-slate-900">{formatRole(session.role)}</span>
            <Badge variant={difficultyVariant(session.difficulty)}>
              {formatDifficulty(session.difficulty)}
            </Badge>
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
          Finish interview
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-500"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>

      {/* Question pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => {
              setCurrentIndex(i)
              setDraftAnswer(savedAnswers[q.id] ?? q.answer ?? '')
            }}
            className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
              i === currentIndex
                ? 'bg-brand-600 text-white'
                : isAnswered(q.id)
                ? 'bg-green-500 text-white'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
            Question {currentIndex + 1}
          </span>
          {isAnswered(currentQ.id) && (
            <Badge variant="success">Answered</Badge>
          )}
        </div>
        <p className="text-base font-medium text-slate-900 leading-relaxed mb-5">
          {currentQ.question}
        </p>

        <textarea
          value={draftAnswer !== '' ? draftAnswer : (savedAnswers[currentQ.id] ?? currentQ.answer ?? '')}
          onChange={(e) => setDraftAnswer(e.target.value)}
          placeholder="Type your answer here…"
          rows={6}
          className="input resize-none text-sm"
        />

        <div className="flex items-center justify-between mt-4 gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleNavigate(-1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={15} />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              loading={submitting}
            >
              <Send size={14} />
              Save answer
            </Button>
            {currentIndex < questions.length - 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleNavigate(1)}
              >
                Next
                <ChevronRight size={15} />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <p className="text-xs text-slate-400 text-center">
        Answers are saved individually. Navigate freely between questions.
      </p>
    </div>
  )
}

function CompletionScreen({ session }) {
  const navigate = useNavigate()
  const questions = session.questions ?? []
  const answered  = questions.filter(q => q.answer)

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-100 text-brand-600 mx-auto mb-4">
          <Trophy size={30} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Interview complete!</h1>
        <p className="text-slate-500 text-sm">Here's a summary of your session.</p>
      </div>

      <Card className="mb-6 text-center">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Final score</p>
        <p className="text-5xl font-bold text-brand-600">{session.score ?? 0}%</p>
        <p className="text-sm text-slate-500 mt-2">
          {answered.length} of {questions.length} questions answered
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge variant={difficultyVariant(session.difficulty)}>{formatDifficulty(session.difficulty)}</Badge>
          <Badge variant="brand">{formatRole(session.role)}</Badge>
        </div>
      </Card>

      <div className="space-y-3 mb-6">
        {questions.map((q, i) => (
          <Card key={q.id} className="p-4">
            <p className="text-xs font-semibold text-slate-400 mb-1">Q{i + 1}</p>
            <p className="text-sm font-medium text-slate-800 mb-2">{q.question}</p>
            {q.answer ? (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
                {q.answer}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">Not answered.</p>
            )}
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => navigate('/interview/new')} className="flex-1">
          Start new interview
        </Button>
        <Button variant="secondary" onClick={() => navigate('/history')} className="flex-1">
          View history
        </Button>
      </div>
    </div>
  )
}
