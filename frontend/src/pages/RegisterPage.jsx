import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrainCircuit } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRegister } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { Button, Input, ErrorAlert } from '../components/ui'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { mutateAsync: register, isPending } = useRegister()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors(er => ({ ...er, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.'
    if (!form.password) errs.password = 'Password is required.'
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters.'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    try {
      const res = await register(form)
      login(res.data.user, res.data.token)
      toast.success(`Welcome, ${res.data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.'
      setServerError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600 text-white">
            <BrainCircuit size={22} />
          </div>
          <span className="text-xl font-bold text-slate-900">InterviewAI</span>
        </Link>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 mb-6">Start practicing for your next interview.</p>

          <ErrorAlert message={serverError} />

          <form onSubmit={handleSubmit} className="space-y-4 mt-4" noValidate>
            <Input
              label="Full name"
              type="text"
              name="name"
              placeholder="Fardin Ahmed"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              autoComplete="name"
              autoFocus
            />
            <Input
              label="Email address"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="new-password"
            />

            <Button type="submit" loading={isPending} className="w-full mt-2">
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
