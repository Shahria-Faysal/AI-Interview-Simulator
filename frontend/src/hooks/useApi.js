/**
 * hooks/useApi.js
 * TanStack Query hooks for all API interactions.
 * Keeps data-fetching logic out of page components.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  me:       ['me'],
  resumes:  ['resumes'],
  sessions: ['sessions'],
  session:  (id) => ['session', id],
  questions:(id) => ['questions', id],
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const useRegister = () => {
  return useMutation({
    mutationFn: (data) => api.post('/auth/register', data).then(r => r.data),
  })
}

export const useLogin = () => {
  return useMutation({
    mutationFn: (data) => api.post('/auth/login', data).then(r => r.data),
  })
}

export const useMe = (enabled = true) => {
  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: () => api.get('/auth/me').then(r => r.data.data.user),
    enabled,
  })
}

// ─── Resumes ─────────────────────────────────────────────────────────────────

export const useResumes = () => {
  return useQuery({
    queryKey: QUERY_KEYS.resumes,
    queryFn: () => api.get('/resumes').then(r => r.data.data.resumes),
  })
}

export const useUploadResume = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData) =>
      api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.resumes }),
  })
}

export const useDeleteResume = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/resumes/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.resumes }),
  })
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export const useSessions = () => {
  return useQuery({
    queryKey: QUERY_KEYS.sessions,
    queryFn: () => api.get('/sessions').then(r => r.data.data.sessions),
  })
}

export const useSession = (id) => {
  return useQuery({
    queryKey: QUERY_KEYS.session(id),
    queryFn: () => api.get(`/sessions/${id}`).then(r => r.data.data.session),
    enabled: !!id,
  })
}

export const useCreateSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/sessions', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.sessions }),
  })
}

export const useCompleteSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.patch(`/sessions/${id}/complete`).then(r => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.sessions })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.session(id) })
    },
  })
}

// ─── Questions ───────────────────────────────────────────────────────────────

export const useSubmitAnswer = () => {
  const qc = useQueryClient()
  return useMutation({
    // Returns the full response including evaluation data
    mutationFn: ({ questionId, answer }) =>
      api.patch(`/questions/${questionId}/answer`, { answer }).then(r => r.data),
    onSuccess: (data, { sessionId }) => {
      // Invalidate session cache so question list reflects saved answer + scores
      if (sessionId) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.session(sessionId) })
      }
    },
  })
}
