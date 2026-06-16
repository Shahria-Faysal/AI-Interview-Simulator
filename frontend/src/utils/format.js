/**
 * utils/format.js
 * Shared display-formatting helpers.
 */

export const formatRole = (role) => {
  const map = {
    FRONTEND_DEVELOPER:  'Frontend Developer',
    BACKEND_DEVELOPER:   'Backend Developer',
    FULL_STACK_DEVELOPER:'Full Stack Developer',
    DATA_ANALYST:        'Data Analyst',
  }
  return map[role] ?? role
}

export const formatDifficulty = (d) => {
  const map = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }
  return map[d] ?? d
}

/** Maps difficulty to a Badge variant */
export const difficultyVariant = (d) => {
  const map = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' }
  return map[d] ?? 'default'
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const formatDuration = (start, end) => {
  if (!start || !end) return ''
  const ms   = new Date(end) - new Date(start)
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

/**
 * Formats a 1–10 AI score as a display string.
 * Returns '—' when score is null/undefined (not yet evaluated).
 */
export const formatScore = (score) => {
  if (score === null || score === undefined) return '—'
  return `${score}/10`
}

/**
 * Returns a Tailwind colour class set for a given 1–10 score.
 * Used consistently across ScoreBadge, history cards, and results page.
 */
export const scoreColorClass = (score) => {
  if (score === null || score === undefined) return 'bg-slate-100 text-slate-500 border-slate-200'
  if (score >= 8) return 'bg-green-100 text-green-700 border-green-200'
  if (score >= 6) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (score >= 4) return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

/**
 * Returns a plain text label for a 1–10 score band.
 */
export const scoreLabel = (score) => {
  if (score === null || score === undefined) return 'Not evaluated'
  if (score >= 9) return 'Excellent'
  if (score >= 8) return 'Good'
  if (score >= 6) return 'Average'
  if (score >= 4) return 'Below average'
  return 'Poor'
}
