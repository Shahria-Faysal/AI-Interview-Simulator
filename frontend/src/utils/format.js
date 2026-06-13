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
