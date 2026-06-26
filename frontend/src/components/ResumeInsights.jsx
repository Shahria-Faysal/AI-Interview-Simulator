/**
 * components/ResumeInsights.jsx
 * Displays AI-extracted resume analysis: skills, projects, experience level, domains.
 * Handles all analysis states: pending / processing / done / failed.
 *
 * Usage:
 *   <ResumeInsights resumeId="clxxx..." compact={false} />
 *
 * Props:
 *   resumeId  string   — ID of the resume to fetch insights for
 *   compact   boolean  — if true, shows a condensed version for the dashboard card
 */

import { Sparkles, Cpu, FolderGit2, TrendingUp, Globe, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useResumeInsights } from '../hooks/useApi'

// ─── Experience level badge colours ─────────────────────────────────────────

const LEVEL_STYLES = {
  Junior:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Mid-level': 'bg-blue-100 text-blue-700 border-blue-200',
  Senior:    'bg-purple-100 text-purple-700 border-purple-200',
  Unknown:   'bg-slate-100 text-slate-500 border-slate-200',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon size={13} className="text-slate-400 flex-shrink-0" />
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {children}
      </span>
    </div>
  )
}

function SkillPill({ label }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
      {label}
    </span>
  )
}

function StatusBadge({ status }) {
  if (status === 'processing' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-medium">
        <Loader2 size={12} className="animate-spin" />
        Analyzing resume…
      </span>
    )
  }
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
        <CheckCircle2 size={12} />
        Analysis complete
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-500 font-medium">
        <AlertCircle size={12} />
        Analysis failed
      </span>
    )
  }
  return null
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function InsightsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-2 flex-wrap">
        {[80, 60, 90, 70, 55].map((w, i) => (
          <div key={i} className="h-5 bg-slate-200 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="h-3 bg-slate-200 rounded w-2/3" />
      <div className="h-3 bg-slate-200 rounded w-1/2" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResumeInsights({ resumeId, compact = false }) {
  const { data: insights, isLoading, isError } = useResumeInsights(resumeId)

  if (!resumeId) return null

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-brand-500" />
          <span className="text-sm font-semibold text-slate-700">Resume Insights</span>
        </div>
        <InsightsSkeleton />
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="p-4 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm flex items-center gap-2">
        <AlertCircle size={15} />
        Could not load resume insights.
      </div>
    )
  }

  const { analysisStatus, skills = [], projects = [], experienceLevel, domains = [] } = insights ?? {}

  // ── Processing / pending state ──────────────────────────────────────────────
  if (analysisStatus === 'pending' || analysisStatus === 'processing') {
    return (
      <div className="p-4 rounded-xl border border-amber-100 bg-amber-50">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-amber-500" />
          <span className="text-sm font-semibold text-slate-700">Resume Insights</span>
          <StatusBadge status={analysisStatus} />
        </div>
        <InsightsSkeleton />
        <p className="text-xs text-slate-400 mt-3">
          Gemini is analyzing your resume. This takes a few seconds…
        </p>
      </div>
    )
  }

  // ── Failed state ────────────────────────────────────────────────────────────
  if (analysisStatus === 'failed') {
    return (
      <div className="p-4 rounded-xl border border-red-100 bg-red-50">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={15} className="text-red-400" />
          <span className="text-sm font-semibold text-slate-700">Resume Insights</span>
        </div>
        <p className="text-xs text-red-500">
          Could not analyze this resume. It may be image-only or corrupted. Interviews will use generic questions.
        </p>
      </div>
    )
  }

  // ── No data ─────────────────────────────────────────────────────────────────
  const hasData = skills.length > 0 || projects.length > 0 || domains.length > 0
  if (!hasData) return null

  // ── Done — show insights ────────────────────────────────────────────────────

  if (compact) {
    // Compact mode for dashboard card — just skills + experience level
    return (
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
            <Sparkles size={11} />
            AI Insights
          </span>
          {experienceLevel && experienceLevel !== 'Unknown' && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${LEVEL_STYLES[experienceLevel] ?? LEVEL_STYLES.Unknown}`}>
              {experienceLevel}
            </span>
          )}
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 6).map((s) => (
              <SkillPill key={s} label={s} />
            ))}
            {skills.length > 6 && (
              <span className="text-xs text-slate-400 self-center">+{skills.length - 6} more</span>
            )}
          </div>
        )}
      </div>
    )
  }

  // Full mode
  return (
    <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/60 to-white p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-100 text-brand-600">
            <Sparkles size={14} />
          </div>
          <span className="font-semibold text-slate-800 text-sm">Resume Insights</span>
          <StatusBadge status={analysisStatus} />
        </div>
        {experienceLevel && experienceLevel !== 'Unknown' && (
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${LEVEL_STYLES[experienceLevel] ?? LEVEL_STYLES.Unknown}`}>
            {experienceLevel}
          </span>
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div>
          <SectionTitle icon={Cpu}>Technologies & Skills</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <SkillPill key={s} label={s} />
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div>
          <SectionTitle icon={FolderGit2}>Detected Projects</SectionTitle>
          <ul className="space-y-1">
            {projects.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Domains */}
      {domains.length > 0 && (
        <div>
          <SectionTitle icon={Globe}>Domains</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {domains.map((d) => (
              <span
                key={d}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Personalization notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-50 border border-brand-100">
        <TrendingUp size={14} className="text-brand-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-brand-700">
          Your next interview will be <strong>personalized</strong> based on these skills and projects.
        </p>
      </div>
    </div>
  )
}
