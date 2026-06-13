import { Link } from 'react-router-dom'
import { BrainCircuit, CheckCircle2, Zap, BarChart3, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Role-based questions',
    desc: 'Tailored question banks for Frontend, Backend, Full Stack, and Data Analyst roles.',
  },
  {
    icon: BarChart3,
    title: 'Track your progress',
    desc: 'Review past sessions, see your scores, and identify areas to improve.',
  },
  {
    icon: CheckCircle2,
    title: 'Three difficulty levels',
    desc: 'Start easy, work your way up to Hard — challenge yourself at your own pace.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-600">
            <BrainCircuit size={20} />
          </div>
          <span className="font-semibold text-lg">InterviewAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"    className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-900/60 border border-brand-700/50 text-brand-300 text-xs font-medium mb-8">
          <Zap size={12} />
          Phase 1 — Now live
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
          Ace your next<br />
          <span className="text-brand-400">developer interview</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10">
          Practice with role-specific questions, track your sessions, and build the confidence
          to walk into any technical interview prepared.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors text-sm"
          >
            Start practicing free
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors text-sm"
          >
            Sign in
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-900/80 text-brand-400 mb-4">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-600">
        &copy; {new Date().getFullYear()} InterviewAI — Phase 1 MVP
      </footer>
    </div>
  )
}
